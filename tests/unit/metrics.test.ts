import { describe, expect, it } from "vitest";
import { countBy, isEligible, monthlyUpdateRate, pilotMonth, type ExperimentForRate } from "@/lib/metrics";

const base: ExperimentForRate = {
  id: "a",
  acompanhamento_ativo: true,
  archived_at: null,
  fase: "andamento",
  data_inicio: "2026-01-10",
  data_termino_efetiva: null,
  periodicidade_acompanhamento: "mensal",
};

describe("percentual mensal de registros devidos", () => {
  it("numerador / denominador × 100", () => {
    const exps = [base, { ...base, id: "b" }, { ...base, id: "c" }, { ...base, id: "d" }];
    const recs = [
      { experiment_id: "a", status: "conferida", visit_date: "2026-11-05" },
      { experiment_id: "b", status: "preenchida", visit_date: "2026-11-20" },
      { experiment_id: "c", status: "rascunho", visit_date: "2026-11-21" }, // rascunho não conta
      { experiment_id: "d", status: "finalizada", visit_date: "2026-10-30" }, // fora do mês
    ];
    const r = monthlyUpdateRate(exps, recs, "2026-11");
    expect(r.denominador).toBe(4);
    expect(r.numerador).toBe(2);
    expect(r.percentual).toBe(50);
  });

  it("várias fichas do mesmo experimento contam uma vez", () => {
    const recs = [
      { experiment_id: "a", status: "conferida", visit_date: "2026-11-05" },
      { experiment_id: "a", status: "finalizada", visit_date: "2026-11-25" },
    ];
    expect(monthlyUpdateRate([base], recs, "2026-11").numerador).toBe(1);
  });

  it("exclui encerrados antes do mês, sem acompanhamento, arquivados e não mensais", () => {
    expect(isEligible({ ...base, fase: "concluido", data_termino_efetiva: "2026-10-15" }, "2026-11")).toBe(false);
    expect(isEligible({ ...base, fase: "concluido", data_termino_efetiva: "2026-11-15" }, "2026-11")).toBe(true);
    expect(isEligible({ ...base, fase: "interrompido", data_termino_efetiva: null }, "2026-11")).toBe(false);
    expect(isEligible({ ...base, acompanhamento_ativo: false }, "2026-11")).toBe(false);
    expect(isEligible({ ...base, archived_at: "2026-01-01" }, "2026-11")).toBe(false);
    expect(isEligible({ ...base, periodicidade_acompanhamento: "trimestral" }, "2026-11")).toBe(false);
    expect(isEligible({ ...base, data_inicio: "2026-12-01" }, "2026-11")).toBe(false);
  });

  it("sem elegíveis retorna percentual nulo (não 0% nem 100%)", () => {
    expect(monthlyUpdateRate([], [], "2026-11").percentual).toBeNull();
  });

  it("expõe as regras de elegibilidade", () => {
    expect(monthlyUpdateRate([base], [], "2026-11").regras.length).toBeGreaterThan(2);
  });
});

describe("agrupamentos e piloto", () => {
  it("countBy trata ausentes como Não informado e listas", () => {
    const r = countBy([{ c: ["soja", "milho"] }, { c: ["soja"] }, { c: [] }], (x) => x.c);
    expect(r).toEqual([
      { label: "soja", value: 2 },
      { label: "milho", value: 1 },
      { label: "Não informado", value: 1 },
    ]);
  });

  it("mês do piloto", () => {
    expect(pilotMonth(null, "2026-11-01")).toBeNull();
    expect(pilotMonth("2026-11-10", "2026-11-01")).toBeNull();
    expect(pilotMonth("2026-11-10", "2026-11-10")).toBe(1);
    expect(pilotMonth("2026-11-10", "2026-12-09")).toBe(1);
    expect(pilotMonth("2026-11-10", "2026-12-10")).toBe(2);
    expect(pilotMonth("2026-11-10", "2027-04-15")).toBe(6);
  });
});
