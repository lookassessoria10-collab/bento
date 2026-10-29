"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { safeFileName, validateUpload } from "@/lib/text";
import { CHANNELS, multi, optDate, optText, optUrl, optUuid, reqText, uuid } from "@/lib/validation";

const FILE_KINDS = [
  "foto",
  "relatorio",
  "planilha",
  "protocolo",
  "mapa",
  "documento_institucional",
  "autorizacao",
  "material_editorial",
  "pdf_boletim",
  "dossie",
  "referencia_externa",
] as const;

const metaSchema = z.object({
  nome_amigavel: reqText(1, 200, "Informe um nome amigável."),
  nome_sugerido: optText(200),
  tipo: z.enum(FILE_KINDS),
  autoria: optText(300),
  origem: optText(300),
  data_arquivo: optDate,
  legenda: optText(1000),
  licenca: optText(300),
  autorizacao_uso: z.enum(["nao_autorizado", "uso_interno", "divulgacao_autorizada"]),
  autorizacao_canais: multi(CHANNELS),
  experiment_id: optUuid,
  visit_record_id: optUuid,
  result_id: optUuid,
  editorial_item_id: optUuid,
});

function checkPhoto(d: z.infer<typeof metaSchema>) {
  if (d.tipo === "foto" && (!d.legenda || !d.autoria || !d.data_arquivo)) {
    throw new UserError("Fotografias exigem legenda, autoria e data.");
  }
  if (d.autorizacao_canais.some((c) => c !== "interno") && d.autorizacao_uso !== "divulgacao_autorizada") {
    throw new UserError("Canais externos exigem 'Divulgação autorizada'.");
  }
}

/** Registra metadados após o envio direto ao Storage privado (o caminho é validado aqui). */
export async function registerUploadedFile(input: {
  meta: Record<string, unknown>;
  storage_path: string;
  nome_original: string;
  mime_type: string;
  tamanho_bytes: number;
  previous_version_id?: string | null;
  motivo_substituicao?: string | null;
}): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const meta = metaSchema.parse(input.meta);
    checkPhoto(meta);
    const limit = ctx.settings?.limite_upload_mb ?? 25;
    const err = validateUpload(input.nome_original, input.mime_type, input.tamanho_bytes, limit);
    if (err) throw new UserError(err);
    const expectedPrefix = `${ctx.orgId}/arquivos/`;
    const rest = input.storage_path.slice(expectedPrefix.length);
    if (!input.storage_path.startsWith(expectedPrefix) || !/^[0-9a-f-]{36}-[a-z0-9.-]+$/.test(rest) || rest.includes("..")) {
      throw new UserError("Caminho de arquivo inválido.");
    }
    let versao = 1;
    const prev = input.previous_version_id ? uuid.parse(input.previous_version_id) : null;
    if (prev) {
      const old = assertOk(await ctx.supabase.from("files").select("versao").eq("id", prev).single());
      versao = old.versao + 1;
      if (!input.motivo_substituicao?.trim()) throw new UserError("Informe o motivo da substituição.");
    }
    const row = assertOk(
      await ctx.supabase
        .from("files")
        .insert({
          ...meta,
          organization_id: ctx.orgId,
          storage_path: input.storage_path,
          nome_original: input.nome_original.slice(0, 300),
          mime_type: input.mime_type,
          tamanho_bytes: input.tamanho_bytes,
          previous_version_id: prev,
          versao,
          motivo_substituicao: prev ? input.motivo_substituicao!.trim().slice(0, 1000) : null,
        })
        .select("id")
        .single(),
    );
    if (prev) {
      // original preservado; apenas marcado como substituído
      await ctx.supabase.from("files").update({ substituido_por: row.id }).eq("id", prev);
    }
    revalidatePath("/app/biblioteca");
    return { ok: true, message: "Arquivo registrado.", redirectTo: `/app/biblioteca/${row.id}` };
  });
}

export async function registerExternalLink(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const meta = metaSchema.parse(formToObject(fd));
    checkPhoto(meta);
    const external_url = optUrl.parse(fd.get("external_url"));
    if (!external_url) throw new UserError("Informe o link.");
    assertOk(await ctx.supabase.from("files").insert({ ...meta, organization_id: ctx.orgId, external_url }));
    revalidatePath("/app/biblioteca");
  }, "Link externo registrado (o link não confere permissão pública).");
}

export async function updateFileMeta(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const meta = metaSchema.parse(formToObject(fd));
    checkPhoto(meta);
    const res = await ctx.supabase.from("files").update(meta).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para editar este arquivo.");
    revalidatePath(`/app/biblioteca/${id}`);
  }, "Metadados atualizados.");
}

export async function softDeleteFile(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const res = await ctx.supabase.from("files").update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para excluir este arquivo.");
    revalidatePath("/app/biblioteca");
    return { ok: true, message: "Arquivo removido da biblioteca (exclusão lógica; original preservado).", redirectTo: "/app/biblioteca" };
  });
}

export async function uploadPathFor(originalName: string): Promise<{ ok: boolean; path?: string; message?: string }> {
  const ctx = await requireContext();
  const id = crypto.randomUUID();
  return { ok: true, path: `${ctx.orgId}/arquivos/${id}-${safeFileName(originalName)}` };
}
