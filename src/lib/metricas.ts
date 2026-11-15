// Catálogo de métricas dos painéis: definição exata, fórmula, unidade e fonte de cada indicador.
// É exibido junto dos números ("Como é calculado") e coberto pelos testes de src/lib/painel.ts.

export interface Metrica {
  nome: string;
  definicao: string;
  formula: string;
  unidade: string;
  fonte: string;
}

export const METRICAS = {
  ensaios_total: {
    nome: "Total de ensaios",
    definicao: "Ensaios não arquivados visíveis ao seu perfil, após os filtros.",
    formula: "contagem de experimentos (archived_at vazio)",
    unidade: "ensaios",
    fonte: "experiments",
  },
  ensaios_andamento: {
    nome: "Ensaios em andamento",
    definicao: "Ensaios visíveis ao perfil com situação atual “em andamento”.",
    formula: "contagem de experimentos com fase = andamento",
    unidade: "ensaios",
    fonte: "experiments.fase",
  },
  ensaios_atraso: {
    nome: "Ensaios em atraso",
    definicao:
      "Ensaios ativos (em implantação ou em andamento) com pelo menos um compromisso vencido não cumprido: visita ou compromisso com data anterior à referência ainda planejado/confirmado/reagendado, ou pendência aberta com prazo vencido.",
    formula: "ensaios ativos com ≥ 1 item vencido",
    unidade: "ensaios",
    fonte: "visit_schedules, calendar_events, tasks",
  },
  ocorrencias_abertas: {
    nome: "Ocorrências abertas",
    definicao: "Ocorrências com situação aberta ou em acompanhamento; o destaque conta as de gravidade alta ou crítica.",
    formula: "contagem de experiment_incidents com status ∈ {aberta, em_acompanhamento}",
    unidade: "ocorrências",
    fonte: "experiment_incidents",
  },
  visitas_proximas: {
    nome: "Visitas agendadas (30 dias)",
    definicao: "Visitas planejadas ou confirmadas com data entre a referência e os próximos 30 dias. Planejada ≠ confirmada ≠ realizada.",
    formula: "contagem de visit_schedules com status ∈ {planejada, confirmada} e data ∈ [referência, referência + 30 dias]",
    unidade: "visitas",
    fonte: "visit_schedules",
  },
  pendencias_abertas: {
    nome: "Pendências abertas",
    definicao: "Atividades ainda não concluídas nem canceladas, com prioridade e prazo.",
    formula: "contagem de tasks com status ∉ {concluida, cancelada}",
    unidade: "pendências",
    fonte: "tasks",
  },
  visitas_realizadas: {
    nome: "Visitas realizadas no período",
    definicao: "Visitas com situação “realizada” cuja data está no intervalo de referência.",
    formula: "contagem de visit_schedules com status = realizada e data ∈ período",
    unidade: "visitas",
    fonte: "visit_schedules",
  },
  visitas_previstas: {
    nome: "Visitas previstas",
    definicao: "Compromissos de visita planejados ou confirmados com data no intervalo. Nunca somados às realizadas.",
    formula: "contagem de visit_schedules com status ∈ {planejada, confirmada} e data ∈ período",
    unidade: "visitas",
    fonte: "visit_schedules",
  },
  cumprimento_visitas: {
    nome: "Taxa de cumprimento de visitas",
    definicao: "Entre as visitas já vencidas (data até a referência), a parcela realizada. Canceladas ficam fora do denominador.",
    formula: "realizadas ÷ (vencidas − canceladas) × 100; sem visitas vencidas = “Dados insuficientes”",
    unidade: "%",
    fonte: "visit_schedules",
  },
  tempo_resolucao: {
    nome: "Tempo de resolução de ocorrências",
    definicao: "Dias entre a detecção e a resolução, só para ocorrências com as duas datas válidas. O tamanho da amostra acompanha o valor.",
    formula: "mediana(resolvida_em − detectada_em) em dias; n = ocorrências válidas",
    unidade: "dias",
    fonte: "experiment_incidents",
  },
  taxa_atualizacao: {
    nome: "Taxa de atualização",
    definicao:
      "Ensaios com atualização devida concluída no mês ÷ ensaios elegíveis com atualização devida no mês. Ensaios encerrados sem obrigação prevista ficam fora (regra do piloto Entomo Agro 360).",
    formula: "atualizados ÷ elegíveis × 100",
    unidade: "%",
    fonte: "experiments, visit_records",
  },
  taxa_aprovacao: {
    nome: "Taxa de aprovação",
    definicao: "Itens liberados na revisão final ÷ itens submetidos à conferência no período, por evento registrado. Itens apenas revisados não contam como liberados.",
    formula: "decisões de revisão final ‘aprovado’ ÷ solicitações de conferência abertas no período",
    unidade: "%",
    fonte: "approval_requests, approval_decisions",
  },
  tempo_decisao: {
    nome: "Tempo entre submissão e decisão",
    definicao: "Dias entre a abertura de uma solicitação de revisão e sua conclusão, apenas com os dois registros de data e hora reais.",
    formula: "mediana(concluida_em − created_at) em dias; n = solicitações concluídas",
    unidade: "dias",
    fonte: "approval_requests",
  },
  economia_tempo: {
    nome: "Simulação de economia de tempo",
    definicao: "Somente no ambiente de demonstração. Hipótese didática calculada das premissas, nunca medição de campo, ROI ou ganho comprovado.",
    formula: "Σ vezes/mês × (min antes − min com Bento); redução = diferença ÷ tempo antes × 100",
    unidade: "min/mês",
    fonte: "demo_time_assumptions",
  },
} as const satisfies Record<string, Metrica>;

export type MetricaKey = keyof typeof METRICAS;
