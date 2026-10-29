// Rótulos em português para os valores enumerados do banco.

export const PHASE_LABELS = {
  implantacao: "Em implantação",
  andamento: "Em andamento",
  concluido: "Concluído",
  interrompido: "Interrompido",
} as const;

export const INFO_STATUS_LABELS = {
  fornecido: "Fornecido",
  pendente_conferencia: "Pendente de conferência",
  nao_informado: "Não informado",
  a_confirmar: "A confirmar",
} as const;

export const ACCESS_LEVEL_LABELS = {
  privado_equipe: "Privado (gestão e membros do experimento)",
  colaboradores: "Equipe e colaboradores autorizados",
  preparado_revisao: "Preparado para revisão",
} as const;

export const EXPERIMENT_ACCESS_LABELS = {
  proprietario: "Proprietário (responsável)",
  colaborador: "Colaborador",
  revisor: "Revisor delegado",
  visualizador: "Visualizador",
} as const;

export const VISIT_STATUS_LABELS = {
  planejada: "Planejada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  adiada: "Adiada",
  cancelada: "Cancelada",
} as const;

export const RECORD_STATUS_LABELS = {
  rascunho: "Em preenchimento",
  preenchida: "Aguardando conferência",
  conferida: "Conferida",
  devolvida: "Devolvida",
  finalizada: "Finalizada",
} as const;

export const ANALYSIS_LABELS = {
  nao_disponivel: "Não disponível",
  em_analise: "Em análise",
  preliminar: "Preliminar",
  final: "Final",
  nao_informada: "Não informada",
} as const;

export const TASK_STATUS_LABELS = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  aguardando_terceiro: "Aguardando terceiro",
  concluida: "Concluída",
  cancelada: "Cancelada",
} as const;

export const PRIORITY_LABELS = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" } as const;

export const TASK_CATEGORY_LABELS = {
  geral: "Geral",
  articulacao: "Articulação",
  registros: "Registros",
  comunicacao: "Comunicação",
  visita: "Visita",
  revisao: "Revisão",
  editorial: "Editorial",
} as const;

export const CHANNEL_LABELS = {
  interno: "Uso interno",
  boletim: "Boletim",
  dossie: "Dossiê",
  instagram: "Instagram",
  portal: "Portal público",
  outro: "Outro",
} as const;

export const EDITORIAL_KIND_LABELS = {
  pauta: "Pauta / conteúdo",
  instagram: "Instagram",
  boletim: "Boletim",
  dossie: "Dossiê",
  relatorio_piloto: "Relatório do piloto",
  institucional: "Institucional",
} as const;

export const FILE_KIND_LABELS = {
  foto: "Fotografia",
  relatorio: "Relatório",
  planilha: "Planilha",
  protocolo: "Protocolo",
  mapa: "Mapa",
  documento_institucional: "Documento institucional",
  autorizacao: "Autorização",
  material_editorial: "Material editorial",
  pdf_boletim: "PDF de boletim",
  dossie: "Dossiê",
  referencia_externa: "Referência externa",
} as const;

export const USE_AUTH_LABELS = {
  nao_autorizado: "Não autorizado",
  uso_interno: "Somente uso interno",
  divulgacao_autorizada: "Divulgação autorizada",
} as const;

export const INSTITUTIONAL_LABELS = {
  em_alinhamento: "Em alinhamento",
  parcialmente_autorizado: "Parcialmente autorizado",
  autorizado: "Autorizado",
  suspenso: "Suspenso",
  negado: "Negado",
  expirado: "Expirado",
} as const;

export const AUTH_TYPE_LABELS = {
  adesao_fazenda: "Adesão da fazenda",
  uso_marca_fazenda: "Uso da marca da fazenda",
  uso_marca_instituicao: "Uso da marca da instituição",
  credenciamento_extensao: "Credenciamento como extensão",
  autorizacao_publicacao: "Autorização de publicação",
  acesso_base_original: "Acesso à base original",
  outro: "Outro",
} as const;

export const FRONT_LABELS = {
  articulacao: "Articulação",
  registros: "Registros",
  comunicacao: "Comunicação",
} as const;

export const BULLETIN_SECTION_LABELS = {
  apresentacao: "Apresentação da edição",
  panorama: "Panorama dos experimentos",
  destaque: "Pesquisa em destaque",
  resultados: "Resultados disponíveis",
  entomologia: "Entomologia em foco",
  agenda: "Agenda e interação",
  creditos: "Créditos, fontes e referências",
  livre: "Seção livre",
} as const;

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined): string {
  if (!key) return "Não informado";
  return (map as Record<string, string>)[key] ?? key;
}
