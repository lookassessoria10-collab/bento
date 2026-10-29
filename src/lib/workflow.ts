// Máquina de estados do fluxo de revisão (espelho da RPC public.workflow_decide).
// Usada para exibir ações disponíveis e em testes; a aplicação real ocorre no banco.

export type WorkflowStatus =
  | "rascunho"
  | "em_conferencia"
  | "aguardando_validacao"
  | "devolvido"
  | "validado"
  | "aguardando_revisao_final"
  | "liberado"
  | "publicado"
  | "revogado";

export type Decision = "aprovado" | "ajustes" | "rejeitado" | "revogado";
export type Stage = "conferencia" | "validacao_cientifica" | "revisao_final";

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  rascunho: "Rascunho",
  em_conferencia: "Em conferência interna",
  aguardando_validacao: "Aguardando validação científica",
  devolvido: "Devolvido para ajustes",
  validado: "Cientificamente validado",
  aguardando_revisao_final: "Aguardando revisão final",
  liberado: "Liberado para publicação",
  publicado: "Publicado",
  revogado: "Revogado / corrigido",
};

export const STAGE_LABELS: Record<Stage, string> = {
  conferencia: "Conferência interna",
  validacao_cientifica: "Validação científica",
  revisao_final: "Revisão final / autorização",
};

export function stageFor(status: WorkflowStatus): Stage | null {
  switch (status) {
    case "em_conferencia":
      return "conferencia";
    case "aguardando_validacao":
      return "validacao_cientifica";
    case "validado":
    case "aguardando_revisao_final":
      return "revisao_final";
    default:
      return null;
  }
}

export function canSubmit(status: WorkflowStatus): boolean {
  return status === "rascunho" || status === "devolvido";
}

export function nextStatus(status: WorkflowStatus, decision: Decision, requiresScience: boolean): WorkflowStatus {
  const stage = stageFor(status);
  if (!stage) throw new Error(`Não há decisão possível na situação "${STATUS_LABELS[status]}"`);
  if (decision !== "aprovado") return "devolvido";
  if (stage === "conferencia") return requiresScience ? "aguardando_validacao" : "aguardando_revisao_final";
  if (stage === "validacao_cientifica") return "validado";
  return "liberado";
}

export function requiresReason(decision: Decision): boolean {
  return decision !== "aprovado";
}

export function canPublish(status: WorkflowStatus, releasedChannels: readonly string[], channel: string): boolean {
  return (status === "liberado" || status === "publicado") && releasedChannels.includes(channel);
}

/** Editar conteúdo relevante após o envio invalida o ciclo (espelho do gatilho guard_editorial_item). */
export function statusAfterEdit(status: WorkflowStatus): WorkflowStatus {
  return status === "rascunho" || status === "devolvido" ? status : "rascunho";
}

export function isEditable(status: WorkflowStatus): boolean {
  return status === "rascunho" || status === "devolvido";
}
