import "server-only";
import type { AppContext } from "@/lib/auth";

// Listas de apoio para formulários (sempre filtradas pela organização e pela RLS).

export async function listPeople(ctx: AppContext) {
  const { data } = await ctx.supabase
    .from("people")
    .select("id, nome, tipo, instituicao, situacao, user_id, is_demo")
    .eq("organization_id", ctx.orgId)
    .neq("situacao", "inativo")
    .order("nome");
  return data ?? [];
}

export async function listFarms(ctx: AppContext) {
  const { data } = await ctx.supabase
    .from("farms")
    .select("id, nome, municipio, uf, farm_areas(id, nome, tipo)")
    .eq("organization_id", ctx.orgId)
    .order("nome");
  return data ?? [];
}

export async function listMembers(ctx: AppContext) {
  const { data } = await ctx.supabase
    .from("memberships")
    .select("user_id, role, status, profiles:profiles!memberships_user_id_fkey(id, nome, email)")
    .eq("organization_id", ctx.orgId)
    .eq("status", "ativo");
  const map = new Map<string, { id: string; nome: string; roles: string[] }>();
  for (const m of data ?? []) {
    const p = m.profiles as unknown as { id: string; nome: string; email: string } | null;
    if (!p) continue;
    const cur = map.get(p.id) ?? { id: p.id, nome: p.nome || p.email, roles: [] };
    cur.roles.push(m.role);
    map.set(p.id, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listExperimentOptions(ctx: AppContext, opts: { includeArchived?: boolean } = {}) {
  let q = ctx.supabase.from("experiments").select("id, codigo, titulo, titulo_curto, is_demo").eq("organization_id", ctx.orgId);
  if (!opts.includeArchived) q = q.is("archived_at", null);
  const { data } = await q.order("codigo_seq");
  return data ?? [];
}

export function personOptions(people: { id: string; nome: string; tipo?: string }[]) {
  return people.map((p) => ({ value: p.id, label: p.tipo ? `${p.nome} (${p.tipo.replace("_", " ")})` : p.nome }));
}

export function memberOptions(members: { id: string; nome: string }[]) {
  return members.map((m) => ({ value: m.id, label: m.nome }));
}

export function experimentOptions(exps: { id: string; codigo: string; titulo: string; titulo_curto: string | null }[]) {
  return exps.map((e) => ({ value: e.id, label: `${e.codigo} — ${e.titulo_curto || e.titulo}` }));
}

/** Nível de acesso do usuário atual em um experimento (null se não for membro). */
export async function myExperimentAccess(ctx: AppContext, experimentId: string) {
  const { data } = await ctx.supabase
    .from("experiment_members")
    .select("acesso")
    .eq("experiment_id", experimentId)
    .eq("user_id", ctx.userId)
    .eq("ativo", true);
  const order = ["proprietario", "revisor", "colaborador", "visualizador"] as const;
  const set = new Set((data ?? []).map((d) => d.acesso));
  return order.find((o) => set.has(o)) ?? null;
}
