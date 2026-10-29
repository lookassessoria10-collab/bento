import { expect, test } from "@playwright/test";
import { expectHealthy, login } from "./helpers";

const PAGES = [
  "/app",
  "/app/experimentos",
  "/app/experimentos/novo",
  "/app/experimentos/importar",
  "/app/visitas",
  "/app/visitas?vista=lista",
  "/app/visitas/nova",
  "/app/atividades",
  "/app/atividades?vista=lista",
  "/app/atividades?vista=calendario",
  "/app/resultados",
  "/app/biblioteca",
  "/app/aprovacoes",
  "/app/editorial",
  "/app/editorial?vista=calendario",
  "/app/editorial/boletins",
  "/app/editorial/dossies",
  "/app/editorial/instagram",
  "/app/relatorios",
  "/app/relatorios/feedback",
  "/app/equipe",
  "/app/equipe?aba=pessoas",
  "/app/equipe?aba=frentes",
  "/app/configuracoes",
  "/app/configuracoes?aba=institucional",
  "/app/configuracoes?aba=fazenda",
  "/app/configuracoes?aba=roteiros",
  "/app/configuracoes?aba=piloto",
  "/app/configuracoes?aba=auditoria",
  "/app/busca?q=soja",
  "/app/notificacoes",
  "/app/ajuda",
];

for (const user of ["coordenacao", "estudante", "pesquisador", "leitor", "admin"]) {
  test(`navegação principal sem erros — ${user}`, async ({ page }) => {
    test.setTimeout(300_000); // primeira compilação de cada rota no modo dev
    const consoleErrors: string[] = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(e.message));
    await login(page, user);
    for (const path of PAGES) {
      // páginas sem permissão redirecionam (no cliente) para /app com aviso
      const res = await page.goto(path).catch(() => null);
      if (res) expect(res.status(), path).toBeLessThan(500);
      await page.waitForLoadState("domcontentloaded");
      await expectHealthy(page);
    }
    // detalhe do experimento demonstrativo e todas as abas (quando visível)
    await page.goto("/app/experimentos");
    const link = page.getByRole("link", { name: "EA360-001" }).first();
    if (await link.count()) {
      await link.click();
      await page.waitForURL(/\/app\/experimentos\/[0-9a-f-]{36}/);
      const base = page.url().split("?")[0];
      for (const aba of ["metodologia", "linha-do-tempo", "visitas", "resultados", "arquivos", "pendencias", "conteudos", "equipe", "historico"]) {
        const r = await page.goto(`${base}?aba=${aba}`);
        expect(r?.status(), aba).toBeLessThan(500);
        await expectHealthy(page);
      }
    }
    expect(consoleErrors.filter((e) => !/favicon|Download the React DevTools|hydrat/i.test(e))).toEqual([]);
  });
}

test("rotas protegidas exigem login e páginas públicas não expõem dados internos", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/app/experimentos");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fexperimentos/);
  await page.goto("/");
  await expect(page.getByText(/em desenvolvimento/)).toBeVisible();
  await expect(page.getByText("EA360-001")).toHaveCount(0);
  const r = await page.goto("/publicacoes/qualquer-coisa");
  expect(r?.status()).toBe(404);
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /app");
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/app");
});
