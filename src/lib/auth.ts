import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, type ServerClient } from "@/lib/supabase/server";
import { can, canFinalReview, type Permission, type Role } from "@/lib/permissions";

export interface AppContext {
  supabase: ServerClient;
  userId: string;
  email: string;
  nome: string;
  orgId: string;
  orgNome: string;
  orgSlug: string;
  roles: Role[];
  editorDelegation: boolean;
  organizations: { id: string; nome: string }[];
  settings: {
    nome_projeto: string;
    assinatura: string;
    piloto_inicio: string | null;
    piloto_meses: number;
    piloto_prorrogacao_meses: number;
    meta_boletins: number;
    portal_publico_ativo: boolean;
    limite_upload_mb: number;
    onboarding_concluido: boolean;
  } | null;
}

export const ORG_COOKIE = "bento_org";

/** Contexto autenticado da requisição (memoizado por requisição). */
export const getContext = cache(async (): Promise<AppContext | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("nome, email, situacao").eq("id", userId).maybeSingle(),
    supabase
      .from("memberships")
      .select("organization_id, role, delegacao_revisao_final, status, organizations(id, nome, slug)")
      .eq("user_id", userId)
      .eq("status", "ativo"),
  ]);
  if (!profile || profile.situacao !== "ativa") return null;

  const orgs = new Map<string, { id: string; nome: string; slug: string }>();
  for (const m of memberships ?? []) {
    const o = m.organizations as unknown as { id: string; nome: string; slug: string } | null;
    if (o) orgs.set(o.id, o);
  }
  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  const org = (preferred && orgs.get(preferred)) || orgs.values().next().value;

  const base = {
    supabase,
    userId,
    email: profile.email ?? String(claims?.claims?.email ?? ""),
    nome: profile.nome || profile.email || "Usuário",
    organizations: Array.from(orgs.values()).map((o) => ({ id: o.id, nome: o.nome })),
  };
  if (!org) {
    return { ...base, orgId: "", orgNome: "", orgSlug: "", roles: [], editorDelegation: false, settings: null };
  }
  const mine = (memberships ?? []).filter((m) => m.organization_id === org.id);
  const { data: settings } = await supabase
    .from("project_settings")
    .select(
      "nome_projeto, assinatura, piloto_inicio, piloto_meses, piloto_prorrogacao_meses, meta_boletins, portal_publico_ativo, limite_upload_mb, onboarding_concluido",
    )
    .eq("organization_id", org.id)
    .maybeSingle();

  return {
    ...base,
    orgId: org.id,
    orgNome: org.nome,
    orgSlug: org.slug,
    roles: mine.map((m) => m.role as Role),
    editorDelegation: mine.some((m) => m.role === "editor" && m.delegacao_revisao_final),
    settings: settings ?? null,
  };
});

/** Exige sessão e participação ativa em uma organização. */
export async function requireContext(): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.orgId) redirect("/sem-acesso");
  return ctx;
}

export async function requirePermission(permission: Permission): Promise<AppContext> {
  const ctx = await requireContext();
  if (!can(ctx.roles, permission)) redirect("/app?erro=" + encodeURIComponent("Você não tem permissão para acessar esta área."));
  return ctx;
}

export function has(ctx: AppContext, permission: Permission) {
  return can(ctx.roles, permission);
}

export function hasFinalReview(ctx: AppContext) {
  return canFinalReview(ctx.roles, ctx.editorDelegation);
}
