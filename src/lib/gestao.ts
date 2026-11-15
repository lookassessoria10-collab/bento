// Cálculos do painel gerencial (funções puras, testáveis sem banco).
// Toda métrica é derivada dos registros carregados sob RLS; nada é fixo na interface.

export type Fase = "planejado" | "implantacao" | "andamento" | "concluido" | "interrompido";

export interface GExperiment {
  id: string;
  codigo: string;
  titulo: string;
  culturas: string[];
  area_tematica: string | null;
  fase: Fase;
  data_inicio: string | null;
  data_termino_prevista: string | null;
  updated_at: string;
  responsavel: string | null;
  responsavel_id: string | null;
  setor: string | null;
  setor_id: string | null;
  periodicidade_acompanhamento: string;
  acompanhamento_ativo: boolean;
  objetivo_geral: string | null;
  resumo_metodologico: string | null;
  is_demo: boolean;
  revisao_simulada: string | null;
}
export interface GVisit {
  record_id: string;
  experiment_id: string;
  data: string;
  status: string;
  etapa_atual: string | null;
  avaliacoes_realizadas: string | null;
  observacoes_diretas: string | null;
  proxima_acao: string | null;
  fontes: string | null;
}
export interface GMeasurement {
  experiment_id: string;
  visit_record_id: string | null;
  data_medicao: string;
  variavel: string;
  valor: number | null;
  unidade: string | null;
  motivo_ausencia: string | null;
}
export interface GIncident {
  id: string;
  experiment_id: string;
  titulo: string;
  gravidade: "baixa" | "media" | "alta" | "critica";
  detectada_em: string;
  descricao: string | null;
  consequencia: string | null;
  providencia: string | null;
  responsavel_descricao: string | null;
  proxima_verificacao: string | null;
  status: "aberta" | "em_acompanhamento" | "resolvida" | "encerrada";
  resolvida_em: string | null;
}
export interface GTask {
  experiment_id: string | null;
  titulo: string;
  status: string;
  prazo: string | null;
}
export interface GFile {
  experiment_id: string | null;
  tipo: string;
  revisao_status: string;
}
export interface GData {
  experiments: GExperiment[];
  visits: GVisit[];
  measurements: GMeasurement[];
  incidents: GIncident[];
  tasks: GTask[];
  files: GFile[];
}

export interface GFilters {
  de: string;
  ate: string;
  cultura: string;
  area: string;
  fase: string;
  responsavel: string;
  setor: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function parseFilters(sp: Record<string, string | string[] | undefined>): GFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim().slice(0, 120) : "");
  return {
    de: ISO.test(s("de")) ? s("de") : "",
    ate: ISO.test(s("ate")) ? s("ate") : "",
    cultura: s("cultura").toLowerCase(),
    area: s("area"),
    fase: ["planejado", "implantacao", "andamento", "concluido", "interrompido"].includes(s("fase")) ? s("fase") : "",
    responsavel: s("responsavel"),
    setor: s("setor"),
  };
}

export function filtersQuery(f: GFilters) {
  return new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
}

const inPeriod = (d: string | null, f: GFilters) => !!d && (!f.de || d >= f.de) && (!f.ate || d <= f.ate);

/** Aplica a mesma seleção a todos os blocos: ensaios pelos atributos e período; registros pelo ensaio e pela data. */
export function applyFilters(data: GData, f: GFilters): GData {
  const experiments = data.experiments.filter((e) => {
    if (f.cultura && !e.culturas.includes(f.cultura)) return false;
    if (f.area && e.area_tematica !== f.area) return false;
    if (f.fase && e.fase !== f.fase) return false;
    if (f.responsavel && e.responsavel_id !== f.responsavel) return false;
    if (f.setor && e.setor_id !== f.setor) return false;
    if (f.de || f.ate) {
      // ensaio entra se seu intervalo previsto cruza o período escolhido
      const ini = e.data_inicio ?? e.data_termino_prevista;
      const fim = e.data_termino_prevista ?? e.data_inicio;
      if (!ini || !fim) return false;
      if (f.ate && ini > f.ate) return false;
      if (f.de && fim < f.de) return false;
    }
    return true;
  });
  const ids = new Set(experiments.map((e) => e.id));
  const period = !!(f.de || f.ate);
  return {
    experiments,
    visits: data.visits.filter((v) => ids.has(v.experiment_id) && (!period || inPeriod(v.data, f))),
    measurements: data.measurements.filter((m) => ids.has(m.experiment_id) && (!period || inPeriod(m.data_medicao, f))),
    incidents: data.incidents.filter((i) => ids.has(i.experiment_id) && (!period || inPeriod(i.detectada_em, f) || (i.status === "aberta" && (!f.ate || i.detectada_em <= f.ate)))),
    tasks: data.tasks.filter((t) => t.experiment_id && ids.has(t.experiment_id)),
    files: data.files.filter((x) => x.experiment_id && ids.has(x.experiment_id)),
  };
}

export const FASE_ORDER: Fase[] = ["planejado", "implantacao", "andamento", "concluido", "interrompido"];

const tally = (xs: string[]) => {
  const m = new Map<string, number>();
  xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

export function portfolio(experiments: GExperiment[]) {
  const porFase = Object.fromEntries(FASE_ORDER.map((f) => [f, experiments.filter((e) => e.fase === f).length])) as Record<Fase, number>;
  return {
    total: experiments.length,
    porFase,
    culturas: tally(experiments.flatMap((e) => e.culturas)),
    responsaveis: tally(experiments.map((e) => e.responsavel ?? "Não informado")),
    setores: tally(experiments.map((e) => e.setor ?? "Não informado")),
    areas: tally(experiments.map((e) => e.area_tematica ?? "Não informada")),
    ultimaAtualizacao: experiments.reduce<string | null>((m, e) => (!m || e.updated_at > m ? e.updated_at : m), null),
  };
}

export const monthOf = (d: string) => d.slice(0, 7);

/** Contagem por mês (AAAA-MM), em ordem cronológica, sem inventar meses vazios fora do intervalo observado. */
export function byMonth(dates: (string | null)[]) {
  const m = new Map<string, number>();
  for (const d of dates) if (d) m.set(monthOf(d), (m.get(monthOf(d)) ?? 0) + 1);
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, value]) => ({ mes, value }));
}

const PERIOD_DAYS: Record<string, number | null> = { quinzenal: 15, mensal: 30, bimestral: 60, trimestral: 90, sob_demanda: null };

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Visitas devidas: só ensaios em andamento com periodicidade definida (o planejamento explícito do cadastro). */
export function dueVisits(experiments: GExperiment[], visits: GVisit[], ref: string) {
  return experiments
    .filter((e) => e.fase === "andamento" && e.acompanhamento_ativo && PERIOD_DAYS[e.periodicidade_acompanhamento])
    .map((e) => {
      const last = visits.filter((v) => v.experiment_id === e.id && v.data <= ref).reduce<string | null>((m, v) => (!m || v.data > m ? v.data : m), null);
      const limite = PERIOD_DAYS[e.periodicidade_acompanhamento]!;
      const desde = last ? daysBetween(last, ref) : e.data_inicio ? daysBetween(e.data_inicio, ref) : null;
      return { experiment: e, ultimaVisita: last, diasDesde: desde, limite, devida: desde !== null && desde > limite };
    })
    .sort((a, b) => Number(b.devida) - Number(a.devida) || (b.diasDesde ?? 0) - (a.diasDesde ?? 0));
}

export const ESSENTIAL_VISIT_FIELDS = ["etapa_atual", "avaliacoes_realizadas", "observacoes_diretas", "proxima_acao", "fontes"] as const;
export const ESSENTIAL_LABELS: Record<(typeof ESSENTIAL_VISIT_FIELDS)[number], string> = {
  etapa_atual: "estádio/etapa",
  avaliacoes_realizadas: "atividade realizada",
  observacoes_diretas: "observação direta",
  proxima_acao: "próximo passo",
  fontes: "origem do dado",
};

/**
 * Preenchimento de registros essenciais = campos essenciais preenchidos nas fichas ÷ (fichas × 5) × 100.
 * Medições: com valor OU ausência justificada contam como registradas; ausência sem motivo não conta.
 */
export function completeness(visits: GVisit[], measurements: GMeasurement[]) {
  const total = visits.length * ESSENTIAL_VISIT_FIELDS.length;
  const filled = visits.reduce((n, v) => n + ESSENTIAL_VISIT_FIELDS.filter((k) => (v[k] ?? "").trim() !== "").length, 0);
  const medidas = measurements.length;
  const comValor = measurements.filter((m) => m.valor !== null).length;
  const ausentesJustificadas = measurements.filter((m) => m.valor === null && (m.motivo_ausencia ?? "").trim()).length;
  return {
    numerador: filled,
    denominador: total,
    percentual: total ? Math.round((filled / total) * 1000) / 10 : null,
    medidas,
    comValor,
    ausentesJustificadas,
    ausentesSemMotivo: medidas - comValor - ausentesJustificadas,
  };
}

const SEVERITY_RANK = { critica: 0, alta: 1, media: 2, baixa: 3 } as const;
export const SEVERITY_LABELS = { critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa" } as const;
export const INCIDENT_STATUS_LABELS = { aberta: "Aberta", em_acompanhamento: "Em acompanhamento", resolvida: "Resolvida", encerrada: "Encerrada" } as const;

/** Ocorrências abertas priorizadas por gravidade, depois pela mais antiga (mais tempo sem resposta). */
export function openIncidents(incidents: GIncident[], ref: string) {
  return incidents
    .filter((i) => i.status === "aberta" || i.status === "em_acompanhamento")
    .map((i) => ({ ...i, diasSemResposta: daysBetween(i.detectada_em, ref) }))
    .sort((a, b) => SEVERITY_RANK[a.gravidade] - SEVERITY_RANK[b.gravidade] || a.detectada_em.localeCompare(b.detectada_em));
}

export interface SeriesPoint {
  data: string;
  valor: number | null;
  motivo: string | null;
}
/** Séries por variável de um ensaio, em ordem cronológica; ausências permanecem nulas (lacuna no gráfico). */
export function seriesOf(measurements: GMeasurement[], experimentId: string) {
  const m = new Map<string, { variavel: string; unidade: string | null; pontos: SeriesPoint[] }>();
  for (const x of measurements.filter((y) => y.experiment_id === experimentId)) {
    const k = `${x.variavel}|${x.unidade ?? ""}`;
    if (!m.has(k)) m.set(k, { variavel: x.variavel, unidade: x.unidade, pontos: [] });
    m.get(k)!.pontos.push({ data: x.data_medicao, valor: x.valor, motivo: x.motivo_ausencia });
  }
  return [...m.values()].map((s) => ({ ...s, pontos: s.pontos.sort((a, b) => a.data.localeCompare(b.data)) })).filter((s) => s.pontos.some((p) => p.valor !== null));
}

/** Média apenas dos valores existentes (nulos não viram zero). */
export function meanOf(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// ---------------------------------------------------------------------------
// Estimativa de tempo administrativo — SIMULAÇÃO (premissas hipotéticas, nunca medição)
// ---------------------------------------------------------------------------
export interface TimeItem {
  atividade: string;
  eventos_mes: number;
  minutos_antes: number;
  minutos_bento: number;
}
export function timeEconomy(items: TimeItem[]) {
  const linhas = items.map((i) => {
    const antes = i.eventos_mes * i.minutos_antes;
    const bento = i.eventos_mes * i.minutos_bento;
    return { ...i, antesMes: antes, bentoMes: bento, economiaMes: antes - bento };
  });
  const antes = linhas.reduce((a, l) => a + l.antesMes, 0);
  const bento = linhas.reduce((a, l) => a + l.bentoMes, 0);
  const economia = antes - bento;
  return { linhas, antes, bento, economia, percentual: antes > 0 ? Math.round((economia / antes) * 1000) / 10 : null };
}

export function fmtMinutes(min: number) {
  const sign = min < 0 ? "−" : "";
  const m = Math.round(Math.abs(min));
  const h = Math.floor(m / 60);
  return h ? `${sign}${h}h${String(m % 60).padStart(2, "0")}min` : `${sign}${m} min`;
}
