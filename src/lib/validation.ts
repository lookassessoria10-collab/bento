import { z } from "zod";

// Helpers: campos vazios do formulário viram null (nunca "estimados").
const empty = (v: unknown) => (v === "" || v === undefined ? null : v);

export const optText = (max = 4000) => z.preprocess(empty, z.string().trim().max(max, `Máximo de ${max} caracteres.`).nullable());
export const reqText = (min = 1, max = 400, msg = "Campo obrigatório.") =>
  z.string({ error: msg }).trim().min(min, msg).max(max, `Máximo de ${max} caracteres.`);
export const optDate = z.preprocess(empty, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable());
export const optUuid = z.preprocess(empty, z.string().uuid("Seleção inválida.").nullable());
export const uuid = z.string().uuid("Identificador inválido.");
export const optInt = (min = 0, max = 100000) =>
  z.preprocess((v) => (empty(v) === null ? null : Number(v)), z.number().int("Use número inteiro.").min(min).max(max).nullable());
export const optUrl = z.preprocess(empty, z.string().trim().url("Informe um link válido (https://…).").max(1000).nullable());
/** Coordenada decimal (aceita vírgula). Vazio = não informado. */
export const optCoord = (min: number, max: number, nome: string) =>
  z.preprocess(
    (v) => (empty(v) === null ? null : Number(String(v).trim().replace(",", "."))),
    z.number({ error: `${nome} inválida.` }).min(min, `${nome} fora do intervalo.`).max(max, `${nome} fora do intervalo.`).nullable(),
  );

/** Converte "-12.0841, -45.7953", links do Google Maps (@lat,lng) ou graus/min/seg em decimal. */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const s = input.trim();
  const at = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ?? s.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (at) return check(Number(at[1]), Number(at[2]));
  const dms = [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*°\s*(\d+(?:[.,]\d+)?)?\s*['′]?\s*(\d+(?:[.,]\d+)?)?\s*["″]?\s*([NSLOEW])/gi)];
  if (dms.length === 2) {
    const conv = (m: RegExpMatchArray) => {
      const v = Number(m[1].replace(",", ".")) + Number((m[2] ?? "0").replace(",", ".")) / 60 + Number((m[3] ?? "0").replace(",", ".")) / 3600;
      return /[SOW]/i.test(m[4]) ? -v : v;
    };
    const a = conv(dms[0]);
    const b = conv(dms[1]);
    return /[NS]/i.test(dms[0][4]) ? check(a, b) : check(b, a);
  }
  // "-12.0841, -45.7953" | "-12,0841; -45,7953" | "-12.0841 -45.7953"
  const nums = s.match(/-?\d+(?:[.,]\d+)?/g);
  if (nums && nums.length === 2 && /[;\s]|,\s/.test(s)) return check(Number(nums[0].replace(",", ".")), Number(nums[1].replace(",", ".")));
  return null;
  function check(lat: number, lng: number) {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: round6(lat), lng: round6(lng) } : null;
  }
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const list = z.preprocess(
  (v) =>
    (Array.isArray(v) ? v.join(",") : String(v ?? ""))
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50),
  z.array(z.string().max(120)),
);
export const multi = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(values)));

export const PHASES = ["planejado", "implantacao", "andamento", "concluido", "interrompido"] as const;
export const INFO_STATUS = ["fornecido", "pendente_conferencia", "nao_informado", "a_confirmar"] as const;
export const ACCESS_LEVELS = ["privado_equipe", "colaboradores", "preparado_revisao"] as const;
export const CHANNELS = ["interno", "boletim", "dossie", "instagram", "portal", "outro"] as const;
export const PERIODICIDADES = ["quinzenal", "mensal", "bimestral", "trimestral", "sob_demanda"] as const;

export const experimentSchema = z
  .object({
    titulo: reqText(3, 400, "Informe o título (mínimo 3 caracteres)."),
    titulo_curto: optText(120),
    codigo_institucional: optText(120),
    area_tematica: optText(200),
    linhas_pesquisa: list,
    culturas: list,
    organismos: list,
    alvos_biologicos: list,
    descricao: optText(),
    justificativa: optText(),
    objetivo_geral: optText(),
    objetivos_especificos: optText(),
    palavras_chave: list,
    fonte_cadastro: optText(300),
    informante: optText(300),
    data_informacao: optDate,
    data_conferencia: optDate,
    pesquisador_principal_id: optUuid,
    farm_id: optUuid,
    farm_area_id: optUuid,
    local_descricao: optText(1000),
    latitude: optCoord(-90, 90, "Latitude"),
    longitude: optCoord(-180, 180, "Longitude"),
    coordenadas_fonte: optText(300),
    resumo_metodologico: optText(),
    protocolo_referencia: optText(1000),
    delineamento: optText(500),
    num_repeticoes: optInt(0, 10000),
    unidades_experimentais: optText(500),
    data_inicio: optDate,
    data_termino_prevista: optDate,
    data_termino_efetiva: optDate,
    calendario_avaliacoes: optText(),
    periodicidade_acompanhamento: z.enum(PERIODICIDADES),
    observacoes_escopo: optText(),
    fase: z.enum(PHASES),
    motivo_interrupcao: optText(1000),
    disponibilidade: z.enum(INFO_STATUS),
    nivel_acesso: z.enum(ACCESS_LEVELS),
    acompanhamento_ativo: bool,
  })
  .superRefine((d, ctx) => {
    if ((d.latitude == null) !== (d.longitude == null))
      ctx.addIssue({ code: "custom", path: [d.latitude == null ? "latitude" : "longitude"], message: "Informe latitude e longitude juntas." });
    if (d.fase === "interrompido" && !d.motivo_interrupcao)
      ctx.addIssue({ code: "custom", path: ["motivo_interrupcao"], message: "Informe o motivo da interrupção." });
    if (d.data_inicio && d.data_termino_prevista && d.data_termino_prevista < d.data_inicio)
      ctx.addIssue({ code: "custom", path: ["data_termino_prevista"], message: "Término previsto antes do início." });
    if (d.data_inicio && d.data_termino_efetiva && d.data_termino_efetiva < d.data_inicio)
      ctx.addIssue({ code: "custom", path: ["data_termino_efetiva"], message: "Término efetivo antes do início." });
    if (d.acompanhamento_ativo) {
      if (!d.pesquisador_principal_id)
        ctx.addIssue({ code: "custom", path: ["pesquisador_principal_id"], message: "Obrigatório para ativar o acompanhamento." });
      if (!d.data_inicio) ctx.addIssue({ code: "custom", path: ["data_inicio"], message: "Obrigatório para ativar o acompanhamento." });
      if (!d.objetivo_geral) ctx.addIssue({ code: "custom", path: ["objetivo_geral"], message: "Obrigatório para ativar o acompanhamento." });
    }
  });

export type ExperimentInput = z.infer<typeof experimentSchema>;

export const visitSchema = z.object({
  titulo: reqText(3, 200, "Informe um título para a visita."),
  data_hora: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe data e hora."),
  local: optText(300),
  farm_id: optUuid,
  interlocutores: optText(1000),
  lembrete: optText(1000),
  checklist_template_id: optUuid,
  experiment_ids: z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(uuid).min(1, "Selecione ao menos um experimento.")),
});

export const visitRecordSchema = z.object({
  objetivo: optText(),
  etapa_atual: optText(1000),
  atividades_desde_ultima: optText(),
  avaliacoes_previstas: optText(),
  avaliacoes_realizadas: optText(),
  ocorrencias_relatadas: optText(),
  informante_person_id: optUuid,
  informante_descricao: optText(300),
  observacoes_diretas: optText(),
  resultados_disponibilizados: optText(),
  situacao_analise: z.enum(["nao_disponivel", "em_analise", "preliminar", "final", "nao_informada"]),
  fontes: optText(2000),
  conteudo_potencial: optText(),
  proxima_acao: optText(1000),
  proxima_acao_responsavel: optUuid,
  proxima_acao_prazo: optDate,
});

export const taskSchema = z
  .object({
    titulo: reqText(2, 300, "Informe o título da atividade."),
    descricao: optText(),
    categoria: z.enum(["geral", "articulacao", "registros", "comunicacao", "visita", "revisao", "editorial"]),
    prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
    status: z.enum(["a_fazer", "em_andamento", "aguardando_terceiro", "concluida", "cancelada"]),
    responsavel_id: optUuid,
    colaborador_id: optUuid,
    inicio: optDate,
    prazo: optDate,
    motivo_bloqueio: optText(1000),
    ultimo_contato: optDate,
    experiment_id: optUuid,
    visit_record_id: optUuid,
    editorial_item_id: optUuid,
  })
  .superRefine((d, ctx) => {
    if (d.status === "aguardando_terceiro" && !d.motivo_bloqueio)
      ctx.addIssue({ code: "custom", path: ["motivo_bloqueio"], message: "Informe o que está pendente com terceiros." });
  });

export const resultSchema = z.object({
  experiment_id: uuid,
  variavel: reqText(1, 200, "Informe a variável observada."),
  unidade: optText(60),
  periodo_inicio: optDate,
  periodo_fim: optDate,
  data_referencia: optDate,
  sintese: z.string().trim().max(8000).default(""),
  situacao_analise: z.enum(["nao_disponivel", "em_analise", "preliminar", "final", "nao_informada"]),
  fonte_person_id: optUuid,
  fonte_descricao: optText(500),
  data_fornecimento: optDate,
  referencia: optText(2000),
  link_original: optUrl,
  limitacoes: optText(),
});

export const editorialSchema = z.object({
  tipo: z.enum(["pauta", "instagram", "boletim", "dossie", "relatorio_piloto", "institucional"]),
  titulo: reqText(3, 300, "Informe o título."),
  descricao: optText(),
  objetivo: optText(2000),
  publico: optText(300),
  area_tematica: optText(200),
  canais: multi(CHANNELS),
  formato: optText(60),
  data_sugerida: optDate,
  prazo: optDate,
  responsavel_redacao: optUuid,
  revisor_cientifico: optUuid,
  revisor_final: optUuid,
  pesquisador_person_id: optUuid,
  requer_validacao_cientifica: bool,
  labels: list,
});
