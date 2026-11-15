import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { parseDemoDataset, demoUuid, type DemoDataset } from "../../src/lib/demo/dataset";
import { apply } from "../../scripts/importar-demo-bento";
import { resolveShare } from "../../src/lib/data/share";
import { hashSharePassword, newShareToken } from "../../src/lib/share";
import type { Database, Json } from "../../src/lib/supabase/database.types";
import { PASSWORD, URL, anon, as, expId, orgId, service, type DB } from "./helpers";

// Links externos e agenda contra o Supabase LOCAL: permissões, escopo, vazamento entre organizações,
// revogação, expiração, rotação, senha e regras de data da agenda.
const D = parseDemoDataset(JSON.parse(readFileSync("supabase/demo/bento-demo-dados.json", "utf8"))).data as DemoDataset;
const DEMO = demoUuid(`org:${D.demoOrganization.slug}`);
let REAL: string;
let ORG_B: string;
let gestorDemo: DB;
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

async function create(c: DB, org: string, cfg: Record<string, unknown>, extra: Partial<{ publico: string; senha: string; substitui: string; dias: number }> = {}) {
  const { token, hash } = newShareToken();
  const { data, error } = await c.rpc("share_link_create", {
    p_org: org,
    p_nome: "Link de teste",
    p_publico: extra.publico ?? "gestor_fazenda",
    p_token_hash: hash,
    p_expira_em: future(extra.dias ?? 30),
    p_config: { titulo: "Painel de teste", subtitulo: "", secoes: ["indicadores", "graficos", "calendario", "ocorrencias", "resultados", "documentos"], experimentos: [], de: null, ate: null, ...cfg } as Json,
    p_senha_hash: extra.senha ? hashSharePassword(extra.senha) : undefined,
    p_substitui: extra.substitui,
  });
  return { id: data as string | null, token, error };
}

beforeAll(async () => {
  REAL = await orgId();
  ORG_B = await orgId("org-teste-b");
  const sb = service();
  await apply(sb, D);
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === "demo-gestor@bento.local");
  if (!user) user = (await sb.auth.admin.createUser({ email: "demo-gestor@bento.local", password: PASSWORD, email_confirm: true })).data.user!;
  await sb.from("memberships").upsert({ organization_id: DEMO, user_id: user.id, role: "coordenacao", status: "ativo" }, { onConflict: "organization_id,user_id,role" });
  gestorDemo = createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await gestorDemo.auth.signInWithPassword({ email: "demo-gestor@bento.local", password: PASSWORD });
  if (error) throw error;
}, 120_000);

describe("quem pode criar e ver links", () => {
  it("perfis sem gestão não criam nem leem links", async () => {
    for (const u of ["estudante", "pesquisador", "leitor", "editor"]) {
      const c = await as(u);
      const r = await create(c, REAL, {});
      expect(r.error, u).not.toBeNull();
      const { data } = await c.from("dashboard_share_links").select("id");
      expect(data ?? [], u).toEqual([]);
    }
  });

  it("gestor não cria link para organização alheia nem demonstração comercial fora da demo", async () => {
    const coord = await as("coordenacao");
    expect((await create(coord, ORG_B, {})).error).not.toBeNull();
    expect((await create(coord, DEMO, {})).error).not.toBeNull();
    expect((await create(coord, REAL, {}, { publico: "demonstracao_comercial" })).error?.message).toMatch(/demonstração/);
  });

  it("anônimo não lê links nem registra acessos", async () => {
    const a = anon();
    const { data } = await a.from("dashboard_share_links").select("id");
    expect(data ?? []).toEqual([]);
    const { error } = await a.rpc("share_link_touch", { p_id: "00000000-0000-0000-0000-000000000000" });
    expect(error).not.toBeNull();
  });
});

describe("o que um link mostra", () => {
  it("organização real: só o escopo autorizado, sem ensaios restritos nem dados de outra organização", async () => {
    const coord = await as("coordenacao");
    const { token, error } = await create(coord, REAL, {});
    expect(error).toBeNull();
    const r = await resolveShare(token, undefined);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const json = JSON.stringify(r.dto);
    expect(r.dto.demo).toBe(false);
    expect(json).not.toContain("EA360-002"); // privado_equipe: não entra nem na contagem
    expect(json).not.toContain("TSTB-001"); // outra organização
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/); // nenhum identificador interno
    expect(json).not.toMatch(/@bento\.local/); // nenhum e-mail
    // só resultados validados E liberados para o portal; nenhum documento sem divulgação autorizada
    const { data: allowed } = await service()
      .from("result_summaries")
      .select("variavel, experiments!inner(organization_id, nivel_acesso)")
      .eq("validacao_status", "validado")
      .contains("escopo_divulgacao", ["portal"])
      .eq("experiments.organization_id", REAL)
      .neq("experiments.nivel_acesso", "privado_equipe");
    expect(r.dto.resultadosReais?.map((x) => x.variavel).sort()).toEqual((allowed ?? []).map((x) => x.variavel).sort());
    const { data: notAllowed } = await service().from("result_summaries").select("variavel").neq("validacao_status", "validado");
    for (const x of notAllowed ?? []) expect(json).not.toContain(x.variavel);
    expect(r.dto.documentos).toEqual([]);
    expect(r.dto.economia).toBeUndefined();
  });

  it("ensaios de outra organização inseridos na configuração são ignorados", async () => {
    const coord = await as("coordenacao");
    const { data: expB } = await service().from("experiments").select("id").eq("organization_id", ORG_B).single();
    const { token } = await create(coord, REAL, { experimentos: [expB!.id] });
    const r = await resolveShare(token, undefined);
    expect(r.status === "ok" && r.dto.indicadores?.total).toBe(0);
  });

  it("escopo por ensaio restringe contagens e gráficos", async () => {
    const coord = await as("coordenacao");
    const { token } = await create(coord, REAL, { experimentos: [await expId("EA360-001")] });
    const r = await resolveShare(token, undefined);
    expect(r.status === "ok" && r.dto.indicadores?.total).toBe(1);
  });

  it("demonstração: selo, dados sintéticos e simulação de tempo, sem pessoas", async () => {
    const { token, error } = await create(gestorDemo, DEMO, { secoes: ["indicadores", "resultados", "economia", "apresentacao"] }, { publico: "demonstracao_comercial" });
    expect(error).toBeNull();
    const r = await resolveShare(token, undefined);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.dto.demo).toBe(true);
    expect(r.dto.indicadores?.total).toBe(18);
    expect(r.dto.economia).toMatchObject({ antes: 864, bento: 448, economia: 416, percentual: 48.1 });
    expect(r.dto.resultadosDemo?.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.dto)).not.toMatch(/Pesquisador Demo|Técnico Demo/);
  });
});

describe("revogação, expiração, rotação e senha", () => {
  it("token inválido ou alterado → indisponível", async () => {
    expect((await resolveShare("x".repeat(43), undefined)).status).toBe("indisponivel");
    expect((await resolveShare("../../etc", undefined)).status).toBe("indisponivel");
    expect((await resolveShare(undefined, undefined)).status).toBe("indisponivel");
  });

  it("revogar bloqueia imediatamente", async () => {
    const coord = await as("coordenacao");
    const { id, token } = await create(coord, REAL, {});
    expect((await resolveShare(token, undefined)).status).toBe("ok");
    await coord.rpc("share_link_revoke", { p_id: id!, p_motivo: "teste" });
    expect((await resolveShare(token, undefined)).status).toBe("indisponivel");
    const { data } = await service().from("dashboard_share_audit").select("acao").eq("link_id", id!);
    expect(data?.map((a) => a.acao).sort()).toEqual(["criado", "revogado"]);
  });

  it("expirado → indisponível", async () => {
    const coord = await as("coordenacao");
    const { id, token } = await create(coord, REAL, {}, { dias: 1 });
    await service().from("dashboard_share_links").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("id", id!);
    expect((await resolveShare(token, undefined)).status).toBe("indisponivel");
  });

  it("substituir revoga só o link alvo; links adicionais seguem válidos; tokens diferentes", async () => {
    const coord = await as("coordenacao");
    const a = await create(coord, REAL, {});
    const b = await create(coord, REAL, {});
    const c = await create(coord, REAL, {}, { substitui: a.id! });
    expect(new Set([a.token, b.token, c.token]).size).toBe(3);
    expect((await resolveShare(a.token, undefined)).status).toBe("indisponivel");
    expect((await resolveShare(b.token, undefined)).status).toBe("ok");
    expect((await resolveShare(c.token, undefined)).status).toBe("ok");
    const { data: rows } = await service().from("dashboard_share_links").select("token_hash").in("id", [a.id!, b.id!, c.id!]);
    expect(new Set(rows?.map((r) => r.token_hash)).size).toBe(3);
  });

  it("senha: exigida, recusa a errada, bloqueia após 5 erros", async () => {
    const coord = await as("coordenacao");
    const { id, token } = await create(coord, REAL, {}, { senha: "senha-forte-123" });
    expect((await resolveShare(token, undefined)).status).toBe("senha");
    const wrong = await resolveShare(token, "errada");
    expect(wrong.status === "senha" && wrong.erro).toMatch(/incorreta/);
    expect((await resolveShare(token, "senha-forte-123")).status).toBe("ok");
    for (let i = 0; i < 5; i++) await resolveShare(token, "errada");
    const locked = await resolveShare(token, "senha-forte-123");
    expect(locked.status === "senha" && locked.erro).toMatch(/Muitas tentativas/);
    const { data } = await service().from("dashboard_share_links").select("senha_hash").eq("id", id!).single();
    expect(data!.senha_hash).not.toContain("senha-forte-123");
  });
});

describe("agenda de compromissos", () => {
  it("equipe cria; leitor não; outra organização não vê", async () => {
    const est = await as("estudante");
    const exp1 = await expId("EA360-001");
    const { data, error } = await est.from("calendar_events").insert({ organization_id: REAL, experiment_id: exp1, tipo: "avaliacao", titulo: "Avaliação de teste", data_prevista: "2027-01-10" }).select("id").single();
    expect(error).toBeNull();
    const leitor = await as("leitor");
    const { error: e2 } = await leitor.from("calendar_events").insert({ organization_id: REAL, tipo: "outro", titulo: "Não pode", data_prevista: "2027-01-10" });
    expect(e2).not.toBeNull();
    const b = await as("outraorg");
    const { data: seen } = await b.from("calendar_events").select("id").eq("id", data!.id);
    expect(seen).toEqual([]);
  });

  it("não aceita realizado no futuro; reagendar guarda histórico; cancelar exige motivo", async () => {
    const est = await as("estudante");
    const { data } = await est.from("calendar_events").insert({ organization_id: REAL, tipo: "coleta", titulo: "Coleta de teste", data_prevista: "2027-02-01" }).select("id").single();
    const { error: fut } = await est.from("calendar_events").update({ status: "realizado", realizado_em: "2099-01-01" }).eq("id", data!.id);
    expect(fut?.message).toMatch(/futura/);
    await est.from("calendar_events").update({ status: "reagendado", data_prevista: "2027-02-08", motivo_status: "chuva" }).eq("id", data!.id);
    const { data: row } = await est.from("calendar_events").select("historico").eq("id", data!.id).single();
    expect(row!.historico).toEqual([expect.objectContaining({ data_de: "2027-02-01", data_para: "2027-02-08", status_para: "reagendado", motivo: "chuva" })]);
    const { error: cancel } = await est.from("calendar_events").update({ status: "cancelado", motivo_status: null }).eq("id", data!.id);
    expect(cancel).not.toBeNull();
  });

  it("compromisso criado na demonstração é marcado como demonstrativo", async () => {
    const { data } = await gestorDemo.from("calendar_events").insert({ organization_id: DEMO, tipo: "outro", titulo: "Criado na demo", data_prevista: "2027-01-05" }).select("id, is_demo").single();
    expect(data!.is_demo).toBe(true);
    await service().from("calendar_events").delete().eq("id", data!.id);
  });
});
