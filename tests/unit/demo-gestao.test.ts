import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDemoRows, countDataset, demoUuid, parseDemoDataset, type DemoDataset } from "@/lib/demo/dataset";
import { applyFilters, completeness, dueVisits, fmtMinutes, meanOf, openIncidents, parseFilters, portfolio, seriesOf, timeEconomy, type GData } from "@/lib/gestao";

const RAW = JSON.parse(readFileSync("supabase/demo/bento-demo-dados.json", "utf8"));
const clone = () => JSON.parse(JSON.stringify(RAW)) as DemoDataset;
const parsed = parseDemoDataset(RAW);
const D = parsed.data!;
const ORG = demoUuid("org:test");

/** Converte as linhas mapeadas no formato carregado pelo painel (o mesmo que viria do banco). */
function asPanelData(): GData {
  const r = buildDemoRows(D, ORG);
  const people = new Map(r.people.map((p) => [p.id, p.nome]));
  const areas = new Map(r.farm_areas.map((a) => [a.id, a.nome]));
  const dateOf = new Map(r.visit_schedules.map((v) => [v.id, v.data_hora.slice(0, 10)]));
  return {
    experiments: r.experiments.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      titulo: e.titulo,
      culturas: e.culturas,
      area_tematica: e.area_tematica,
      fase: e.fase,
      data_inicio: e.data_inicio,
      data_termino_prevista: e.data_termino_prevista,
      updated_at: "2026-11-15T12:00:00Z",
      responsavel: people.get(e.pesquisador_principal_id) ?? null,
      responsavel_id: e.pesquisador_principal_id,
      setor: areas.get(e.farm_area_id) ?? null,
      setor_id: e.farm_area_id,
      periodicidade_acompanhamento: e.periodicidade_acompanhamento,
      acompanhamento_ativo: e.acompanhamento_ativo,
      objetivo_geral: e.objetivo_geral,
      resumo_metodologico: e.resumo_metodologico,
      is_demo: true,
      revisao_simulada: e.demo_meta.scientificReview.status,
    })),
    visits: r.visit_records.map((v) => ({
      record_id: v.id,
      experiment_id: v.experiment_id,
      data: dateOf.get(v.visit_id)!,
      status: v.status,
      etapa_atual: v.etapa_atual,
      avaliacoes_realizadas: v.avaliacoes_realizadas,
      observacoes_diretas: v.observacoes_diretas,
      proxima_acao: v.proxima_acao,
      fontes: v.fontes,
    })),
    measurements: r.experiment_measurements.map((m) => ({ ...m })),
    incidents: r.experiment_incidents.map((i) => ({ ...i })),
    tasks: r.tasks.map((t) => ({ experiment_id: t.experiment_id, titulo: t.titulo, status: t.status, prazo: t.prazo })),
    files: r.files.map((f) => ({ experiment_id: f.row.experiment_id, tipo: f.row.tipo, revisao_status: "pendente" })),
  };
}

describe("pacote de demonstração: validação", () => {
  it("aceita o JSON canônico e confere expectedCounts", () => {
    expect(parsed.errors).toEqual([]);
    const c = countDataset(D);
    expect(c).toEqual({ portfolioCount: 18, visits: 93, measurements: 186, incidents: 12, plots: 208, statuses: { concluido: 13, em_andamento: 3, interrompido: 1, planejado: 1 } });
    expect(D.expectedCounts.portfolioCount).toBe(c.portfolioCount);
  });

  it("rejeita visita futura registrada como realizada", () => {
    const x = clone();
    x.experiments[0].visits[0].date = "2027-01-01";
    expect(parseDemoDataset(x).errors.join(" ")).toMatch(/após 2026-11-15/);
  });

  it("rejeita valor ausente sem justificativa (nunca vira zero)", () => {
    const x = clone();
    x.experiments[0].visits[0].measurements[0] = { ...x.experiments[0].visits[0].measurements[0], value: null, missingReason: null };
    expect(parseDemoDataset(x).errors.join(" ")).toMatch(/sem justificativa/);
  });

  it("rejeita divergência de contagens e tarefa futura concluída", () => {
    const x = clone();
    x.expectedCounts.visits = 94;
    const e4 = x.experiments.find((e) => e.code === "DEMO-EA360-004")!;
    e4.tasks[1].status = "concluida";
    const err = parseDemoDataset(x).errors.join(" ");
    expect(err).toMatch(/contagem de visitas/);
    expect(err).toMatch(/tarefa futura marcada como concluída/);
  });

  it("rejeita estrutura incompleta antes de qualquer escrita", () => {
    const x = clone() as unknown as Record<string, unknown>;
    delete x.experiments;
    expect(parseDemoDataset(x).data).toBeNull();
  });
});

describe("pacote de demonstração: mapeamento", () => {
  const a = buildDemoRows(D, ORG);
  const b = buildDemoRows(D, ORG);

  it("identificadores determinísticos (idempotência por chave estável)", () => {
    expect(a.experiments.map((e) => e.id)).toEqual(b.experiments.map((e) => e.id));
    expect(new Set(a.experiment_measurements.map((m) => m.id)).size).toBe(186);
    expect(new Set(a.experiment_plot_readings.map((m) => m.id)).size).toBe(208);
  });

  it("todo registro pertence à organização de demonstração e é marcado como demo", () => {
    for (const t of [a.people, a.experiments, a.visit_schedules, a.visit_records, a.experiment_measurements, a.experiment_incidents, a.experiment_plot_readings, a.tasks, a.editorial_items]) {
      for (const r of t as { organization_id: string; is_demo: boolean }[]) {
        expect(r.organization_id).toBe(ORG);
        expect(r.is_demo).toBe(true);
      }
    }
    expect(a.files.every((f) => f.content.startsWith("=") && f.content.includes("DADOS SIMULADOS"))).toBe(true);
    expect(a.editorial_items.every((x) => x.status === "rascunho" && x.canais.every((c) => c === "interno"))).toBe(true);
  });

  it("preserva ausências, não inventa encerramento e não cria leituras para o ensaio interrompido", () => {
    const nulls = a.experiment_measurements.filter((m) => m.valor === null);
    expect(nulls).toHaveLength(2);
    expect(nulls.every((m) => m.motivo_ausencia && m.experiment_id === demoUuid("exp:DEMO-EA360-015"))).toBe(true);
    expect(a.experiment_plot_readings.some((p) => p.experiment_id === demoUuid("exp:DEMO-EA360-015"))).toBe(false);
    expect(a.experiments.every((e) => e.data_termino_efetiva === null)).toBe(true);
    const e15 = a.experiments.find((e) => e.codigo === "DEMO-EA360-015")!;
    expect(e15.fase).toBe("interrompido");
    expect(e15.motivo_interrupcao).toMatch(/datalogger/i);
  });

  it("nenhuma etapa futura é registrada como concluída", () => {
    expect(a.visit_schedules.every((v) => v.status === "realizada" && v.data_hora.slice(0, 10) <= D.asOfDate)).toBe(true);
    expect(a.tasks.filter((t) => t.status === "concluida").every((t) => (t.prazo ?? "") <= D.asOfDate)).toBe(true);
    expect(a.experiments.find((e) => e.codigo === "DEMO-EA360-017")!.fase).toBe("planejado");
  });
});

describe("painel gerencial: cálculos a partir dos registros", () => {
  const data = asPanelData();
  const all = applyFilters(data, parseFilters({}));

  it("18 ensaios sem filtro, distribuição idêntica à base", () => {
    const p = portfolio(all.experiments);
    expect(p.total).toBe(18);
    expect(p.porFase).toMatchObject({ concluido: 13, andamento: 3, interrompido: 1, planejado: 1, implantacao: 0 });
  });

  it("filtro de algodão recalcula todos os blocos e mantém a ocorrência do DEMO-EA360-005", () => {
    const f = applyFilters(data, parseFilters({ cultura: "Algodão" }));
    expect(f.experiments.map((e) => e.codigo)).toEqual(["DEMO-EA360-005", "DEMO-EA360-006", "DEMO-EA360-007"]);
    expect(f.visits.every((v) => f.experiments.some((e) => e.id === v.experiment_id))).toBe(true);
    const inc = f.incidents.find((i) => i.experiment_id === demoUuid("exp:DEMO-EA360-005"))!;
    expect(inc.titulo).toMatch(/bordaduras/);
    const s = seriesOf(f.measurements, demoUuid("exp:DEMO-EA360-005")).find((x) => x.variavel === "Capturas por armadilha")!;
    expect(s.pontos.map((p) => p.valor)).toEqual([0, 0, 1, 4, 8, 5, 2, 1]);
  });

  it("série do ensaio interrompido mantém a lacuna (nulo, não zero)", () => {
    const s = seriesOf(all.measurements, demoUuid("exp:DEMO-EA360-015"));
    const ins = s.find((x) => x.variavel === "Insetos por planta")!;
    expect(ins.pontos.at(-1)).toMatchObject({ valor: null });
    expect(meanOf(ins.pontos.map((p) => p.valor))).toBe(4); // (0+3+9)/3 — o nulo não entra como zero
  });

  it("filtro por período restringe ensaios e registros", () => {
    const f = applyFilters(data, parseFilters({ de: "2026-10-01", ate: "2026-11-15" }));
    expect(f.experiments.map((e) => e.codigo).sort()).toContain("DEMO-EA360-004");
    expect(f.visits.every((v) => v.data >= "2026-10-01" && v.data <= "2026-11-15")).toBe(true);
  });

  it("preenchimento, ocorrências priorizadas e visitas devidas", () => {
    const c = completeness(all.visits, all.measurements);
    expect(c.denominador).toBe(93 * 5);
    expect(c.ausentesJustificadas).toBe(2);
    expect(c.ausentesSemMotivo).toBe(0);
    const open = openIncidents(all.incidents, D.asOfDate);
    expect(open).toHaveLength(4);
    expect(open[0].gravidade).toBe("alta");
    expect(open.map((i) => i.gravidade)).toEqual(["alta", "media", "baixa", "baixa"]);
    const due = dueVisits(all.experiments, all.visits, D.asOfDate);
    expect(due.map((x) => x.experiment.codigo).sort()).toEqual(["DEMO-EA360-004", "DEMO-EA360-007", "DEMO-EA360-013"]);
  });
});

describe("estimativa de tempo (simulação)", () => {
  const items = D.timeEconomyModel.items.map((i) => ({ atividade: i.activity, eventos_mes: i.eventsPerMonth, minutos_antes: i.legacyMinutesEach, minutos_bento: i.bentoMinutesEach }));

  it("864 min antes, 448 com Bento, 416 de diferença e 48,1%", () => {
    const t = timeEconomy(items);
    expect([t.antes, t.bento, t.economia, t.percentual]).toEqual([864, 448, 416, 48.1]);
    expect(fmtMinutes(t.economia)).toBe("6h56min");
    expect(t.antes).toBe(D.timeEconomyModel.totals.legacyMinutesPerMonth);
  });

  it("recalcula ao editar frequência ou duração", () => {
    const freq = timeEconomy(items.map((i, n) => (n === 0 ? { ...i, eventos_mes: 10 } : i)));
    expect([freq.antes, freq.bento, freq.economia, freq.percentual]).toEqual([834, 438, 396, 47.5]);
    const dur = timeEconomy(items.map((i, n) => (n === 1 ? { ...i, minutos_bento: 55 } : i)));
    expect(dur.economia).toBe(296);
  });

  it("sem tempo de referência não há percentual", () => {
    expect(timeEconomy([{ atividade: "x", eventos_mes: 0, minutos_antes: 10, minutos_bento: 5 }]).percentual).toBeNull();
  });
});
