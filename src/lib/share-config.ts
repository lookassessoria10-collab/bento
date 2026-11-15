// Compartilhamento externo: constantes, modelos de público e esquema de configuração (sem criptografia;
// pode ser importado por componentes cliente). Tokens e senhas ficam em src/lib/share.ts (somente servidor).
import { z } from "zod";

export const SHARE_PUBLICOS = {
  gestor_fazenda: { label: "Gestor de fazenda", desc: "Visão executiva: cronograma, riscos, pendências e marcos." },
  coordenador_pesquisa: { label: "Coordenador de pesquisa", desc: "Portfólio, acompanhamento, metodologia resumida e status documental." },
  instituicao_parceira: { label: "Instituição parceira", desc: "Projetos autorizados, progresso e entregas, sem dados privados." },
  demonstracao_comercial: { label: "Demonstração comercial", desc: "Somente a organização de demonstração, com aviso de dados simulados em todas as telas." },
} as const;
export type SharePublico = keyof typeof SHARE_PUBLICOS;

export const SHARE_SECOES = {
  indicadores: "Indicadores gerais",
  graficos: "Gráficos de portfólio e visitas",
  calendario: "Próximos compromissos (somente data e situação)",
  ocorrencias: "Ocorrências resumidas",
  resultados: "Resultados expressamente autorizados",
  documentos: "Documentos expressamente liberados (lista, sem download)",
  impressao: "Permitir imprimir/salvar o painel em PDF",
  economia: "Simulação de economia de tempo (somente demonstração)",
  apresentacao: "Apresentação curta da plataforma (somente demonstração)",
} as const;
export type ShareSecao = keyof typeof SHARE_SECOES;
export const DEMO_ONLY_SECOES: ShareSecao[] = ["economia", "apresentacao"];

export const SHARE_TEMPLATES: Record<SharePublico, ShareSecao[]> = {
  gestor_fazenda: ["indicadores", "graficos", "calendario", "ocorrencias"],
  coordenador_pesquisa: ["indicadores", "graficos", "calendario", "ocorrencias", "documentos"],
  instituicao_parceira: ["indicadores", "graficos", "documentos"],
  demonstracao_comercial: ["indicadores", "graficos", "calendario", "ocorrencias", "resultados", "economia", "apresentacao"],
};

const iso = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());
export const shareConfigSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe um título.").max(120),
    subtitulo: z.string().trim().max(200).default(""),
    secoes: z.array(z.enum(Object.keys(SHARE_SECOES) as [ShareSecao, ...ShareSecao[]])).min(1, "Escolha ao menos uma seção."),
    experimentos: z.array(z.string().uuid()).max(500).default([]),
    de: iso.default(null),
    ate: iso.default(null),
  })
  .refine((c) => !c.de || !c.ate || c.de <= c.ate, { message: "Período inválido.", path: ["ate"] });
export type ShareConfig = z.infer<typeof shareConfigSchema>;

/** Seções efetivas: as de demonstração somem fora da organização demo, por mais que estejam salvas. */
export function effectiveSections(cfg: ShareConfig, isDemoOrg: boolean): ShareSecao[] {
  return cfg.secoes.filter((s) => isDemoOrg || !DEMO_ONLY_SECOES.includes(s));
}
