import { NextResponse, type NextRequest } from "next/server";
import { getContext } from "@/lib/auth";
import { errorResponse } from "@/lib/pdf/respond";

// Gera URL assinada de curta duração somente se o registro for visível ao usuário (RLS).
export async function GET(req: NextRequest, { params }: RouteContext<"/app/biblioteca/[id]/download">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const { data: f } = await ctx.supabase
    .from("files")
    .select("storage_path, nome_original, mime_type")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!f?.storage_path) return errorResponse("Arquivo não encontrado ou sem acesso.", 404);
  const inline = req.nextUrl.searchParams.get("inline") === "1" && f.mime_type?.startsWith("image/");
  const { data, error } = await ctx.supabase.storage
    .from("bento-privado")
    .createSignedUrl(f.storage_path, 60, inline ? undefined : { download: f.nome_original ?? true });
  if (error || !data) return errorResponse("Não foi possível gerar o link.", 403);
  if (!inline) await ctx.supabase.rpc("log_file_download", { p_file: id });
  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
