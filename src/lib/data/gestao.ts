import "server-only";
import type { AppContext } from "@/lib/auth";
import { localDate } from "@/lib/format";
import type { GData, GExperiment, GIncident, TimeItem } from "@/lib/gestao";

export interface GestaoLoad {
  data: GData;
  /** data de referência: a do pacote na demonstração, hoje nas organizações reais */
  ref: string;
  demo: boolean;
  timeItems: (TimeItem & { id: string; premissa: string | null; updated_at: string })[];
  editorial: { titulo: string; status: string; labels: string[] }[];
  /** próxima visita planejada/confirmada de cada ensaio (a partir da data de referência) */
  proximas: Record<string, string>;
  error: string | null;
}

/**
 * Carrega os registros da organização atual em poucas consultas (RLS aplicada pelo cliente do usuário).
 * O volume é o de uma unidade experimental; os agregados são calculados em memória a partir desta carga única.
 */
export async function loadGestao(ctx: AppContext): Promise<GestaoLoad> {
  const s = ctx.supabase;
  const org = ctx.orgId;
  const [exps, recs, meas, incs, tasks, files, editorial, time, planned] = await Promise.all([
    s
      .from("experiments")
      .select(
        "id, codigo, titulo, culturas, area_tematica, fase, data_inicio, data_termino_prevista, updated_at, pesquisador_principal_id, farm_area_id, periodicidade_acompanhamento, acompanhamento_ativo, objetivo_geral, resumo_metodologico, is_demo, demo_meta, people:people!experiments_pesquisador_principal_id_organization_id_fkey(nome), farm_areas:farm_areas!experiments_farm_area_id_organization_id_fkey(nome)",
      )
      .eq("organization_id", org)
      .is("archived_at", null)
      .order("codigo")
      .limit(2000),
    s
      .from("visit_records")
      .select("id, experiment_id, status, etapa_atual, avaliacoes_realizadas, observacoes_diretas, proxima_acao, fontes, visit_schedules!inner(data_hora, status)")
      .eq("organization_id", org)
      .limit(10000),
    s.from("experiment_measurements").select("experiment_id, visit_record_id, data_medicao, variavel, valor, unidade, motivo_ausencia, ordem").eq("organization_id", org).order("ordem").limit(20000),
    s.from("experiment_incidents").select("*").eq("organization_id", org).order("detectada_em").limit(5000),
    s.from("tasks").select("experiment_id, titulo, status, prazo").eq("organization_id", org).limit(10000),
    s.from("files").select("experiment_id, tipo, revisao_status").eq("organization_id", org).is("deleted_at", null).limit(10000),
    s.from("editorial_items").select("titulo, status, labels").eq("organization_id", org).is("archived_at", null).limit(500),
    ctx.orgIsDemo
      ? s.from("demo_time_assumptions").select("id, atividade, eventos_mes, minutos_antes, minutos_bento, premissa, updated_at").eq("organization_id", org).order("ordem")
      : Promise.resolve({ data: [], error: null }),
    s
      .from("visit_schedule_experiments")
      .select("experiment_id, visit_schedules!inner(data_hora, status)")
      .eq("organization_id", org)
      .in("visit_schedules.status", ["planejada", "confirmada"])
      .limit(5000),
  ]);
  const error = [exps, recs, meas, incs, tasks, files, editorial, time, planned].find((r) => r.error)?.error?.message ?? null;

  let asOf: string | null = null;
  const experiments: GExperiment[] = (exps.data ?? []).map((e) => {
    const meta = (e.demo_meta ?? null) as { asOfDate?: string; scientificReview?: { status?: string } } | null;
    if (meta?.asOfDate && (!asOf || meta.asOfDate > asOf)) asOf = meta.asOfDate;
    return {
      id: e.id,
      codigo: e.codigo,
      titulo: e.titulo,
      culturas: e.culturas,
      area_tematica: e.area_tematica,
      fase: e.fase,
      data_inicio: e.data_inicio,
      data_termino_prevista: e.data_termino_prevista,
      updated_at: e.updated_at,
      responsavel: (e.people as unknown as { nome: string } | null)?.nome ?? null,
      responsavel_id: e.pesquisador_principal_id,
      setor: (e.farm_areas as unknown as { nome: string } | null)?.nome ?? null,
      setor_id: e.farm_area_id,
      periodicidade_acompanhamento: e.periodicidade_acompanhamento,
      acompanhamento_ativo: e.acompanhamento_ativo,
      objetivo_geral: e.objetivo_geral,
      resumo_metodologico: e.resumo_metodologico,
      is_demo: e.is_demo,
      revisao_simulada: meta?.scientificReview?.status ?? null,
    };
  });

  const ref = ctx.orgIsDemo && asOf ? asOf : localDate();
  const proximas: Record<string, string> = {};
  for (const p of planned.data ?? []) {
    const d = localDate((p.visit_schedules as unknown as { data_hora: string }).data_hora);
    if (d >= ref && (!proximas[p.experiment_id] || d < proximas[p.experiment_id])) proximas[p.experiment_id] = d;
  }

  return {
    proximas,
    data: {
      experiments,
      visits: (recs.data ?? []).map((r) => {
        const v = r.visit_schedules as unknown as { data_hora: string; status: string };
        return {
          record_id: r.id,
          experiment_id: r.experiment_id,
          data: localDate(v.data_hora),
          status: r.status,
          etapa_atual: r.etapa_atual,
          avaliacoes_realizadas: r.avaliacoes_realizadas,
          observacoes_diretas: r.observacoes_diretas,
          proxima_acao: r.proxima_acao,
          fontes: r.fontes,
        };
      }),
      measurements: (meas.data ?? []).map((m) => ({ ...m, valor: m.valor === null ? null : Number(m.valor) })),
      incidents: (incs.data ?? []) as GIncident[],
      tasks: tasks.data ?? [],
      files: files.data ?? [],
    },
    ref,
    demo: ctx.orgIsDemo,
    timeItems: (time.data ?? []).map((t) => ({ ...t, eventos_mes: Number(t.eventos_mes), minutos_antes: Number(t.minutos_antes), minutos_bento: Number(t.minutos_bento) })),
    editorial: editorial.data ?? [],
    error,
  };
}
