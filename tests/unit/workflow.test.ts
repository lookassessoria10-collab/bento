import { describe, expect, it } from "vitest";
import { canPublish, canSubmit, isEditable, nextStatus, requiresReason, stageFor, statusAfterEdit } from "@/lib/workflow";

describe("máquina de estados de revisão", () => {
  it("caminho completo com validação científica", () => {
    expect(nextStatus("em_conferencia", "aprovado", true)).toBe("aguardando_validacao");
    expect(nextStatus("aguardando_validacao", "aprovado", true)).toBe("validado");
    expect(nextStatus("validado", "aprovado", true)).toBe("liberado");
  });

  it("conteúdo institucional pula a validação científica", () => {
    expect(nextStatus("em_conferencia", "aprovado", false)).toBe("aguardando_revisao_final");
    expect(nextStatus("aguardando_revisao_final", "aprovado", false)).toBe("liberado");
  });

  it("ajustes e rejeição devolvem em qualquer etapa", () => {
    for (const s of ["em_conferencia", "aguardando_validacao", "validado", "aguardando_revisao_final"] as const) {
      expect(nextStatus(s, "ajustes", true)).toBe("devolvido");
      expect(nextStatus(s, "rejeitado", true)).toBe("devolvido");
    }
  });

  it("não há decisão em rascunho, liberado ou publicado (sem saltos)", () => {
    for (const s of ["rascunho", "devolvido", "liberado", "publicado", "revogado"] as const) {
      expect(stageFor(s)).toBeNull();
      expect(() => nextStatus(s, "aprovado", true)).toThrow();
    }
  });

  it("envio só a partir de rascunho ou devolvido", () => {
    expect(canSubmit("rascunho")).toBe(true);
    expect(canSubmit("devolvido")).toBe(true);
    expect(canSubmit("em_conferencia")).toBe(false);
    expect(canSubmit("liberado")).toBe(false);
  });

  it("justificativa obrigatória para devolver/rejeitar", () => {
    expect(requiresReason("aprovado")).toBe(false);
    expect(requiresReason("ajustes")).toBe(true);
    expect(requiresReason("rejeitado")).toBe(true);
  });

  it("publicar exige liberação para o canal específico", () => {
    expect(canPublish("liberado", ["boletim"], "boletim")).toBe(true);
    expect(canPublish("liberado", ["boletim"], "portal")).toBe(false);
    expect(canPublish("validado", ["boletim"], "boletim")).toBe(false);
    expect(canPublish("aguardando_revisao_final", ["portal"], "portal")).toBe(false);
  });

  it("editar após envio invalida o ciclo", () => {
    expect(statusAfterEdit("liberado")).toBe("rascunho");
    expect(statusAfterEdit("aguardando_validacao")).toBe("rascunho");
    expect(statusAfterEdit("devolvido")).toBe("devolvido");
    expect(isEditable("em_conferencia")).toBe(false);
  });
});
