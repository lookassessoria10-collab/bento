import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComplementRows, demoUuid, parseDemoComplement, parseDemoDataset, type DemoDataset } from "@/lib/demo/dataset";
import {
  approvalStats,
  attentionItems,
  calendarEntries,
  delayedExperiments,
  docFunnel,
  resolutionDays,
  statusByCulture,
  upcoming,
  visitCompliance,
  visitsByMonth,
  type PEvent,
  type PSchedule,
  type PTask,
} from "@/lib/painel";
import type { GExperiment, GIncident } from "@/lib/gestao";
import { METRICAS } from "@/lib/metricas";
import {
  DEMO_ONLY_SECOES,
  effectiveSections,
  hashSharePassword,
  hashShareToken,
  isWellFormedToken,
  newShareToken,
  shareConfigSchema,
  shareState,
  verifySharePassword,
} from "@/lib/share";

const D = parseDemoDataset(JSON.parse(readFileSync("supabase/demo/bento-demo-dados.json", "utf8"))).data as DemoDataset;
const RAW_C = JSON.parse(readFileSync("supabase/demo/bento-demo-complemento.json", "utf8"));
const REF = "2026-11-15";

const exp = (id: string, fase: GExperiment["fase"], culturas = ["soja"]): GExperiment => ({
  id,
  codigo: id.toUpperCase(),
  titulo: id,
  culturas,
  area_tematica: null,
  fase,
  data_inicio: "2026-01-01",
  data_termino_prevista: "2026-12-31",
  updated_at: "2026-11-01T00:00:00Z",
  responsavel: null,
  responsavel_id: null,
  setor: null,
  setor_id: null,
  periodicidade_acompanhamento: "mensal",
  acompanhamento_ativo: fase === "andamento",
  objetivo_geral: null,
  resumo_metodologico: null,
  is_demo: true,
  revisao_simulada: null,
});
const sch = (id: string, data: string, status: PSchedule["status"], e = "a"): PSchedule => ({ id, data, hora: null, status, titulo: id, experiment_ids: [e] });
const evt = (id: string, data: string, status: PEvent["status"], e: string | null = "a", realizado: string | null = null): PEvent => ({
  id,
  experiment_id: e,
  visit_id: null,
  tipo: "avaliacao",
  titulo: id,
  data_prevista: data,
  status,
  realizado_em: realizado,
  responsavel: null,
  observacoes: null,
});
const task = (id: string, status: string, prazo: string | null, prioridade: PTask["prioridade"] = "media", e = "a"): PTask => ({
  id,
  experiment_id: e,
  titulo: id,
  status,
  prioridade,
  prazo,
  responsavel: null,
  created_at: "2026-01-01T00:00:00Z",
  concluida_em: null,
});

describe("complemento da demonstração (agenda fictícia)", () => {
  it("valida contra o pacote principal: só ensaios ativos/planejados, nada futuro como realizado", () => {
    const r = parseDemoComplement(RAW_C, D);
    expect(r.errors).toEqual([]);
    const rows = buildComplementRows(r.data!, demoUuid("org:x"));
    expect(rows.visit_schedules).toHaveLength(4);
    expect(rows.visit_schedules.every((v) => v.data_hora.slice(0, 10) > REF)).toBe(true);
    expect(rows.calendar_events.filter((e) => e.status === "realizado").every((e) => e.realizado_em! <= REF)).toBe(true);
    expect(rows.calendar_events.every((e) => e.is_demo && e.observacoes.includes("DADOS SIMULADOS"))).toBe(true);
  });

  it("rejeita compromisso futuro registrado como realizado e ensaio inexistente", () => {
    const bad = JSON.parse(JSON.stringify(RAW_C));
    bad.events[0].status = "realizado";
    bad.events[0].completedAt = "2026-11-19";
    bad.plannedVisits[0].code = "DEMO-EA360-999";
    const err = parseDemoComplement(bad, D).errors.join(" ");
    expect(err).toMatch(/realizado exige data de realização até/);
    expect(err).toMatch(/não existe no pacote/);
  });
});

describe("agenda e cronograma", () => {
  const entries = calendarEntries([sch("v1", "2026-11-01", "realizada"), sch("v2", "2026-11-10", "planejada"), sch("v3", "2026-11-20", "confirmada"), sch("v4", "2026-11-05", "cancelada")], [evt("e1", "2026-11-12", "planejado"), evt("e2", "2026-11-30", "confirmado")]);

  it("separa realizadas de agendadas por mês e não soma canceladas", () => {
    expect(visitsByMonth(entries)).toEqual([{ mes: "2026-11", realizadas: 1, agendadas: 2 }]);
  });

  it("cumprimento = realizadas ÷ (vencidas − canceladas); sem base → nulo", () => {
    expect(visitCompliance(entries, REF)).toEqual({ numerador: 1, denominador: 2, percentual: 50 });
    expect(visitCompliance([], REF).percentual).toBeNull();
  });

  it("ensaio em atraso só com item vencido verificável", () => {
    const d = delayedExperiments([exp("a", "andamento"), exp("b", "andamento"), exp("c", "concluido")], entries, [task("t1", "a_fazer", "2026-11-14", "media", "b")], REF);
    expect(d.map((x) => x.experiment.id)).toEqual(["a", "b"]);
    expect(d[0].motivos.join(" ")).toMatch(/prevista para 2026-11-10/);
    expect(delayedExperiments([exp("a", "andamento")], [], [], REF)).toEqual([]);
  });

  it("próximos compromissos ficam fora quando realizados ou cancelados", () => {
    expect(upcoming(entries, REF, 30).map((e) => e.id)).toEqual(["v3", "e2"]);
  });

  it("atenção ordena por criticidade e limita a cinco", () => {
    const inc: GIncident[] = [
      { id: "i1", experiment_id: "a", titulo: "baixa", gravidade: "baixa", detectada_em: "2026-11-01", descricao: null, consequencia: null, providencia: null, responsavel_descricao: null, proxima_verificacao: null, status: "aberta", resolvida_em: null },
      { id: "i2", experiment_id: "a", titulo: "alta", gravidade: "alta", detectada_em: "2026-11-02", descricao: null, consequencia: null, providencia: null, responsavel_descricao: null, proxima_verificacao: null, status: "aberta", resolvida_em: null },
    ];
    const items = attentionItems(inc, [task("t", "a_fazer", "2026-11-01", "urgente")], entries, REF, 5);
    // ordem: ocorrência crítica > pendência urgente vencida > ocorrência alta > … > baixa
    expect(items.map((i) => i.titulo)).toEqual(["t", "alta", "v2", "e1", "baixa"]);
    expect(attentionItems(inc, [], [], REF, 1)).toHaveLength(1);
  });

  it("situação por cultura soma o portfólio", () => {
    const rows = statusByCulture([exp("a", "andamento", ["milho"]), exp("b", "concluido", ["milho"]), exp("c", "planejado", ["soja"])]);
    expect(rows[0]).toMatchObject({ cultura: "milho", total: 2 });
    expect(rows[0].counts.andamento).toBe(1);
  });
});

describe("fórmulas de tempo e aprovação", () => {
  it("tempo de resolução ignora pares inválidos e informa n", () => {
    const r = resolutionDays([
      { inicio: "2026-01-01", fim: "2026-01-11" },
      { inicio: "2026-02-01", fim: "2026-02-03" },
      { inicio: "2026-03-10", fim: "2026-03-01" },
      { inicio: null, fim: "2026-03-01" },
    ]);
    expect(r).toEqual({ n: 2, mediana: 6, descartados: 1 });
  });

  it("taxa de aprovação usa eventos reais e não conta revisados como liberados", () => {
    const s = approvalStats(
      [
        { etapa: "conferencia", status: "concluida", created_at: "2026-10-01T10:00:00Z", concluida_em: "2026-10-03T10:00:00Z" },
        { etapa: "conferencia", status: "aberta", created_at: "2026-10-05T10:00:00Z", concluida_em: null },
      ],
      [
        { etapa: "validacao_cientifica", decisao: "aprovado", created_at: "2026-10-04T10:00:00Z" },
        { etapa: "revisao_final", decisao: "aprovado", created_at: "2026-10-06T10:00:00Z" },
      ],
      "2026-10-01",
      "2026-10-31",
    );
    expect(s).toMatchObject({ submetidos: 2, liberados: 1, taxa: 50 });
    expect(s.tempo).toMatchObject({ n: 1, mediana: 2 });
    expect(approvalStats([], [], "", "").taxa).toBeNull();
  });

  it("funil conta cada item uma vez por etapa", () => {
    const f = docFunnel([
      { id: "1", titulo: "a", status: "rascunho", tipo: "pauta" },
      { id: "2", titulo: "b", status: "validado", tipo: "pauta" },
      { id: "3", titulo: "c", status: "publicado", tipo: "boletim" },
    ]);
    expect(f.find((x) => x.key === "aguardando_revisao_final")?.value).toBe(1);
    expect(f.reduce((a, b) => a + b.value, 0)).toBe(3);
  });

  it("catálogo descreve todas as métricas exibidas", () => {
    for (const m of Object.values(METRICAS)) expect(m.definicao.length && m.formula.length && m.unidade.length && m.fonte.length).toBeTruthy();
    expect(METRICAS.economia_tempo.definicao).toMatch(/Somente no ambiente de demonstração/);
  });
});

describe("tokens, senha e configuração dos links", () => {
  it("tokens de 256 bits, únicos, guardados só como SHA-256", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(43);
    expect(isWellFormedToken(a.token)).toBe(true);
    expect(a.hash).toBe(hashShareToken(a.token));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.token);
    for (const bad of ["", "abc", "1", `${a.token}x`, "../../etc/passwd", null, 42]) expect(isWellFormedToken(bad)).toBe(false);
  });

  it("senha com scrypt: sal único, verificação correta e recusa da errada", () => {
    const h1 = hashSharePassword("senha-forte-1");
    const h2 = hashSharePassword("senha-forte-1");
    expect(h1).not.toBe(h2);
    expect(h1.startsWith("scrypt$")).toBe(true);
    expect(verifySharePassword("senha-forte-1", h1)).toBe(true);
    expect(verifySharePassword("senha-errada", h1)).toBe(false);
    expect(verifySharePassword("x", "md5$abc")).toBe(false);
  });

  it("situação: revogado > expirado > ativo", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    expect(shareState({ status: "ativo", expira_em: "2026-12-01T00:00:00Z" }, now)).toBe("ativo");
    expect(shareState({ status: "ativo", expira_em: "2026-11-15T11:59:59Z" }, now)).toBe("expirado");
    expect(shareState({ status: "revogado", expira_em: "2027-01-01T00:00:00Z" }, now)).toBe("revogado");
  });

  it("seções exclusivas da demonstração somem fora da organização demo", () => {
    const cfg = shareConfigSchema.parse({ titulo: "Teste", secoes: ["indicadores", "economia", "apresentacao"] });
    expect(effectiveSections(cfg, false)).toEqual(["indicadores"]);
    expect(effectiveSections(cfg, true)).toEqual(["indicadores", ...DEMO_ONLY_SECOES]);
  });

  it("configuração rejeita período invertido, seção desconhecida e ensaio malformado", () => {
    expect(shareConfigSchema.safeParse({ titulo: "Teste", secoes: ["indicadores"], de: "2026-12-01", ate: "2026-01-01" }).success).toBe(false);
    expect(shareConfigSchema.safeParse({ titulo: "Teste", secoes: ["dados_brutos"] }).success).toBe(false);
    expect(shareConfigSchema.safeParse({ titulo: "Teste", secoes: ["indicadores"], experimentos: ["1 or 1=1"] }).success).toBe(false);
  });
});
