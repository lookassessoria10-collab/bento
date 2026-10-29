import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES, can, canFinalReview, canReadExperiment, canValidateExperiment, canWriteExperiment } from "@/lib/permissions";

describe("matriz de permissões", () => {
  it("todas as permissões referenciam papéis existentes", () => {
    for (const roles of Object.values(PERMISSIONS)) for (const r of roles) expect(ROLES).toContain(r);
  });

  it("administração do sistema não equivale a aprovação", () => {
    expect(can(["admin"], "equipe.gerenciar")).toBe(true);
    expect(can(["admin"], "revisao.final")).toBe(false);
    expect(canFinalReview(["admin"], false)).toBe(false);
    expect(can(["admin"], "editorial.criar")).toBe(false);
  });

  it("estudante cria e prepara, mas não libera", () => {
    expect(can(["estudante"], "experimentos.criar")).toBe(true);
    expect(can(["estudante"], "editorial.criar")).toBe(true);
    expect(can(["estudante"], "revisao.final")).toBe(false);
    expect(can(["estudante"], "publicacao.revogar")).toBe(false);
  });

  it("editor só exerce revisão final com delegação explícita", () => {
    expect(canFinalReview(["editor"], false)).toBe(false);
    expect(canFinalReview(["editor"], true)).toBe(true);
    expect(canFinalReview(["coordenacao"], false)).toBe(true);
  });

  it("leitor interno não altera nada", () => {
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      if (p === "relatorios.ver") continue;
      expect(can(["leitor"], p)).toBe(false);
    }
  });

  it("múltiplos papéis somam permissões", () => {
    expect(can(["leitor", "estudante"], "visitas.gerenciar")).toBe(true);
  });

  it("validação científica depende de vínculo com o experimento, não do papel", () => {
    expect(canValidateExperiment("proprietario")).toBe(true);
    expect(canValidateExperiment("revisor")).toBe(true);
    expect(canValidateExperiment("colaborador")).toBe(false);
    expect(canValidateExperiment(null)).toBe(false);
  });

  it("pesquisador não lê estudo de terceiro sem vínculo", () => {
    expect(canReadExperiment(["pesquisador"], "colaboradores", null)).toBe(false);
    expect(canReadExperiment(["pesquisador"], "colaboradores", "visualizador")).toBe(true);
    expect(canReadExperiment(["estudante"], "privado_equipe", null)).toBe(false);
    expect(canReadExperiment(["estudante"], "colaboradores", null)).toBe(true);
    expect(canReadExperiment(["admin"], "privado_equipe", null)).toBe(true);
  });

  it("escrita em experimento", () => {
    expect(canWriteExperiment(["estudante"], "colaboradores", null)).toBe(true);
    expect(canWriteExperiment(["estudante"], "privado_equipe", null)).toBe(false);
    expect(canWriteExperiment(["pesquisador"], "colaboradores", "visualizador")).toBe(false);
    expect(canWriteExperiment(["pesquisador"], "colaboradores", "proprietario")).toBe(true);
    expect(canWriteExperiment(["admin"], "colaboradores", null)).toBe(false);
  });
});
