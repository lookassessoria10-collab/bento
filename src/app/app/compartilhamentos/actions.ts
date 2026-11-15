"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { run, UserError, type ActionResult } from "@/lib/actions";
import { DEMO_ONLY_SECOES, SHARE_PUBLICOS, hashSharePassword, newShareToken, shareConfigSchema, type SharePublico } from "@/lib/share";

const optUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable());

async function siteOrigin() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Cria um link (ou substitui um existente de forma atômica). O token é gerado aqui, enviado ao banco só como hash,
 * e devolvido UMA vez ao administrador. A organização é sempre a do usuário autenticado.
 */
export async function createShareLink(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("compartilhamentos.gerenciar");
    const v = z
      .object({
        nome: z.string().trim().min(3, "Informe um nome interno.").max(200),
        publico: z.enum(Object.keys(SHARE_PUBLICOS) as [SharePublico, ...SharePublico[]], { message: "Escolha o público." }),
        validade_dias: z.coerce.number().int().min(1, "Mínimo de 1 dia.").max(365, "Máximo de 365 dias."),
        senha: z.preprocess((x) => (x === "" || x == null ? null : x), z.string().min(8, "A senha precisa de ao menos 8 caracteres.").max(200).nullable()),
        substitui: optUuid,
        origem: optUuid,
      })
      .parse({
        nome: fd.get("nome"),
        publico: fd.get("publico"),
        validade_dias: fd.get("validade_dias"),
        senha: fd.get("senha"),
        substitui: fd.get("substitui"),
        origem: fd.get("origem"),
      });
    if (v.publico === "demonstracao_comercial" && !ctx.orgIsDemo) throw new UserError("Demonstração comercial só pode usar a organização de demonstração.");
    const cfg = shareConfigSchema.parse({
      titulo: fd.get("titulo"),
      subtitulo: fd.get("subtitulo") ?? "",
      secoes: fd.getAll("secoes").map(String).filter((s) => ctx.orgIsDemo || !DEMO_ONLY_SECOES.includes(s as never)),
      experimentos: fd.getAll("experimentos").map(String).filter(Boolean),
      de: fd.get("de"),
      ate: fd.get("ate"),
    });
    // ensaios precisam pertencer à organização e ser visíveis a quem compartilha
    if (cfg.experimentos.length) {
      const { data } = await ctx.supabase.from("experiments").select("id").eq("organization_id", ctx.orgId).in("id", cfg.experimentos);
      const ok = new Set((data ?? []).map((e) => e.id));
      if (ok.size !== cfg.experimentos.length) throw new UserError("Há ensaios selecionados fora desta organização ou sem acesso.");
    }
    const { token, hash } = newShareToken();
    const expira = new Date(Date.now() + v.validade_dias * 86_400_000).toISOString();
    const { error } = await ctx.supabase.rpc("share_link_create", {
      p_org: ctx.orgId,
      p_nome: v.nome,
      p_publico: v.publico,
      p_token_hash: hash,
      p_expira_em: expira,
      p_config: cfg,
      p_senha_hash: v.senha ? hashSharePassword(v.senha) : undefined,
      p_substitui: v.substitui ?? undefined,
      p_origem: v.origem ?? undefined,
    });
    if (error) throw new UserError(error.message.includes("demonstração") ? "Demonstração comercial só pode usar a organização de demonstração." : "Não foi possível criar o link.");
    revalidatePath("/app/compartilhamentos");
    return {
      ok: true,
      message: v.substitui ? "Novo link criado e o anterior revogado." : "Link criado. Copie agora: por segurança ele não será exibido de novo.",
      secret: `${await siteOrigin()}/compartilhado#${token}`,
    };
  });
}

export async function revokeShareLink(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("compartilhamentos.gerenciar");
    const id = z.string().uuid().parse(fd.get("id"));
    const motivo = z.string().trim().max(300).optional().parse(fd.get("motivo") || undefined);
    const { error } = await ctx.supabase.rpc("share_link_revoke", { p_id: id, p_motivo: motivo });
    if (error) throw new UserError("Não foi possível revogar o link.");
    revalidatePath("/app/compartilhamentos");
    return { ok: true, message: "Link revogado. O acesso foi bloqueado imediatamente." };
  });
}
