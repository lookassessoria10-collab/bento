// Cálculos dos painéis (funções puras). Complementa src/lib/gestao.ts com agenda, cronograma,
// atenção, operação e documentos. Definições em src/lib/metricas.ts.
import { daysBetween, type GExperiment, type GIncident, type GVisit } from "@/lib/gestao";

export type EntryStatus = "planejado" | "confirmado" | "realizado" | "reagendado" | "cancelado";
export type EntryTipo = "visita" | "avaliacao" | "reuniao_revisao" | "coleta" | "prazo_entrega" | "marco_encerramento" | "outro";

export const ENTRY_TIPO_LABELS: Record<EntryTipo, string> = {
  visita: "Visita de acompanhamento",
  avaliacao: "Avaliação prevista",
  reuniao_revisao: "Reunião de revisão",
  coleta: "Coleta programada",
  prazo_entrega: "Prazo de entrega",
  marco_encerramento: "Marco de encerramento",
  outro: "Outro",
};
export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  planejado: "Planejado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  reagendado: "Reagendado",
  cancelado: "Cancelado",
};

export interface PSchedule {
  id: string;
  experiment_ids: string[];
  data: string;
  hora: string | null;
  status: "planejada" | "confirmada" | "realizada" | "adiada" | "cancelada";
  titulo: string;
}
export interface PEvent {
  id: string;
  experiment_id: string | null;
  visit_id: string | null;
  tipo: Exclude<EntryTipo, "visita">;
  titulo: string;
  data_prevista: string;
  status: EntryStatus;
  realizado_em: string | null;
  responsavel: string | null;
  observacoes: string | null;
}
export interface PTask {
  id: string;
  experiment_id: string | null;
  titulo: string;
  status: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  prazo: string | null;
  responsavel: string | null;
  created_at: string;
  concluida_em: string | null;
}
export interface PDoc {
  id: string;
  titulo: string;
  status: string;
  tipo: string;
}
export interface PRequest {
  etapa: string;
  status: string;
  created_at: string;
  concluida_em: string | null;
}
export interface PDecision {
  etapa: string;
  decisao: string;
  created_at: string;
}

/** Item unificado da agenda: visitas (visit_schedules) + demais compromissos (calendar_events). */
export interface Entry {
  key: string;
  origem: "visita" | "evento";
  id: string;
  tipo: EntryTipo;
  titulo: string;
  data: string;
  hora: string | null;
  status: EntryStatus;
  realizado_em: string | null;
  experiment_ids: string[];
  responsavel: string | null;
  href: string;
}

const VISIT_STATUS: Record<PSchedule["status"], EntryStatus> = {
  planejada: "planejado",
  confirmada: "confirmado",
  realizada: "realizado",
  adiada: "reagendado",
  cancelada: "cancelado",
};

export function calendarEntries(schedules: PSchedule[], events: PEvent[]): Entry[] {
  const list: Entry[] = [
    ...schedules.map((s) => ({
      key: `v:${s.id}`,
      origem: "visita" as const,
      id: s.id,
      tipo: "visita" as const,
      titulo: s.titulo,
      data: s.data,
      hora: s.hora,
      status: VISIT_STATUS[s.status],
      realizado_em: s.status === "realizada" ? s.data : null,
      experiment_ids: s.experiment_ids,
      responsavel: null,
      href: `/app/visitas/${s.id}`,
    })),
    ...events.map((e) => ({
      key: `e:${e.id}`,
      origem: "evento" as const,
      id: e.id,
      tipo: e.tipo,
      titulo: e.titulo,
      data: e.data_prevista,
      hora: null,
      status: e.status,
      realizado_em: e.realizado_em,
      experiment_ids: e.experiment_id ? [e.experiment_id] : [],
      responsavel: e.responsavel,
      href: `/app/calendario?evento=${e.id}`,
    })),
  ];
  return list.sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? "").localeCompare(b.hora ?? ""));
}

const OPEN: EntryStatus[] = ["planejado", "confirmado", "reagendado"];
export const isOverdueEntry = (e: Entry, ref: string) => OPEN.includes(e.status) && e.data < ref;
export const isOpenTask = (t: PTask) => t.status !== "concluida" && t.status !== "cancelada";
export const isOverdueTask = (t: PTask, ref: string) => isOpenTask(t) && !!t.prazo && t.prazo < ref;

/** Ensaios em atraso (regra em METRICAS.ensaios_atraso), com os motivos que tornam o atraso verificável. */
export function delayedExperiments(experiments: GExperiment[], entries: Entry[], tasks: PTask[], ref: string) {
  return experiments
    .filter((e) => e.fase === "andamento" || e.fase === "implantacao")
    .map((e) => {
      const motivos = [
        ...entries.filter((x) => x.experiment_ids.includes(e.id) && isOverdueEntry(x, ref)).map((x) => `${ENTRY_TIPO_LABELS[x.tipo]} prevista para ${x.data} não realizada`),
        ...tasks.filter((t) => t.experiment_id === e.id && isOverdueTask(t, ref)).map((t) => `Pendência “${t.titulo}” vencida em ${t.prazo}`),
      ];
      return { experiment: e, motivos };
    })
    .filter((x) => x.motivos.length > 0);
}

/** Visitas por mês: realizadas × agendadas (planejadas/confirmadas/reagendadas). Canceladas não entram. */
export function visitsByMonth(entries: Entry[]) {
  const m = new Map<string, { realizadas: number; agendadas: number }>();
  for (const e of entries.filter((x) => x.tipo === "visita" && x.status !== "cancelado")) {
    const k = e.data.slice(0, 7);
    const cur = m.get(k) ?? { realizadas: 0, agendadas: 0 };
    if (e.status === "realizado") cur.realizadas++;
    else cur.agendadas++;
    m.set(k, cur);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v }));
}

/** Cumprimento: realizadas ÷ (vencidas − canceladas). Sem base → percentual nulo (“Dados insuficientes”). */
export function visitCompliance(entries: Entry[], ref: string) {
  const vencidas = entries.filter((e) => e.tipo === "visita" && e.data <= ref && e.status !== "cancelado");
  const realizadas = vencidas.filter((e) => e.status === "realizado").length;
  return { numerador: realizadas, denominador: vencidas.length, percentual: vencidas.length ? Math.round((realizadas / vencidas.length) * 1000) / 10 : null };
}

export function upcoming(entries: Entry[], ref: string, days: number) {
  const lim = addDaysIso(ref, days);
  return entries.filter((e) => OPEN.includes(e.status) && e.data >= ref && e.data <= lim);
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const FASES_STACK = ["planejado", "implantacao", "andamento", "concluido", "interrompido"] as const;
/** Situação dos ensaios por cultura (barras empilhadas); ordenado pelo volume. */
export function statusByCulture(experiments: GExperiment[]) {
  const m = new Map<string, Record<string, number>>();
  for (const e of experiments) {
    for (const c of e.culturas.length ? e.culturas : ["não informada"]) {
      const row = m.get(c) ?? Object.fromEntries(FASES_STACK.map((f) => [f, 0]));
      row[e.fase] = (row[e.fase] ?? 0) + 1;
      m.set(c, row);
    }
  }
  return [...m.entries()]
    .map(([cultura, counts]) => ({ cultura, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total || a.cultura.localeCompare(b.cultura));
}

const SEV = { critica: 0, alta: 1, media: 2, baixa: 3 } as const;
const PRI = { urgente: 0, alta: 1, media: 2, baixa: 3 } as const;
export interface AttentionItem {
  tipo: "Ocorrência" | "Pendência" | "Compromisso";
  titulo: string;
  experiment_id: string | null;
  responsavel: string | null;
  data: string | null;
  criticidade: string;
  rank: number;
  href: string;
}
/** Itens que mais exigem ação: ocorrências abertas, pendências vencidas e compromissos vencidos. */
export function attentionItems(incidents: GIncident[], tasks: PTask[], entries: Entry[], ref: string, limit = 5): AttentionItem[] {
  const items: AttentionItem[] = [
    ...incidents
      .filter((i) => i.status === "aberta" || i.status === "em_acompanhamento")
      .map((i) => ({
        tipo: "Ocorrência" as const,
        titulo: i.titulo,
        experiment_id: i.experiment_id,
        responsavel: i.responsavel_descricao,
        data: i.proxima_verificacao,
        criticidade: `Gravidade ${i.gravidade}`,
        rank: SEV[i.gravidade] * 10,
        href: `/app/experimentos/${i.experiment_id}?aba=acompanhamento`,
      })),
    ...tasks
      .filter((t) => isOverdueTask(t, ref))
      .map((t) => ({
        tipo: "Pendência" as const,
        titulo: t.titulo,
        experiment_id: t.experiment_id,
        responsavel: t.responsavel,
        data: t.prazo,
        criticidade: `Prioridade ${t.prioridade} · vencida`,
        rank: PRI[t.prioridade] * 10 + 5,
        href: `/app/atividades?tarefa=${t.id}`,
      })),
    ...entries
      .filter((e) => isOverdueEntry(e, ref))
      .map((e) => ({
        tipo: "Compromisso" as const,
        titulo: e.titulo,
        experiment_id: e.experiment_ids[0] ?? null,
        responsavel: e.responsavel,
        data: e.data,
        criticidade: "Vencido sem realização",
        rank: 15,
        href: e.href,
      })),
  ];
  return items.sort((a, b) => a.rank - b.rank || (a.data ?? "9999").localeCompare(b.data ?? "9999")).slice(0, limit);
}

export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Tempo de resolução: só pares com ambas as datas válidas e fim ≥ início; devolve n. */
export function resolutionDays(pairs: { inicio: string | null; fim: string | null }[]) {
  const days = pairs.filter((p) => p.inicio && p.fim && p.fim.slice(0, 10) >= p.inicio.slice(0, 10)).map((p) => daysBetween(p.inicio!.slice(0, 10), p.fim!.slice(0, 10)));
  return { n: days.length, mediana: median(days), descartados: pairs.filter((p) => p.inicio && p.fim).length - days.length };
}

/** Ensaios ativos sem visita registrada há mais de `dias` (critério configurável). */
export function staleExperiments(experiments: GExperiment[], visits: GVisit[], ref: string, dias: number) {
  return experiments
    .filter((e) => e.fase === "andamento" || e.fase === "implantacao")
    .map((e) => {
      const last = visits.filter((v) => v.experiment_id === e.id && v.data <= ref).reduce<string | null>((m, v) => (!m || v.data > m ? v.data : m), null);
      return { experiment: e, ultima: last, dias: last ? daysBetween(last, ref) : null };
    })
    .filter((x) => x.dias === null || x.dias > dias)
    .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999));
}

/** Cronograma previsto (início → término previsto) × registrado (primeira → última visita). */
export function ganttRows(experiments: GExperiment[], visits: GVisit[]) {
  return experiments
    .filter((e) => e.data_inicio || e.data_termino_prevista)
    .map((e) => {
      const vs = visits.filter((v) => v.experiment_id === e.id).map((v) => v.data).sort();
      return { experiment: e, previstoInicio: e.data_inicio, previstoFim: e.data_termino_prevista, realInicio: vs[0] ?? null, realFim: vs[vs.length - 1] ?? null };
    })
    .sort((a, b) => (a.previstoInicio ?? "").localeCompare(b.previstoInicio ?? ""));
}

/** Visitas realizadas por semana (segunda-feira como início), para o mapa de calor. */
export function weeklyCounts(entries: Entry[]) {
  const m = new Map<string, number>();
  for (const e of entries.filter((x) => x.tipo === "visita" && x.status === "realizado")) {
    const d = new Date(`${e.data}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([semana, n]) => ({ semana, n }));
}

export function tasksByResponsible(tasks: PTask[], ref: string) {
  const m = new Map<string, { abertas: number; vencidas: number; concluidas: number }>();
  for (const t of tasks) {
    const k = t.responsavel ?? "Sem responsável";
    const cur = m.get(k) ?? { abertas: 0, vencidas: 0, concluidas: 0 };
    if (t.status === "concluida") cur.concluidas++;
    else if (isOpenTask(t)) {
      cur.abertas++;
      if (isOverdueTask(t, ref)) cur.vencidas++;
    }
    m.set(k, cur);
  }
  return [...m.entries()].map(([responsavel, v]) => ({ responsavel, ...v })).sort((a, b) => b.abertas - a.abertas || a.responsavel.localeCompare(b.responsavel));
}

export const DOC_STAGES = [
  ["rascunho", "Rascunho"],
  ["em_conferencia", "Em conferência"],
  ["aguardando_validacao", "Aguardando validação"],
  ["aguardando_revisao_final", "Revisão final"],
  ["liberado", "Liberado"],
  ["publicado", "Publicado"],
] as const;
export function docFunnel(docs: PDoc[]) {
  return DOC_STAGES.map(([k, label]) => ({ key: k, label, value: docs.filter((d) => d.status === k || (k === "aguardando_revisao_final" && d.status === "validado")).length }));
}

/** Taxa de aprovação e tempo de decisão (METRICAS.taxa_aprovacao / tempo_decisao) no período. */
export function approvalStats(requests: PRequest[], decisions: PDecision[], de: string, ate: string) {
  const inP = (ts: string) => (!de || ts.slice(0, 10) >= de) && (!ate || ts.slice(0, 10) <= ate);
  const submetidos = requests.filter((r) => r.etapa === "conferencia" && inP(r.created_at)).length;
  const liberados = decisions.filter((d) => d.etapa === "revisao_final" && d.decisao === "aprovado" && inP(d.created_at)).length;
  const t = resolutionDays(requests.filter((r) => r.status === "concluida" && inP(r.created_at)).map((r) => ({ inicio: r.created_at, fim: r.concluida_em })));
  return { submetidos, liberados, taxa: submetidos ? Math.round((liberados / submetidos) * 1000) / 10 : null, tempo: t };
}
