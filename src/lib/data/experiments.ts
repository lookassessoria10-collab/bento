import "server-only";
import type { AppContext } from "@/lib/auth";
import { PHASE_LABELS } from "@/lib/labels";

type SP = Record<string, string | string[] | undefined>;

export function experimentFilters(sp: SP) {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return {
    q: s("q").slice(0, 100),
    fase: s("fase"),
    cultura: s("cultura").slice(0, 60),
    area: s("area").slice(0, 100),
    responsavel: s("responsavel"),
    arquivados: s("arquivados") === "1",
    ordem: s("ordem") || "codigo",
    page: Math.max(1, Number(s("page")) || 1),
  };
}

export type ExperimentFilters = ReturnType<typeof experimentFilters>;

const LIST_COLUMNS =
  "id, codigo, codigo_institucional, titulo, titulo_curto, area_tematica, culturas, organismos, fase, disponibilidade, nivel_acesso, acompanhamento_ativo, is_demo, archived_at, updated_at, data_inicio, data_termino_prevista, data_termino_efetiva, fonte_cadastro, data_informacao, people:people!experiments_pesquisador_principal_id_organization_id_fkey(nome), farms:farms!experiments_farm_id_organization_id_fkey(nome)";

/** Consulta paginada no servidor; a RLS restringe aos experimentos visíveis ao usuário. */
export function queryExperiments(ctx: AppContext, f: ExperimentFilters) {
  let q = ctx.supabase.from("experiments").select(LIST_COLUMNS, { count: "exact" }).eq("organization_id", ctx.orgId);
  q = f.arquivados ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (f.q) {
    const term = f.q.replace(/[%,()*\\]/g, " ").trim();
    if (term) q = q.or(`titulo.ilike.%${term}%,codigo.ilike.%${term}%,codigo_institucional.ilike.%${term}%,area_tematica.ilike.%${term}%`);
  }
  if (f.fase && f.fase in PHASE_LABELS) q = q.eq("fase", f.fase as keyof typeof PHASE_LABELS);
  if (f.cultura) q = q.contains("culturas", [f.cultura.toLowerCase()]);
  if (f.area) q = q.ilike("area_tematica", `%${f.area.replace(/[%,]/g, "")}%`);
  if (/^[0-9a-f-]{36}$/.test(f.responsavel)) q = q.eq("pesquisador_principal_id", f.responsavel);
  return f.ordem === "atualizacao" ? q.order("updated_at", { ascending: false }) : q.order("codigo_seq");
}
