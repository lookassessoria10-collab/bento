import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expectHealthy, login, PASSWORD } from "./helpers";

// Fluxo crítico do compartilhamento externo contra o Supabase LOCAL com a demonstração importada.
config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
test.skip(!/127\.0\.0\.1|localhost/.test(URL ?? ""), "somente Supabase local");

test.beforeAll(async () => {
  const sb = createClient(URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: org } = await sb.from("organizations").select("id").eq("slug", "unidade-modelo-cerrado-demo").eq("is_demo", true).single();
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === "demo-gestor@bento.local");
  if (!user) user = (await sb.auth.admin.createUser({ email: "demo-gestor@bento.local", password: PASSWORD, email_confirm: true })).data.user!;
  await sb.from("memberships").upsert({ organization_id: org!.id, user_id: user.id, role: "coordenacao", status: "ativo" }, { onConflict: "organization_id,user_id,role" });
});

test("gestor cria link, visitante sem login vê só o painel, revogação bloqueia na hora", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await login(page, "demo-gestor");
  await page.goto("/app/compartilhamentos/novo");
  await expectHealthy(page);
  const nome = `E2E ${Date.now()}`;
  await page.getByLabel(/^Nome interno/).fill(nome);
  await page.getByRole("button", { name: "Gerar link exclusivo" }).click();
  const linkBox = page.getByLabel("Link de compartilhamento");
  await expect(linkBox).toBeVisible();
  const url = await linkBox.inputValue();
  expect(url).toMatch(/\/compartilhado#[A-Za-z0-9_-]{43}$/);

  // visitante: contexto novo, sem cookies nem sessão
  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  await v.goto(url);
  await expect(v.getByRole("heading", { name: "Bento — demonstração da plataforma" })).toBeVisible();
  await expect(v.getByText("DADOS SIMULADOS | AMBIENTE DE DEMONSTRAÇÃO").first()).toBeVisible();
  await expect(v.getByText("Acesso de visualização. Não permite editar informações", { exact: false })).toBeVisible();
  await expect(v.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
  await expect(v.getByText(/Pesquisador Demo|Técnico Demo/)).toHaveCount(0);

  // revogação pela lista
  await page.goto("/app/compartilhamentos");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("row", { name: new RegExp(nome) }).getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByText("Link revogado").first()).toBeVisible();
  await v.reload();
  await expect(v.getByText("Este link está indisponível")).toBeVisible();
  await visitor.close();
});

test("perfil sem gestão não vê nem acessa Compartilhamentos", async ({ page }) => {
  await login(page, "estudante");
  await expect(page.getByRole("link", { name: "Compartilhamentos" })).toHaveCount(0);
  await page.goto("/app/compartilhamentos");
  await expect(page).toHaveURL(/\/app\?erro=/);
});

test("menu agrupado mantém as rotas antigas", async ({ page }) => {
  await login(page, "coordenacao");
  for (const [path, label] of [
    ["/app/experimentos", "Ensaios"],
    ["/app/visitas", "Acompanhamentos"],
    ["/app/atividades", "Pendências"],
    ["/app/biblioteca", "Arquivos"],
  ]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    await expectHealthy(page);
    await expect(page.getByRole("link", { name: label, exact: true }).first()).toHaveAttribute("aria-current", "page");
  }
});
