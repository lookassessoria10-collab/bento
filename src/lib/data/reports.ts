import "server-only";
import type { AppContext } from "@/lib/auth";
import { localDate, localMonth, monthBoundsUtc } from "@/lib/format";
import { monthlyUpdateRate, type ExperimentForRate } from "@/lib/metrics";

export function reportPeriod(sp: Record<string, string | string[] | undefined>, pilotStart: string | null) {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const today = localDate();
  return {
    de: valid(s("de")) ? s("de") : pilotStart ?? `${today.slice(0, 7)}-01`,
    ate: valid(s("ate")) ? s("ate") : today,
  };
}

function monthsBetween(de: string, ate: string): string[] {
  const out: string[] = [];
  let [y, m] = de.slice(0, 7).split("-").map(Number);
  const [y2, m2] = ate.slice(0, 7).split("-").map(Number);
  while ((y < y2 || (y === y2 && m <= m2)) && out.length < 36) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Indicadores do pré-projeto calculados com consultas reais (RLS aplicada). */
export async function loadReport(ctx: AppContext, p: { de: string; ate: string }) {
  const { supabase, orgId } = ctx;
  const r = monthBoundsUtc(p.de, p.ate);
  const [exps, visits, recs, tasks, decisions, items, pubs, bulletins, dossiers, metrics, feedback] = await Promise.all([
    supabase.from("experiments").select("id, created_at, archived_at, acompanhamento_ativo, fase, data_inicio, data_termino_efetiva, periodicidade_acompanhamento").eq("organization_id", orgId),
    supabase.from("visit_schedules").select("id, status, data_hora").eq("organization_id", orgId).gte("data_hora", r.from).lt("data_hora", r.to),
    supabase.from("visit_records").select("experiment_id, status, visit_schedules!inner(data_hora)").eq("organization_id", orgId).gte("visit_schedules.data_hora", r.from).lt("visit_schedules.data_hora", r.to),
    supabase.from("tasks").select("id, status, prazo, created_at, concluida_em, responsavel_id, categoria, profiles:responsavel_id(nome)").eq("organization_id", orgId),
    supabase.from("approval_decisions").select("etapa, decisao, created_at").eq("organization_id", orgId).gte("created_at", r.from).lt("created_at", r.to),
    supabase.from("editorial_items").select("id, tipo, created_at").eq("organization_id", orgId).gte("created_at", r.from).lt("created_at", r.to),
    supabase.from("publication_records").select("id, canal, data_publicacao, status, editorial_items(tipo)").eq("organization_id", orgId).gte("data_publicacao", p.de).lte("data_publicacao", p.ate),
    supabase.from("bulletin_editions").select("id, editorial_items(status)").eq("organization_id", orgId),
    supabase.from("dossiers").select("id, finalidade, editorial_items(status)").eq("organization_id", orgId),
    supabase.from("instagram_metrics").select("data_referencia, alcance, impressoes, curtidas, comentarios, salvamentos, compartilhamentos, publication_id").eq("organization_id", orgId).gte("data_referencia", p.de).lte("data_referencia", p.ate),
    supabase.from("audience_feedback").select("clareza, utilidade, sugestao_pauta, moderacao, created_at").eq("organization_id", orgId).gte("created_at", r.from).lt("created_at", r.to),
  ]);

  const E = (exps.data ?? []) as unknown as (ExperimentForRate & { created_at: string })[];
  const R = (recs.data ?? []).map((x) => ({ experiment_id: x.experiment_id, status: x.status, visit_date: localDate((x.visit_schedules as unknown as { data_hora: string }).data_hora) }));
  const V = visits.data ?? [];
  const T = tasks.data ?? [];
  const D = decisions.data ?? [];
  const today = localDate();

  const taxas = monthsBetween(p.de, p.ate)
    .filter((m) => m <= localMonth())
    .map((m) => monthlyUpdateRate(E, R, m));

  // último registro de métricas por publicação (evita somar leituras repetidas)
  const lastByPub = new Map<string, NonNullable<typeof metrics.data>[number]>();
  for (const m of metrics.data ?? []) {
    const cur = lastByPub.get(m.publication_id);
    if (!cur || cur.data_referencia < m.data_referencia) lastByPub.set(m.publication_id, m);
  }
  const lastMetrics = Array.from(lastByPub.values());
  const sum = (k: "alcance" | "impressoes" | "curtidas" | "comentarios" | "salvamentos" | "compartilhamentos") => lastMetrics.reduce((a, b) => a + (b[k] ?? 0), 0);
  const F = (feedback.data ?? []).filter((f) => f.moderacao !== "descartado");
  const avg = (k: "clareza" | "utilidade") => {
    const vals = F.map((f) => f[k]).filter((v): v is number => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  const statusOf = (x: { editorial_items: unknown }) => (x.editorial_items as { status: string } | null)?.status;

  const byPerson = new Map<string, { nome: string; abertas: number; concluidas: number }>();
  for (const t of T) {
    const nome = (t.profiles as unknown as { nome: string } | null)?.nome ?? "Sem responsável";
    const cur = byPerson.get(nome) ?? { nome, abertas: 0, concluidas: 0 };
    if (["concluida"].includes(t.status) && t.concluida_em && t.concluida_em >= r.from && t.concluida_em < r.to) cur.concluidas++;
    else if (!["concluida", "cancelada"].includes(t.status)) cur.abertas++;
    byPerson.set(nome, cur);
  }

  return {
    periodo: p,
    experimentos: {
      cadastrados: E.filter((e) => e.created_at < r.to).length,
      ativos: E.filter((e) => !e.archived_at && e.acompanhamento_ativo && ["implantacao", "andamento"].includes(e.fase)).length,
      acompanhados: new Set(R.filter((x) => x.status !== "rascunho").map((x) => x.experiment_id)).size,
    },
    visitas: {
      planejadas: V.length,
      realizadas: V.filter((v) => v.status === "realizada").length,
      adiadas: V.filter((v) => v.status === "adiada").length,
      canceladas: V.filter((v) => v.status === "cancelada").length,
      fichasValidadas: R.filter((x) => ["conferida", "finalizada"].includes(x.status)).length,
      fichasFinalizadas: R.filter((x) => x.status === "finalizada").length,
    },
    taxas,
    pendencias: {
      abertas: T.filter((t) => !["concluida", "cancelada"].includes(t.status)).length,
      resolvidas: T.filter((t) => t.status === "concluida" && t.concluida_em && t.concluida_em >= r.from && t.concluida_em < r.to).length,
      vencidas: T.filter((t) => !["concluida", "cancelada"].includes(t.status) && t.prazo && t.prazo < today).length,
    },
    conteudos: {
      produzidos: (items.data ?? []).length,
      conferidos: D.filter((d) => d.etapa === "conferencia" && d.decisao === "aprovado").length,
      validados: D.filter((d) => d.etapa === "validacao_cientifica" && d.decisao === "aprovado").length,
      liberados: D.filter((d) => d.etapa === "revisao_final" && d.decisao === "aprovado").length,
      publicados: (pubs.data ?? []).length,
    },
    boletins: {
      finalizados: (bulletins.data ?? []).filter((b) => ["liberado", "publicado"].includes(statusOf(b) ?? "")).length,
      publicados: (bulletins.data ?? []).filter((b) => statusOf(b) === "publicado").length,
      meta: ctx.settings?.meta_boletins ?? 2,
    },
    dossies: {
      emitidos: (dossiers.data ?? []).filter((d) => ["liberado", "publicado"].includes(statusOf(d) ?? "")).length,
      autorizados: (dossiers.data ?? []).filter((d) => d.finalidade === "divulgacao" && ["liberado", "publicado"].includes(statusOf(d) ?? "")).length,
    },
    alcance: {
      publicacoesComMetricas: lastMetrics.length,
      alcance: sum("alcance"),
      impressoes: sum("impressoes"),
      interacoes: sum("curtidas") + sum("comentarios") + sum("salvamentos") + sum("compartilhamentos"),
      referencia: lastMetrics.map((m) => m.data_referencia).sort().at(-1) ?? null,
    },
    feedback: {
      respostas: F.length,
      clareza: avg("clareza"),
      utilidade: avg("utilidade"),
      sugestoes: F.map((f) => f.sugestao_pauta).filter(Boolean).slice(0, 20) as string[],
    },
    equipe: Array.from(byPerson.values()).sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}

export type Report = Awaited<ReturnType<typeof loadReport>>;
