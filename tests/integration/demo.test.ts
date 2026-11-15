import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseDemoDataset, demoUuid, type DemoDataset } from "../../src/lib/demo/dataset";
import { apply, rollback, verify } from "../../scripts/importar-demo-bento";
import { PASSWORD, URL, anon, as, orgId, service, type DB } from "./helpers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

// Ambiente de demonstração contra o Supabase LOCAL: importação, idempotência, isolamento e remoção exclusiva.
const D = parseDemoDataset(JSON.parse(readFileSync("supabase/demo/bento-demo-dados.json", "utf8"))).data as DemoDataset;
const DEMO = demoUuid(`org:${D.demoOrganization.slug}`);
const GESTOR = "demo-gestor@bento.local";
let REAL: string;
let gestor: DB;

const TABLES = ["experiments", "visit_schedules", "visit_records", "experiment_measurements", "experiment_incidents", "experiment_plot_readings", "tasks", "files", "people", "editorial_items"] as const;
async function counts(org: string) {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    const { count } = await service().from(t).select("*", { count: "exact", head: true }).eq("organization_id", org);
    out[t] = count ?? 0;
  }
  return out;
}

beforeAll(async () => {
  REAL = await orgId();
  const sb = service();
  await apply(sb, D);
  // conta exclusiva da demonstração (local): coordenação SOMENTE na organização fictícia
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === GESTOR);
  if (!user) user = (await sb.auth.admin.createUser({ email: GESTOR, password: PASSWORD, email_confirm: true, user_metadata: { nome: "Gestor Demo" } })).data.user!;
  await sb.from("memberships").upsert({ organization_id: DEMO, user_id: user.id, role: "coordenacao", status: "ativo" }, { onConflict: "organization_id,user_id,role" });
  gestor = createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await gestor.auth.signInWithPassword({ email: GESTOR, password: PASSWORD });
  if (error) throw error;
}, 120_000);

afterAll(async () => {
  // deixa a demonstração importada e as premissas canônicas para o uso local
  await apply(service(), D);
}, 120_000);

describe("importação da demonstração", () => {
  it("grava exatamente as quantidades de expectedCounts", async () => {
    const checks = await verify(service(), D);
    for (const c of checks) expect(c.got, c.name).toBe(c.want);
  });

  it("é idempotente: aplicar de novo não duplica nada", async () => {
    const before = await counts(DEMO);
    await apply(service(), D);
    expect(await counts(DEMO)).toEqual(before);
    expect(before.experiments).toBe(18);
    expect(before.experiment_measurements).toBe(186);
  }, 120_000);

  it("não toca nos dados da organização real", async () => {
    const real = await counts(REAL);
    await apply(service(), D);
    expect(await counts(REAL)).toEqual(real);
    const { count } = await service().from("experiments").select("*", { count: "exact", head: true }).eq("organization_id", REAL).eq("is_demo", true).like("codigo", "DEMO-%");
    expect(count).toBe(0);
  }, 120_000);
});

describe("isolamento entre organizações", () => {
  it("gestor da demonstração vê os 18 ensaios e nada da organização real", async () => {
    const { data } = await gestor.from("experiments").select("codigo, organization_id");
    expect(data).toHaveLength(18);
    expect(data!.every((e) => e.organization_id === DEMO)).toBe(true);
    for (const t of ["experiments", "visit_records", "tasks", "files", "people"] as const) {
      const { count } = await gestor.from(t).select("*", { count: "exact", head: true }).eq("organization_id", REAL);
      expect(count, t).toBe(0);
    }
  });

  it("usuários das organizações reais não leem, contam nem exportam registros demonstrativos", async () => {
    for (const u of ["admin", "coordenacao", "estudante", "leitor", "outraorg"]) {
      const c = await as(u);
      for (const t of ["experiments", "experiment_measurements", "experiment_incidents", "experiment_plot_readings", "demo_time_assumptions", "visit_records", "files"] as const) {
        const { count } = await c.from(t).select("*", { count: "exact", head: true }).eq("organization_id", DEMO);
        expect(count, `${u}:${t}`).toBe(0);
      }
      const { data: org } = await c.from("organizations").select("id").eq("id", DEMO);
      expect(org, u).toEqual([]);
    }
  });

  it("visitante anônimo não vê nada da demonstração", async () => {
    const a = anon();
    const { data: e } = await a.from("experiments").select("id").eq("organization_id", DEMO);
    expect(e ?? []).toEqual([]);
    const { data: o } = await a.from("organizations").select("id").eq("id", DEMO);
    expect(o ?? []).toEqual([]);
    const { data: p } = await a.from("public_publications").select("id").eq("organization_id", DEMO);
    expect(p ?? []).toEqual([]);
  });

  it("arquivos demonstrativos não são baixados por outra organização", async () => {
    const path = `${DEMO}/demo/DEMO-EA360-005/DEMO-EA360-005-protocolo-demo.txt`;
    const { data: ok } = await gestor.storage.from("bento-privado").download(path);
    expect(await ok?.text()).toMatch(/DADOS SIMULADOS/);
    const other = await as("coordenacao");
    const { data: no } = await other.storage.from("bento-privado").download(path);
    expect(no).toBeNull();
  });
});

describe("regras de proteção no banco", () => {
  it("premissas de tempo: só o gestor da demonstração edita, e só os números", async () => {
    const id = demoUuid(`time:${D.timeEconomyModel.items[0].activity}`);
    const { error: ok } = await gestor.from("demo_time_assumptions").update({ eventos_mes: 12 }).eq("id", id);
    expect(ok).toBeNull();
    const { error: col } = await gestor.from("demo_time_assumptions").update({ atividade: "Outra" }).eq("id", id);
    expect(col).not.toBeNull();
    const realAdmin = await as("admin");
    const { count } = await realAdmin.from("demo_time_assumptions").update({ eventos_mes: 99 }, { count: "exact" }).eq("id", id);
    expect(count ?? 0).toBe(0);
    const { error: trg } = await service().from("demo_time_assumptions").insert({ organization_id: REAL, atividade: "Teste", eventos_mes: 1, minutos_antes: 1, minutos_bento: 1 });
    expect(trg?.message).toMatch(/demonstração/);
  });

  it("marcador da organização não é alterável pela aplicação", async () => {
    const realAdmin = await as("admin");
    const { error } = await realAdmin.from("organizations").update({ is_demo: true }).eq("id", REAL);
    expect(error).not.toBeNull();
  });

  it("registro criado pela interface na demonstração é forçado como demonstrativo", async () => {
    const { data, error } = await gestor.from("experiments").insert({ organization_id: DEMO, titulo: "Ensaio criado na demonstração", codigo: "", codigo_seq: 0, is_demo: false }).select("id, is_demo, codigo").single();
    expect(error).toBeNull();
    expect(data!.is_demo).toBe(true);
    expect(data!.codigo).not.toMatch(/^DEMO-/);
    await service().from("experiment_members").delete().eq("experiment_id", data!.id);
    await service().from("experiments").delete().eq("id", data!.id);
  });

  it("código DEMO fornecido em organização real é ignorado (gerado normalmente)", async () => {
    const c = await as("coordenacao");
    const { data } = await c.from("experiments").insert({ organization_id: REAL, titulo: "Teste de código", codigo: "DEMO-EA360-999", codigo_seq: 0 }).select("id, codigo").single();
    expect(data!.codigo).toMatch(/^EA360-\d{3}$/);
    await service().from("experiment_members").delete().eq("experiment_id", data!.id);
    await service().from("experiments").delete().eq("id", data!.id);
  });

  it("remoção: recusada pela aplicação e para organização real; remove só a demonstração", async () => {
    const realAdmin = await as("admin");
    const { error: denied } = await realAdmin.rpc("demo_purge_organization", { p_org: DEMO });
    expect(denied).not.toBeNull();
    const { error: notDemo } = await service().rpc("demo_purge_organization", { p_org: REAL });
    expect(notDemo?.message).toMatch(/não é de demonstração/);

    const real = await counts(REAL);
    await rollback(service(), D);
    expect(Object.values(await counts(DEMO)).every((n) => n === 0)).toBe(true);
    const { data: gone } = await service().from("organizations").select("id").eq("id", DEMO);
    expect(gone).toEqual([]);
    expect(await counts(REAL)).toEqual(real);
  }, 120_000);
});
