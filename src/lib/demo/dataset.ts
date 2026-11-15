// Pacote de demonstração (dados 100% sintéticos): validação do JSON canônico e mapeamento para as
// tabelas reais do Bento. Módulo puro — usado pelo importador administrativo e pelos testes.
// Identificadores são determinísticos (derivados de chaves estáveis), o que torna a importação idempotente.
import { createHash } from "node:crypto";
import { z } from "zod";

export const DEMO_DATA_TYPE = "DADOS_TOTALMENTE_SINTETICOS";
export const DEMO_WARNING = "DADOS SIMULADOS — ambiente de demonstração do Bento. Não são medições, resultados, pessoas ou aprovações reais.";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data AAAA-MM-DD");
const text = z.string().trim().min(1);

const measurement = z.object({
  variable: text,
  value: z.number().finite().nullable(),
  unit: text,
  source: text,
  missingReason: z.string().nullable(),
});
const visit = z.object({
  recordId: text,
  date,
  stage: text,
  observer: text,
  activity: text,
  researcherInput: text,
  directObservation: text,
  measurements: z.array(measurement),
  issueIds: z.array(text),
  nextAction: text,
  reviewStatus: z.enum(["revisado_demo", "em_conferencia_demo"]),
});
const incident = z.object({
  incidentId: text,
  title: text,
  severity: z.enum(["baixa", "media", "alta", "critica"]),
  detectedAt: date,
  description: text,
  consequence: text,
  actionTaken: text,
  status: z.enum(["aberta", "resolvida"]),
  resolvedAt: date.nullable(),
  demonstrative: z.literal(true),
});
const plotReading = z.object({
  plotId: text,
  treatment: text,
  block: z.number().int(),
  variable: text,
  value: z.number().finite(),
  unit: text,
  date,
  dataNature: z.literal("sintetico_sem_teste_estatistico"),
});
const task = z.object({
  title: text,
  status: z.enum(["concluida", "concluida_demo", "em_andamento", "pendente"]),
  dueDate: date,
  assignee: text,
});
const file = z.object({
  filename: z.string().regex(/^[A-Za-z0-9._-]+\.txt$/, "arquivo .txt com nome seguro"),
  contentType: z.literal("text/plain"),
  description: text,
  visibility: z.literal("privado_demo"),
});
const experiment = z.object({
  code: z.string().regex(/^DEMO-EA360-\d{3}$/),
  title: text,
  culture: text,
  researchAxis: text,
  status: z.enum(["concluido", "em_andamento", "interrompido", "planejado"]),
  startDate: date,
  expectedEndDate: date,
  sector: text,
  location: text,
  responsible: text,
  researchTeam: z.array(text).min(1),
  objective: text,
  methodology: text,
  treatments: z.array(text).min(1),
  replicates: z.number().int().positive(),
  expectedPlots: z.number().int().positive(),
  currentStage: text,
  dataSource: text,
  createdBy: text,
  demoOnly: z.literal(true),
  publicationAllowed: z.literal(false),
  visits: z.array(visit),
  incidents: z.array(incident),
  plotReadings: z.array(plotReading),
  tasks: z.array(task),
  files: z.array(file),
  scientificReview: z.object({
    status: z.enum(["revisado_demo", "nao_liberado"]),
    reviewer: text,
    reviewedAt: date.nullable(),
    publicDisclosure: z.literal(false),
    disclaimer: text,
  }),
  resultSummary: text,
});

export const demoDatasetSchema = z.object({
  dataType: z.literal(DEMO_DATA_TYPE),
  schemaVersion: z.string(),
  asOfDate: date,
  demoOrganization: z.object({
    slug: z.string().regex(/^[a-z0-9-]{2,60}$/).refine((s) => s.endsWith("-demo"), "slug da demonstração deve terminar em -demo"),
    name: text,
    city: text,
    state: z.string().regex(/^[A-Z]{2}$/),
    fictional: z.literal(true),
    affiliationDisclaimer: text,
  }),
  importantNotices: z.array(text),
  timeEconomyModel: z.object({
    source: text,
    measuredInRealDeployment: z.literal(false),
    measurementMethod: text,
    items: z
      .array(z.object({ activity: text, eventsPerMonth: z.number().nonnegative(), legacyMinutesEach: z.number().nonnegative(), bentoMinutesEach: z.number().nonnegative() }))
      .min(1),
    totals: z.object({ legacyMinutesPerMonth: z.number(), bentoMinutesPerMonth: z.number(), savedMinutesPerMonth: z.number(), savedPercent: z.number() }),
    costEstimatePerHourBRL: z.null(),
    mayNotDescribeAsActualResult: z.literal(true),
  }),
  editorialExamples: z.array(
    z.object({ edition: text, period: text, status: z.enum(["rascunho_demo", "revisado_demo"]), featuredTrialCodes: z.array(text), publicDisclosure: z.literal(false), text }),
  ),
  experiments: z.array(experiment).min(1),
  expectedCounts: z.object({
    portfolioCount: z.number().int(),
    visits: z.number().int(),
    measurements: z.number().int(),
    incidents: z.number().int(),
    plots: z.number().int(),
    statuses: z.object({ concluido: z.number().int(), em_andamento: z.number().int(), interrompido: z.number().int(), planejado: z.number().int() }),
  }),
});
export type DemoDataset = z.infer<typeof demoDatasetSchema>;
export type DemoExperiment = DemoDataset["experiments"][number];

export interface DemoCounts {
  portfolioCount: number;
  visits: number;
  measurements: number;
  incidents: number;
  plots: number;
  statuses: Record<DemoExperiment["status"], number>;
}

export function countDataset(d: DemoDataset): DemoCounts {
  const statuses = { concluido: 0, em_andamento: 0, interrompido: 0, planejado: 0 };
  for (const e of d.experiments) statuses[e.status]++;
  return {
    portfolioCount: d.experiments.length,
    visits: d.experiments.reduce((n, e) => n + e.visits.length, 0),
    measurements: d.experiments.reduce((n, e) => n + e.visits.reduce((m, v) => m + v.measurements.length, 0), 0),
    incidents: d.experiments.reduce((n, e) => n + e.incidents.length, 0),
    plots: d.experiments.reduce((n, e) => n + e.plotReadings.length, 0),
    statuses,
  };
}

/**
 * Valida estrutura e coerência antes de qualquer escrita. Rejeita o pacote inteiro se houver erro:
 * contagens divergentes de expectedCounts, chaves duplicadas, datas futuras registradas como realizadas,
 * valores ausentes sem justificativa, ocorrências apontando para ensaio errado etc.
 */
export function parseDemoDataset(raw: unknown): { data: DemoDataset; errors: string[] } | { data: null; errors: string[] } {
  const parsed = demoDatasetSchema.safeParse(raw);
  if (!parsed.success) {
    return { data: null, errors: parsed.error.issues.slice(0, 30).map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const d = parsed.data;
  const errors: string[] = [];
  const asOf = d.asOfDate;
  const seen = new Set<string>();
  const unique = (k: string) => {
    if (seen.has(k)) errors.push(`chave duplicada: ${k}`);
    seen.add(k);
  };
  for (const e of d.experiments) {
    unique(e.code);
    if (e.expectedEndDate < e.startDate) errors.push(`${e.code}: término previsto antes do início`);
    if (e.status === "planejado" && (e.visits.length || e.plotReadings.length)) errors.push(`${e.code}: ensaio planejado não pode ter visitas ou leituras`);
    if (e.status !== "concluido" && e.plotReadings.length) errors.push(`${e.code}: leituras finais por parcela só em ensaios concluídos`);
    if (e.status === "interrompido" && !e.incidents.length) errors.push(`${e.code}: interrupção exige ocorrência que a explique`);
    const incIds = new Set(e.incidents.map((i) => i.incidentId));
    for (const v of e.visits) {
      unique(v.recordId);
      if (!v.recordId.startsWith(`${e.code}-`)) errors.push(`${v.recordId}: visita vinculada ao ensaio errado`);
      if (v.date > asOf) errors.push(`${v.recordId}: visita datada após ${asOf} não pode constar como realizada`);
      if (v.date < e.startDate) errors.push(`${v.recordId}: visita antes do início do ensaio`);
      for (const m of v.measurements) {
        if (m.value === null && !m.missingReason?.trim()) errors.push(`${v.recordId}/${m.variable}: valor ausente sem justificativa`);
      }
      for (const id of v.issueIds) if (!incIds.has(id)) errors.push(`${v.recordId}: ocorrência ${id} não pertence ao ensaio`);
    }
    for (const i of e.incidents) {
      unique(i.incidentId);
      if (i.detectedAt > asOf) errors.push(`${i.incidentId}: ocorrência detectada no futuro`);
      if (i.status === "resolvida" && (!i.resolvedAt || i.resolvedAt < i.detectedAt || i.resolvedAt > asOf)) errors.push(`${i.incidentId}: data de resolução inválida`);
      if (i.status === "aberta" && i.resolvedAt) errors.push(`${i.incidentId}: ocorrência aberta com data de resolução`);
    }
    for (const p of e.plotReadings) {
      unique(`${p.plotId}|${p.variable}`);
      if (p.date > asOf) errors.push(`${p.plotId}: leitura no futuro`);
    }
    for (const t of e.tasks) {
      if (t.status.startsWith("concluida") && t.dueDate > asOf) errors.push(`${e.code}/${t.title}: tarefa futura marcada como concluída`);
    }
    for (const f of e.files) unique(`file:${f.filename}`);
  }
  const c = countDataset(d);
  const x = d.expectedCounts;
  const cmp: [string, number, number][] = [
    ["experimentos", c.portfolioCount, x.portfolioCount],
    ["visitas", c.visits, x.visits],
    ["medições", c.measurements, x.measurements],
    ["ocorrências", c.incidents, x.incidents],
    ["leituras por parcela", c.plots, x.plots],
    ...(Object.keys(c.statuses) as DemoExperiment["status"][]).map((s) => [`status ${s}`, c.statuses[s], x.statuses[s]] as [string, number, number]),
  ];
  for (const [k, got, want] of cmp) if (got !== want) errors.push(`contagem de ${k}: ${got} no arquivo, ${want} em expectedCounts`);
  return errors.length ? { data: null, errors } : { data: d, errors: [] };
}

/** UUID determinístico (formato v5) a partir de uma chave estável do pacote de demonstração. */
export function demoUuid(key: string): string {
  const h = createHash("sha1").update(`bento-demo:v1:${key}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

const PHASE = { concluido: "concluido", em_andamento: "andamento", interrompido: "interrompido", planejado: "planejado" } as const;
const TASK_STATUS = { concluida: "concluida", concluida_demo: "concluida", em_andamento: "em_andamento", pendente: "a_fazer" } as const;
const RECORD_STATUS = { revisado_demo: "conferida", em_conferencia_demo: "preenchida" } as const;
const noon = (d: string) => `${d}T12:00:00-03:00`;

function personKind(nome: string) {
  if (/^pesquisador/i.test(nome)) return "pesquisador" as const;
  if (/^t[ée]cnico/i.test(nome)) return "tecnico" as const;
  return "outro" as const;
}

export function demoFileContent(d: DemoDataset, e: DemoExperiment, f: DemoExperiment["files"][number]): string {
  const lines = [
    "=====================================================================",
    "  DADOS SIMULADOS — AMBIENTE DE DEMONSTRAÇÃO DO BENTO",
    "  Documento fictício gerado pelo importador. Não é protocolo, relatório",
    "  ou registro real de nenhuma instituição, fazenda ou pesquisador.",
    "=====================================================================",
    "",
    `Unidade: ${d.demoOrganization.name} (fictícia)`,
    `Ensaio: ${e.code} — ${e.title}`,
    `Cultura: ${e.culture} · Área: ${e.researchAxis} · ${e.sector}`,
    `Responsável (fictício): ${e.responsible}`,
    `Descrição do arquivo: ${f.description}`,
    "",
  ];
  if (/protocolo/i.test(f.filename)) {
    lines.push(
      "OBJETIVO",
      e.objective,
      "",
      "METODOLOGIA (ilustrativa)",
      e.methodology,
      `Repetições: ${e.replicates} · Parcelas previstas: ${e.expectedPlots}`,
      "",
      "TRATAMENTOS (ilustrativos)",
      ...e.treatments.map((t, i) => `  T${i + 1}: ${t}`),
      "",
      `Período previsto: ${e.startDate} a ${e.expectedEndDate}`,
    );
  } else {
    lines.push(
      "RESUMO NARRATIVO (sintético)",
      e.resultSummary,
      "",
      "VISITAS REGISTRADAS",
      ...(e.visits.length ? e.visits.map((v) => `  ${v.date} · ${v.stage} · ${v.activity}`) : ["  Nenhuma visita registrada até a data de referência."]),
      "",
      "OCORRÊNCIAS",
      ...(e.incidents.length ? e.incidents.map((i) => `  ${i.detectedAt} · ${i.title} (${i.status})`) : ["  Nenhuma ocorrência registrada."]),
    );
  }
  lines.push("", `Data de referência dos dados: ${d.asOfDate}`, `Fonte: ${e.dataSource}`, "", DEMO_WARNING, "");
  return lines.join("\n");
}

/** Converte o pacote nas linhas das tabelas reais, todas vinculadas à organização de demonstração. */
export function buildDemoRows(d: DemoDataset, orgId: string) {
  const org = orgId;
  const base = { organization_id: org, is_demo: true };
  const lastVisit = (e: DemoExperiment) => e.visits[e.visits.length - 1]?.date ?? null;

  const names = new Set<string>();
  for (const e of d.experiments) {
    names.add(e.responsible);
    e.researchTeam.forEach((n) => names.add(n));
  }
  const personId = (nome: string) => demoUuid(`person:${nome}`);
  const people = [...names].sort().map((nome) => ({
    ...base,
    id: personId(nome),
    nome,
    tipo: personKind(nome),
    instituicao: `${d.demoOrganization.name} (fictícia)`,
    situacao: "confirmado" as const,
    observacoes: "Pessoa fictícia criada para a demonstração. Não corresponde a ninguém real.",
  }));

  const farmId = demoUuid("farm:principal");
  const farms = [
    {
      organization_id: org,
      id: farmId,
      nome: `${d.demoOrganization.name} (fictícia)`,
      municipio: d.demoOrganization.city,
      uf: d.demoOrganization.state,
      descricao: d.demoOrganization.affiliationDisclaimer,
      adesao_formal: false,
    },
  ];
  const sectors = [...new Set(d.experiments.map((e) => e.sector))].sort();
  const areaId = (s: string) => demoUuid(`area:${s}`);
  const farm_areas = sectors.map((s) => ({ organization_id: org, id: areaId(s), farm_id: farmId, nome: s, tipo: "setor" as const, descricao: "Setor fictício da unidade de demonstração." }));

  const expId = (code: string) => demoUuid(`exp:${code}`);
  const experiments = d.experiments.map((e) => {
    const interrupted = e.status === "interrompido";
    return {
      ...base,
      id: expId(e.code),
      codigo: e.code,
      codigo_institucional: e.code,
      titulo: e.title,
      area_tematica: e.researchAxis,
      culturas: [e.culture.toLowerCase()],
      objetivo_geral: e.objective,
      resumo_metodologico: e.methodology,
      delineamento: e.methodology.split(";")[0].trim(),
      num_repeticoes: e.replicates,
      unidades_experimentais: `${e.expectedPlots} parcelas previstas`,
      data_inicio: e.startDate,
      data_termino_prevista: e.expectedEndDate,
      // término efetivo não é informado no pacote: fica vazio (sem inventar data de encerramento)
      data_termino_efetiva: null,
      fase: PHASE[e.status],
      motivo_interrupcao: interrupted ? e.incidents.map((i) => `${i.title}: ${i.description}`).join(" ") : null,
      disponibilidade: "fornecido" as const,
      nivel_acesso: "colaboradores" as const,
      acompanhamento_ativo: e.status === "em_andamento",
      pesquisador_principal_id: personId(e.responsible),
      farm_id: farmId,
      farm_area_id: areaId(e.sector),
      local_descricao: e.location,
      fonte_cadastro: e.dataSource,
      informante: e.createdBy,
      data_informacao: d.asOfDate,
      periodicidade_acompanhamento: "mensal" as const,
      observacoes_escopo: DEMO_WARNING,
      demo_meta: {
        dataType: d.dataType,
        asOfDate: d.asOfDate,
        currentStage: e.currentStage,
        expectedPlots: e.expectedPlots,
        researchTeam: e.researchTeam,
        scientificReview: e.scientificReview,
        resultSummary: e.resultSummary,
        publicationAllowed: false,
        lastVisit: lastVisit(e),
      },
    };
  });

  const experiment_treatments = d.experiments.flatMap((e) =>
    e.treatments.map((t, i) => ({ organization_id: org, id: demoUuid(`trt:${e.code}:${i}`), experiment_id: expId(e.code), codigo: `T${i + 1}`, descricao: t, fonte: "Tratamento ilustrativo (dados sintéticos)", ordem: i })),
  );

  const experiment_members = d.experiments.flatMap((e) =>
    [...new Set(e.researchTeam)].map((nome) => ({
      organization_id: org,
      id: demoUuid(`member:${e.code}:${nome}`),
      experiment_id: expId(e.code),
      person_id: personId(nome),
      acesso: nome === e.responsible ? ("proprietario" as const) : ("colaborador" as const),
      funcao: nome === e.responsible ? ("pesquisador_principal" as const) : ("equipe_tecnica" as const),
      ativo: true,
    })),
  );

  const visitId = (rid: string) => demoUuid(`visit:${rid}`);
  const recordId = (rid: string) => demoUuid(`record:${rid}`);
  const visit_schedules = d.experiments.flatMap((e) =>
    e.visits.map((v) => ({
      ...base,
      id: visitId(v.recordId),
      titulo: `Visita ${e.code} · ${v.stage}`,
      data_hora: noon(v.date),
      local: e.sector,
      farm_id: farmId,
      interlocutores: v.observer,
      status: "realizada" as const,
    })),
  );
  const visit_schedule_experiments = d.experiments.flatMap((e) => e.visits.map((v) => ({ organization_id: org, visit_id: visitId(v.recordId), experiment_id: expId(e.code) })));
  const visit_records = d.experiments.flatMap((e) =>
    e.visits.map((v) => ({
      ...base,
      id: recordId(v.recordId),
      visit_id: visitId(v.recordId),
      experiment_id: expId(e.code),
      etapa_atual: v.stage,
      avaliacoes_realizadas: v.activity,
      ocorrencias_relatadas: v.researcherInput,
      informante_descricao: `${e.responsible} (fictício)`,
      observacoes_diretas: v.directObservation,
      fontes: `Observação registrada por ${v.observer} (pessoa fictícia). ${e.dataSource}`,
      proxima_acao: v.nextAction,
      status: RECORD_STATUS[v.reviewStatus],
      conferido_em: v.reviewStatus === "revisado_demo" ? noon(v.date) : null,
      comentario_conferencia: v.reviewStatus === "revisado_demo" ? "Conferência simulada (revisado_demo). Não é conferência real." : null,
    })),
  );

  const experiment_measurements = d.experiments.flatMap((e) =>
    e.visits.flatMap((v) =>
      v.measurements.map((m, i) => ({
        ...base,
        id: demoUuid(`meas:${v.recordId}:${m.variable}`),
        experiment_id: expId(e.code),
        visit_record_id: recordId(v.recordId),
        data_medicao: v.date,
        variavel: m.variable,
        valor: m.value,
        unidade: m.unit,
        fonte: m.source,
        motivo_ausencia: m.value === null ? m.missingReason : null,
        ordem: i,
      })),
    ),
  );

  const recordOfIncident = new Map<string, string>();
  for (const e of d.experiments) for (const v of e.visits) for (const id of v.issueIds) recordOfIncident.set(id, recordId(v.recordId));
  const experiment_incidents = d.experiments.flatMap((e) =>
    e.incidents.map((i) => ({
      ...base,
      id: demoUuid(`incident:${i.incidentId}`),
      experiment_id: expId(e.code),
      visit_record_id: recordOfIncident.get(i.incidentId) ?? null,
      titulo: i.title,
      gravidade: i.severity,
      detectada_em: i.detectedAt,
      descricao: i.description,
      consequencia: i.consequence,
      providencia: i.actionTaken,
      // o pacote não traz responsável nem próxima verificação: ficam vazios (a interface diz "Não informado")
      responsavel_descricao: null,
      proxima_verificacao: null,
      status: i.status,
      resolvida_em: i.resolvedAt,
    })),
  );

  const experiment_plot_readings = d.experiments.flatMap((e) =>
    e.plotReadings.map((p) => ({
      ...base,
      id: demoUuid(`plot:${p.plotId}:${p.variable}`),
      experiment_id: expId(e.code),
      parcela: p.plotId,
      tratamento: p.treatment,
      bloco: p.block,
      variavel: p.variable,
      valor: p.value,
      unidade: p.unit,
      data_leitura: p.date,
      natureza: p.dataNature,
    })),
  );

  const tasks = d.experiments.flatMap((e) =>
    e.tasks.map((t, i) => ({
      ...base,
      id: demoUuid(`task:${e.code}:${i}`),
      titulo: t.title,
      descricao: `Responsável (fictício): ${t.assignee}.${t.status === "concluida_demo" ? " Conclusão simulada para a demonstração." : ""}`,
      categoria: /validar|revis/i.test(t.title) ? ("revisao" as const) : ("registros" as const),
      prioridade: "media" as const,
      status: TASK_STATUS[t.status],
      prazo: t.dueDate,
      concluida_em: TASK_STATUS[t.status] === "concluida" ? noon(t.dueDate) : null,
      experiment_id: expId(e.code),
      origem: "manual" as const,
    })),
  );

  const files = d.experiments.flatMap((e) =>
    e.files.map((f) => {
      const content = demoFileContent(d, e, f);
      return {
        row: {
          ...base,
          id: demoUuid(`file:${f.filename}`),
          storage_path: `${org}/demo/${e.code}/${f.filename}`,
          nome_amigavel: `${/protocolo/i.test(f.filename) ? "Protocolo" : "Resumo"} demonstrativo — ${e.code}`,
          nome_original: f.filename,
          mime_type: "text/plain",
          tamanho_bytes: Buffer.byteLength(content, "utf8"),
          tipo: /protocolo/i.test(f.filename) ? ("protocolo" as const) : ("relatorio" as const),
          autoria: e.createdBy,
          origem: "Gerado pelo importador da demonstração (arquivo fictício)",
          data_arquivo: /protocolo/i.test(f.filename) ? e.startDate : (lastVisit(e) ?? d.asOfDate),
          legenda: f.description,
          autorizacao_uso: "uso_interno" as const,
          experiment_id: expId(e.code),
        },
        content,
      };
    }),
  );

  const editorial_items = d.editorialExamples.map((x) => ({
    ...base,
    id: demoUuid(`editorial:${x.edition}`),
    tipo: "boletim" as const,
    titulo: `${x.edition} (demonstração)`,
    descricao: `${x.text} Período: ${x.period}. Estado simulado: ${x.status}. ${DEMO_WARNING}`,
    canais: ["interno" as const],
    labels: ["demonstracao", x.status],
    status: "rascunho" as const,
  }));
  const editorial_sources = d.editorialExamples.flatMap((x) =>
    x.featuredTrialCodes.map((code) => ({ organization_id: org, id: demoUuid(`edsrc:${x.edition}:${code}`), item_id: demoUuid(`editorial:${x.edition}`), experiment_id: expId(code) })),
  );

  const demo_time_assumptions = d.timeEconomyModel.items.map((t, i) => ({
    organization_id: org,
    id: demoUuid(`time:${t.activity}`),
    ordem: i,
    atividade: t.activity,
    eventos_mes: t.eventsPerMonth,
    minutos_antes: t.legacyMinutesEach,
    minutos_bento: t.bentoMinutesEach,
    premissa: d.timeEconomyModel.source,
  }));

  return {
    people,
    farms,
    farm_areas,
    experiments,
    experiment_treatments,
    experiment_members,
    visit_schedules,
    visit_schedule_experiments,
    visit_records,
    experiment_measurements,
    experiment_incidents,
    experiment_plot_readings,
    tasks,
    files,
    editorial_items,
    editorial_sources,
    demo_time_assumptions,
  };
}
export type DemoRows = ReturnType<typeof buildDemoRows>;
