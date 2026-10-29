import "server-only";
import { createClient as createSb } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export const PORTAL_ORG_SLUG = process.env.PORTAL_ORG_SLUG ?? "entomo-agro-360";

/** Cliente anônimo (sem cookies): o portal enxerga exatamente o que um visitante enxerga. */
export function anonClient() {
  const { url, key } = publicEnv();
  return createSb<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function portalState() {
  const sb = anonClient();
  // a RLS só retorna a organização/configuração quando o portal está ativo
  const { data: org } = await sb.from("organizations").select("id, nome, slug").eq("slug", PORTAL_ORG_SLUG).maybeSingle();
  if (!org) return { active: false as const };
  const { data: s } = await sb
    .from("project_settings")
    .select("nome_projeto, contato_institucional, politica_editorial, feedback_publico_ativo, exibir_marcas_institucionais")
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!s) return { active: false as const };
  return { active: true as const, org, settings: s, sb };
}
