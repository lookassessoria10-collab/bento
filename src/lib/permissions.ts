// Matriz central de permissões por papel na organização.
// Espelha as funções private.* do banco (RLS); o banco é a barreira definitiva.
// Permissões por experimento (proprietário, colaborador, revisor, visualizador) complementam esta matriz.

export const ROLES = ["admin", "coordenacao", "pesquisador", "estudante", "editor", "leitor"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador do sistema",
  coordenacao: "Coordenação / Orientador",
  pesquisador: "Pesquisador responsável",
  estudante: "Estudante / Equipe executora",
  editor: "Editor / Revisor designado",
  leitor: "Leitor interno",
};

const TEAM: Role[] = ["admin", "coordenacao", "estudante", "editor"];
const INTERNAL: Role[] = ["admin", "coordenacao", "estudante", "editor", "pesquisador"];
const ALL: Role[] = [...ROLES];

export const PERMISSIONS = {
  "organizacao.gerenciar": ["admin"],
  "equipe.gerenciar": ["admin"],
  "configuracoes.editar": ["admin"],
  "institucional.editar": ["admin", "coordenacao"],
  "fazenda.gerenciar": ["admin", "coordenacao"],
  "auditoria.ver": ["admin", "coordenacao"],
  "experimentos.ver_todos": ["admin", "coordenacao"],
  "experimentos.criar": ["coordenacao", "estudante"],
  "experimentos.importar": ["coordenacao", "estudante"],
  "pessoas.gerenciar": TEAM,
  "visitas.gerenciar": TEAM,
  "visitas.conferir": TEAM,
  "atividades.criar": INTERNAL,
  "atividades.ver_todas": TEAM,
  "arquivos.enviar": INTERNAL,
  "editorial.criar": ["coordenacao", "estudante", "editor"],
  "revisao.conferencia": TEAM,
  // revisão final: coordenação, ou editor com delegação explícita (ver canFinalReview)
  "revisao.final": ["coordenacao"],
  "publicacao.registrar": TEAM,
  "publicacao.revogar": ["coordenacao"],
  "relatorios.ver": ALL,
  "relatorios.exportar_interno": TEAM,
  "piloto.editar": TEAM,
  "feedback.moderar": TEAM,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(roles: readonly Role[], permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly Role[];
  return roles.some((r) => allowed.includes(r));
}

export function canFinalReview(roles: readonly Role[], editorDelegation: boolean): boolean {
  return can(roles, "revisao.final") || (roles.includes("editor") && editorDelegation);
}

export type ExperimentAccess = "proprietario" | "colaborador" | "revisor" | "visualizador";

/** Validação científica: apenas proprietário do estudo ou revisor delegado — nunca por papel administrativo. */
export function canValidateExperiment(access: ExperimentAccess | null | undefined): boolean {
  return access === "proprietario" || access === "revisor";
}

export type AccessLevel = "privado_equipe" | "colaboradores" | "preparado_revisao";

export function canReadExperiment(
  roles: readonly Role[],
  nivel: AccessLevel,
  access: ExperimentAccess | null | undefined,
): boolean {
  if (roles.includes("admin") || roles.includes("coordenacao")) return true;
  if (nivel !== "privado_equipe" && (roles.includes("estudante") || roles.includes("editor"))) return true;
  return access != null;
}

export function canWriteExperiment(
  roles: readonly Role[],
  nivel: AccessLevel,
  access: ExperimentAccess | null | undefined,
): boolean {
  if (roles.includes("coordenacao")) return true;
  if (nivel !== "privado_equipe" && roles.includes("estudante")) return true;
  return access === "proprietario" || access === "colaborador";
}
