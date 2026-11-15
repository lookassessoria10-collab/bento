import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expectHealthy, login, PASSWORD } from "./helpers";

// Jornada de demonstração (5–7 minutos de apresentação) contra o Supabase LOCAL com a demonstração importada
// (npm run demo:apply). Cria, se preciso, a conta local demo-gestor@bento.local com acesso só à organização fictícia.
config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
test.skip(!/127\.0\.0\.1|localhost/.test(URL ?? ""), "somente Supabase local");

test.beforeAll(async () => {
  const sb = createClient(URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: org } = await sb.from("organizations").select("id").eq("slug", "unidade-modelo-cerrado-demo").eq("is_demo", true).single();
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === "demo-gestor@bento.local");
  if (!user) user = (await sb.auth.admin.createUser({ email: "demo-gestor@bento.local", password: PASSWORD, email_confirm: true, user_metadata: { nome: "Gestor Demo" } })).data.user!;
  await sb.from("memberships").upsert({ organization_id: org!.id, user_id: user.id, role: "coordenacao", status: "ativo" }, { onConflict: "organization_id,user_id,role" });
});

test("gestor percorre painel, filtro de algodão, fichas e relatório", async ({ page }) => {
  test.setTimeout(300_000); // jornada longa; o servidor de desenvolvimento compila cada rota na primeira visita
  await login(page, "demo-gestor");
  await page.goto("/app/gestao");
  await expectHealthy(page);
  await expect(page.getByText("Ambiente de demonstração · Dados simulados").first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Ensaios da seleção" }).locator("tbody tr")).toHaveCount(18);

  await page.getByLabel("Cultura").selectOption({ label: "Algodão" });
  await page.getByRole("button", { name: "Aplicar" }).click();
  await page.waitForURL(/cultura=/);
  await expect(page.getByRole("table", { name: "Ensaios da seleção" }).locator("tbody tr")).toHaveCount(3);

  await page.getByRole("table", { name: "Ensaios da seleção" }).getByRole("link", { name: "DEMO-EA360-005" }).click();
  await expect(page.getByRole("heading", { name: "Elevação das capturas nas bordaduras" })).toBeVisible();
  await expect(page.getByText("Capturas por armadilha").first()).toBeVisible();

  await page.goto("/app/gestao?cultura=sorgo");
  await page.getByRole("table", { name: "Ensaios da seleção" }).getByRole("link", { name: "DEMO-EA360-008" }).click();
  await expect(page.getByText("Umidade volumétrica do solo").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Queda de umidade no florescimento" })).toBeVisible();

  await page.goto("/app/gestao?fase=interrompido");
  await page.getByRole("table", { name: "Ensaios da seleção" }).getByRole("link", { name: "DEMO-EA360-015" }).click();
  await expect(page.getByText("Ensaio interrompido — não há conclusão final")).toBeVisible();
  await expect(page.getByText("Sem leituras finais: o ensaio foi interrompido antes do encerramento.")).toBeVisible();

  await page.goto("/app/gestao");
  await expect(page.getByText("SIMULAÇÃO. Tempos hipotéticos. Não medidos em operação real.")).toBeVisible();
  await expect(page.getByText(/864 min/).first()).toBeVisible();

  await page.getByRole("link", { name: "Relatório gerencial" }).click();
  await expect(page.getByText("Relatório demonstrativo. Dados simulados.", { exact: true })).toBeVisible();
  await expect(page.getByText(/RELATÓRIO DEMONSTRATIVO\. DADOS SIMULADOS\./)).toBeVisible();
});

test("organização real não mostra a demonstração", async ({ page }) => {
  await login(page, "pesquisador");
  await page.goto("/app/experimentos");
  await expect(page.getByText("DEMO-EA360-001")).toHaveCount(0);
  await expect(page.getByText("Ambiente de demonstração · Dados simulados")).toHaveCount(0);
  await page.goto("/app/gestao");
  await expect(page).toHaveURL(/\/app\?erro=/); // painel exige coordenação/administração
});

test("apresentações públicas continuam funcionando", async ({ page }) => {
  for (const path of ["/apresentacao", "/apresentacao/comercial"]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    await expectHealthy(page);
  }
});
