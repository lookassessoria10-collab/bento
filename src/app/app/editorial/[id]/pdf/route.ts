import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getContext, has } from "@/lib/auth";
import { sha256 } from "@/lib/tokens";
import type { SnapFile, SnapshotContent } from "@/lib/snapshot";
import { BulletinPdf, DossierPdf, GenericContentPdf } from "@/lib/pdf/documents";
import { errorResponse, pdfResponse } from "@/lib/pdf/respond";
import type { DocMeta } from "@/lib/pdf/components";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: RouteContext<"/app/editorial/[id]/pdf">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const sp = req.nextUrl.searchParams;

  // download de PDF já armazenado (verificado pela RLS de generated_documents + storage)
  const docId = sp.get("documento");
  if (docId) {
    const { data: doc } = await ctx.supabase.from("generated_documents").select("storage_path, item_id").eq("id", docId).eq("item_id", id).maybeSingle();
    if (!doc) return errorResponse("Documento não encontrado ou sem acesso.", 404);
    const { data } = await ctx.supabase.storage.from("bento-privado").createSignedUrl(doc.storage_path, 60);
    if (!data) return errorResponse("Não foi possível gerar o link.", 403);
    return NextResponse.redirect(data.signedUrl);
  }

  const { data: item } = await ctx.supabase
    .from("editorial_items")
    .select("id, titulo, tipo, current_version_id, status, is_demo")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!item) return errorResponse("Conteúdo não encontrado ou sem acesso.", 404);

  const final = sp.get("final") === "1";
  let content: SnapshotContent;
  let identificador: string;
  let versionId: string | null = null;
  if (final) {
    if (!has(ctx, "publicacao.registrar")) return errorResponse("Sem permissão para gerar o PDF final.", 403);
    if (!item.current_version_id) return errorResponse("Não há versão fixada.", 409);
    const { data: ver } = await ctx.supabase.from("editorial_versions").select("id, numero, content, content_hash").eq("id", item.current_version_id).single();
    if (!ver) return errorResponse("Versão não encontrada.", 404);
    const { data: rel } = await ctx.supabase.from("release_permissions").select("canal").eq("version_id", ver.id).is("revogado_em", null);
    if (!rel?.length) return errorResponse("PDF final bloqueado: esta versão ainda não foi liberada na revisão final.", 403);
    content = { ...(ver.content as unknown as SnapshotContent), __hash: ver.content_hash };
    identificador = `${item.titulo} · versão ${ver.numero} aprovada`;
    versionId = ver.id;
  } else {
    // rascunho interno: versão em revisão (se houver) ou pré-visualização do rascunho atual
    const useVersion = sp.get("rascunho") !== "atual" && item.current_version_id && item.status !== "rascunho" && item.status !== "devolvido";
    if (useVersion) {
      const { data: ver } = await ctx.supabase.from("editorial_versions").select("numero, content, content_hash").eq("id", item.current_version_id!).single();
      content = { ...(ver!.content as unknown as SnapshotContent), __hash: ver!.content_hash };
      identificador = `${item.titulo} · versão ${ver!.numero} em revisão`;
    } else {
      const { data: snap, error } = await ctx.supabase.rpc("preview_snapshot", { p_item: id });
      if (error || !snap) return errorResponse("Não foi possível montar a pré-visualização.", 500);
      content = snap as unknown as SnapshotContent;
      identificador = `${item.titulo} · rascunho não versionado`;
    }
  }

  const meta: DocMeta = {
    titulo: item.titulo,
    identificador,
    geradoPor: ctx.nome,
    geradoEm: new Date().toISOString(),
    rascunho: !final,
    demo: item.is_demo || content.is_demo,
    assinatura: ctx.settings?.assinatura,
  };

  // imagens: somente arquivos do snapshot, por URL assinada de curta duração; no PDF final, apenas as autorizadas
  const images: Record<string, string> = {};
  if (content.bulletin) {
    const files: SnapFile[] = [content.bulletin.capa, ...content.bulletin.sections.flatMap((s) => s.files)].filter((f): f is SnapFile => !!f);
    for (const f of files) {
      if (!f.storage_path || !f.mime_type?.match(/^image\/(jpeg|png)$/)) continue;
      if (final && (f.autorizacao_uso !== "divulgacao_autorizada" || !f.autorizacao_canais.includes("boletim"))) continue;
      const { data } = await ctx.supabase.storage.from("bento-privado").createSignedUrl(f.storage_path, 120);
      if (data) images[f.id] = data.signedUrl;
    }
  }

  const doc =
    item.tipo === "boletim" && content.bulletin
      ? BulletinPdf({ content, meta, images })
      : item.tipo === "dossie" && content.dossier
        ? DossierPdf({ content, meta })
        : GenericContentPdf({ content, meta });
  const buf = await renderToBuffer(doc);
  const filename = `${item.tipo}-${final ? "final" : "rascunho"}.pdf`;

  if (final && versionId) {
    const path = `${ctx.orgId}/documentos/${crypto.randomUUID()}.pdf`;
    const up = await ctx.supabase.storage.from("bento-privado").upload(path, buf, { contentType: "application/pdf", upsert: false });
    if (up.error) return errorResponse("PDF gerado, mas não foi possível armazená-lo. Tente novamente.", 500);
    const tipo = item.tipo === "boletim" || item.tipo === "dossie" || item.tipo === "relatorio_piloto" ? item.tipo : "outro";
    const reg = await ctx.supabase.rpc("register_generated_document", {
      p_org: ctx.orgId,
      p_item: id,
      p_version: versionId,
      p_tipo: tipo,
      p_path: path,
      p_sha: sha256(buf),
      p_size: buf.byteLength,
      p_rascunho: false,
    });
    if (reg.error) return errorResponse(reg.error.message, 403);
  }
  return pdfResponse(buf, filename);
}
