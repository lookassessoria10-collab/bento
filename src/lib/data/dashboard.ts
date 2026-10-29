import "server-only";
import type { AppContext } from "@/lib/auth";
import { addDays, localDate, localMonth, monthBoundsUtc } from "@/lib/format";
import { countBy, monthBounds, monthlyUpdateRate, type ExperimentForRate } from "@/lib/metrics";

export interface DashboardFilters {
  de: string;
  ate: string;
  area: string;
  cultura: string;
  responsavel: string;
  fase: string;
}

export function dashboardFilters(sp: Record<string, string | string[] | undefined>): DashboardFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const today = localDate();
  const { start, end } = monthBounds(localMonth());
  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  return {
    de: valid(s("de")) ? s("de") : start,
    ate: valid(s("ate")) ? s("ate") : end > today ? end : today,
    area: s("area").slice(0, 100),
    cultura: s("cultura").slice(0, 60).toLowerCase(),
    responsavel: /^[0-9a-f-]{36}$/.test(s("responsavel")) ? s("responsavel") : "",
    fase: ["implantacao", "andamento", "concluido", "interrompido"].includes(s("fase")) ? s("fase") : "",
  };
}

/** Indicadores do painel calculados exclusivamente a partir de dados do banco (com RLS). */
export async function loadDashboard(ctx: AppContext, f: DashboardFilters) {
  const { supabase, orgId } = ctx;
  const range = monthBoundsUtc(f.de, f.ate);
  const today = localDate();

  let eq = supabase
    .from("experiments")
    .select("id, codigo, titulo, titulo_curto, fase, culturas, organismos, area_tematica, acompanhamento_ativo, archived_at, data_inicio, data_termino_efetiva, periodicidade_acompanhamento, pesquisador_principal_id, updated_at, farms:farms!experiments_farm_id_organization_id_fkey(nome), farm_areas:farm_areas!experiments_farm_area_id_organization_id_fkey(nome)")
    .eq("organization_id", orgId)
    .is("archived_at", null);
  if (f.area) eq = eq.ilike("area_tematica", `%${f.area.replace(/[%,]/g, "")}%`);
  if (f.cultura) eq = eq.contains("culturas", [f.cultura]);
  if (f.responsavel) eq = eq.eq("pesquisador_principal_id", f.responsavel);
  if (f.fase) eq = eq.eq("fase", f.fase as "implantacao");

  const [exps, visits, records, tasks, items, bulletins, upcoming, recent] = await Promise.all([
    eq,
    supabase.from("visit_schedules").select("id, status, data_hora").eq("organization_id", orgId).gte("data_hora", range.from).lt("data_hora", range.to),
    supabase
      .from("visit_records")
      .select("experiment_id, status, visit_schedules!inner(data_hora)")
      .eq("organization_id", orgId)
      .gte("visit_schedules.data_hora", monthBoundsUtc(monthBounds(localMonth()).start, monthBounds(localMonth()).end).from)
      .lt("visit_schedules.data_hora", monthBoundsUtc(monthBounds(localMonth()).start, monthBounds(localMonth()).end).to),
    supabase.from("tasks").select("id, status, prazo, concluida_em").eq("organization_id", orgId),
    supabase.from("editorial_items").select("id, status, tipo").eq("organization_id", orgId).is("archived_at", null),
    supabase.from("bulletin_editions").select("id, numero, data_prevista, editorial_items(status)").eq("organization_id", orgId).order("numero"),
    supabase
      .from("visit_schedules")
      .select("id, titulo, data_hora, status")
      .eq("organization_id", orgId)
      .in("status", ["planejada", "confirmada"])
      .gte("data_hora", new Date().toISOString())
      .lt("data_hora", monthBoundsUtc(today, addDays(today, 30)).to)
      .order("data_hora")
      .limit(20),
    supabase
      .from("experiments")
      .select("id, codigo, titulo_curto, titulo, updated_at, updated_by, is_demo")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const E = exps.data ?? [];
  const ids = new Set(E.map((e) => e.id));
  const recs = (records.data ?? [])
    .filter((r) => ids.has(r.experiment_id))
    .map((r) => ({
      experiment_id: r.experiment_id,
      status: r.status,
      visit_date: localDate((r.visit_schedules as unknown as { data_hora: string }).data_hora),
    }));
  const rate = monthlyUpdateRate(E as unknown as ExperimentForRate[], recs, localMonth());

  // sem atualização devida: elegível no mês e sem ficha enviada
  const overdue = E.filter((e) => rate.elegiveis.includes(e.id) && !rate.atualizados.includes(e.id));

  const V = visits.data ?? [];
  const T = tasks.data ?? [];
  const I = items.data ?? [];
  const B = bulletins.data ?? [];
  const bStatus = (b: (typeof B)[number]) => (b.editorial_items as unknown as { status: string } | null)?.status;

  return {
    periodo: { de: f.de, ate: f.ate },
    experimentos: {
      total: E.length,
      ativos: E.filter((e) => e.acompanhamento_ativo && ["implantacao", "andamento"].includes(e.fase)).length,
      porFase: countBy(E, (e) => e.fase),
      porCultura: countBy(E, (e) => e.culturas),
      porArea: countBy(E, (e) => e.area_tematica),
      porLocal: countBy(E, (e) => [(e.farms as unknown as { nome: string } | null)?.nome, (e.farm_areas as unknown as { nome: string } | null)?.nome].filter(Boolean).join(" — ") || null),
      semAtualizacao: overdue.map((e) => ({ id: e.id, codigo: e.codigo, titulo: e.titulo_curto || e.titulo })),
    },
    visitas: {
      previstas: V.filter((v) => ["planejada", "confirmada"].includes(v.status)).length,
      realizadas: V.filter((v) => v.status === "realizada").length,
      adiadas: V.filter((v) => v.status === "adiada").length,
      naoRealizadas: V.filter((v) => v.status === "cancelada" || (["planejada", "confirmada"].includes(v.status) && localDate(v.data_hora) < today)).length,
    },
    taxa: rate,
    pendencias: {
      abertas: T.filter((t) => !["concluida", "cancelada"].includes(t.status)).length,
      vencidas: T.filter((t) => !["concluida", "cancelada"].includes(t.status) && t.prazo && t.prazo < today).length,
      resolvidasNoPeriodo: T.filter((t) => t.concluida_em && t.concluida_em >= range.from && t.concluida_em < range.to).length,
    },
    revisao: {
      conferencia: I.filter((i) => i.status === "em_conferencia").length,
      validacao: I.filter((i) => i.status === "aguardando_validacao").length,
      final: I.filter((i) => i.status === "validado" || i.status === "aguardando_revisao_final").length,
      liberados: I.filter((i) => i.status === "liberado").length,
    },
    boletins: {
      preparacao: B.filter((b) => !["publicado", "revogado"].includes(bStatus(b) ?? "")).length,
      publicados: B.filter((b) => bStatus(b) === "publicado").length,
      proxima: B.filter((b) => b.data_prevista && b.data_prevista >= today && bStatus(b) !== "publicado").sort((a, b) => a.data_prevista!.localeCompare(b.data_prevista!))[0] ?? null,
    },
    agenda: (upcoming.data ?? []).map((v) => ({ ...v, em7: localDate(v.data_hora) <= addDays(today, 7) })),
    recentes: recent.data ?? [],
  };
}
