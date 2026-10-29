// Formato do snapshot imutável gerado por private.build_snapshot (editorial_versions.content).

export interface SnapExperiment {
  id: string;
  codigo: string;
  codigo_institucional: string | null;
  titulo: string;
  titulo_curto: string | null;
  area_tematica: string | null;
  culturas: string[];
  organismos: string[];
  objetivo_geral: string | null;
  resumo_metodologico: string | null;
  delineamento: string | null;
  data_inicio: string | null;
  data_termino_prevista: string | null;
  data_termino_efetiva: string | null;
  fase: string;
  pesquisador: string | null;
  fazenda: string | null;
  area: string | null;
  fonte_cadastro: string | null;
  data_informacao: string | null;
  disponibilidade: string;
  is_demo: boolean;
  results?: SnapResult[];
  files?: SnapFile[];
}

export interface SnapResult {
  id: string;
  experiment_id: string;
  variavel: string;
  unidade: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  data_referencia: string | null;
  sintese: string;
  situacao_analise: string;
  limitacoes: string | null;
  fonte: string | null;
  referencia: string | null;
  data_fornecimento: string | null;
  versao_interpretacao: number;
  validacao_status: string;
  escopo_divulgacao: string[];
  is_demo: boolean;
}

export interface SnapFile {
  id: string;
  nome: string;
  tipo: string;
  legenda: string | null;
  autoria: string | null;
  data_arquivo: string | null;
  licenca: string | null;
  autorizacao_uso: string;
  autorizacao_canais: string[];
  storage_path: string | null;
  mime_type: string | null;
  external_url: string | null;
}

export interface SnapSource {
  experiment_id: string | null;
  result_id: string | null;
  file_id: string | null;
  referencia: string | null;
  experiment: SnapExperiment | null;
  result: SnapResult | null;
  file: SnapFile | null;
}

export interface DraftBlock {
  tipo: "paragrafo" | "titulo" | "citacao" | "lista";
  texto: string;
}

export interface SnapshotContent {
  item_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  publico: string | null;
  area_tematica: string | null;
  canais: string[];
  formato: string | null;
  requer_validacao_cientifica: boolean;
  draft: { blocks: DraftBlock[]; instagram?: InstagramDraft; relatorio?: Record<string, string> };
  sources: SnapSource[];
  is_demo: boolean;
  bulletin?: {
    numero: number;
    volume: string | null;
    periodo_inicio: string | null;
    periodo_fim: string | null;
    data_prevista: string | null;
    data_fechamento: string | null;
    equipe_editorial: string | null;
    apresentacao: string | null;
    capa: SnapFile | null;
    sections: {
      id: string;
      ordem: number;
      tipo: string;
      titulo: string;
      corpo: string;
      referencias: string | null;
      experiment: SnapExperiment | null;
      results: SnapResult[];
      files: SnapFile[];
    }[];
  };
  dossier?: {
    periodo_inicio: string | null;
    periodo_fim: string | null;
    finalidade: "interno" | "divulgacao";
    apresentacao: string | null;
    escopo: string | null;
    criterios_inclusao: string | null;
    metodo_coleta: string | null;
    sintese: string | null;
    referencias: string | null;
    experiments: SnapExperiment[];
  };
  __hash?: string;
}

export interface InstagramDraft {
  texto_card?: string;
  legenda?: string;
  cta?: string;
  hashtags?: string;
  referencias?: string;
  creditos?: string;
}

/** Remove do conteúdo público tudo que não precisa sair: ids internos e caminhos de armazenamento. */
export function publicView(c: SnapshotContent) {
  const stripFile = (f: SnapFile | null) => (f ? { nome: f.nome, legenda: f.legenda, autoria: f.autoria, licenca: f.licenca } : null);
  return {
    titulo: c.titulo,
    descricao: c.descricao,
    tipo: c.tipo,
    blocks: c.draft?.blocks ?? [],
    bulletin: c.bulletin && {
      numero: c.bulletin.numero,
      periodo_inicio: c.bulletin.periodo_inicio,
      periodo_fim: c.bulletin.periodo_fim,
      apresentacao: c.bulletin.apresentacao,
      sections: c.bulletin.sections.map((s) => ({ titulo: s.titulo, corpo: s.corpo, referencias: s.referencias, files: s.files.map(stripFile) })),
    },
  };
}

/** Seções preenchíveis do relatório final do piloto. */
export const REPORT_FIELDS: [string, string][] = [
  ["entregas", "Entregas realizadas"],
  ["dificuldades", "Dificuldades"],
  ["participacao_publico", "Participação do público"],
  ["aprendizados", "Aprendizados"],
  ["limitacoes", "Limitações"],
  ["recomendacoes", "Recomendações de continuidade"],
  ["revisao", "Assinatura / revisão"],
  ["anexos", "Anexos"],
];

