// Indicadores calculados a partir de dados reais. Funções puras para facilitar testes.

export interface ExperimentForRate {
  id: string;
  acompanhamento_ativo: boolean;
  archived_at: string | null;
  fase: "implantacao" | "andamento" | "concluido" | "interrompido";
  data_inicio: string | null;
  data_termino_efetiva: string | null;
  periodicidade_acompanhamento: string;
}

export interface RecordForRate {
  experiment_id: string;
  status: string;
  visit_date: string; // YYYY-MM-DD (data local da visita)
}

export interface MonthlyRate {
  mes: string; // YYYY-MM
  numerador: number;
  denominador: number;
  percentual: number | null;
  elegiveis: string[];
  atualizados: string[];
  regras: string[];
}

export const RATE_RULES = [
  "Elegíveis: experimentos não arquivados, com acompanhamento ativo e periodicidade mensal ou quinzenal.",
  "Excluídos: experimentos que só começam depois do mês e os encerrados (concluídos/interrompidos) antes do início do mês ou sem data de término efetiva.",
  "Atualizado: possui ficha de visita enviada (preenchida, conferida ou finalizada) com data da visita dentro do mês.",
  "Percentual = atualizados no mês ÷ elegíveis no mês × 100.",
];

export function monthBounds(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const start = `${mes}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${mes}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function isEligible(e: ExperimentForRate, mes: string): boolean {
  const { start, end } = monthBounds(mes);
  if (e.archived_at || !e.acompanhamento_ativo) return false;
  if (!["mensal", "quinzenal"].includes(e.periodicidade_acompanhamento)) return false;
  if (e.data_inicio && e.data_inicio > end) return false;
  if (e.fase === "concluido" || e.fase === "interrompido") {
    if (!e.data_termino_efetiva || e.data_termino_efetiva < start) return false;
  }
  return true;
}

export function monthlyUpdateRate(experiments: ExperimentForRate[], records: RecordForRate[], mes: string): MonthlyRate {
  const { start, end } = monthBounds(mes);
  const elegiveis = experiments.filter((e) => isEligible(e, mes)).map((e) => e.id);
  const set = new Set(elegiveis);
  const atualizados = Array.from(
    new Set(
      records
        .filter(
          (r) =>
            set.has(r.experiment_id) &&
            ["preenchida", "conferida", "finalizada"].includes(r.status) &&
            r.visit_date >= start &&
            r.visit_date <= end,
        )
        .map((r) => r.experiment_id),
    ),
  );
  const denominador = elegiveis.length;
  const numerador = atualizados.length;
  return {
    mes,
    numerador,
    denominador,
    percentual: denominador === 0 ? null : Math.round((numerador / denominador) * 1000) / 10,
    elegiveis,
    atualizados,
    regras: RATE_RULES,
  };
}

export function countBy<T>(items: T[], key: (item: T) => string | string[] | null | undefined) {
  const out = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    const keys = Array.isArray(k) ? (k.length ? k : ["Não informado"]) : [k || "Não informado"];
    for (const kk of keys) out.set(kk, (out.get(kk) ?? 0) + 1);
  }
  return Array.from(out.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Mês do piloto (1..N) para uma data; null se antes do início ou sem início configurado. */
export function pilotMonth(inicio: string | null, hoje: string): number | null {
  if (!inicio || hoje < inicio) return null;
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = hoje.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return months + 1;
}
