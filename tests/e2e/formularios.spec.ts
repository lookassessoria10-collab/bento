import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Regressões dos formulários (ActionForm): erro visível em formulários longos e nada sensível na URL.

test("antes de a página ficar interativa o login não envia dados pela URL", async ({ request }) => {
  const html = await (await request.get("/login")).text();
  expect(html).toMatch(/<form[^>]*method="post"/);
  expect(html).not.toMatch(/<form(?![^>]*method=)[^>]*>/);
  // botão de envio desabilitado até a hidratação (evita envio nativo que recarrega sem salvar)
  expect(html).toMatch(/<button type="submit" disabled=""/);
});

test("erro de validação em formulário longo leva ao campo e fica visível", async ({ page }) => {
  await login(page, "estudante");
  await page.goto("/app/experimentos");
  await page.getByRole("link", { name: "EA360-001" }).first().click();
  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForURL(/\/editar$/);
  const ativo = page.getByLabel(/Ativar acompanhamento/);
  if (!(await ativo.isChecked())) await ativo.check();
  await page.locator('input[name="data_inicio"]').fill("");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  const fieldError = page.getByText("Obrigatório para ativar o acompanhamento.").first();
  await expect(fieldError).toBeInViewport();
  await expect(page.locator('input[name="data_inicio"]')).toBeFocused();
  await expect(page.getByRole("alert").filter({ hasText: "Revise os campos destacados" })).toBeInViewport();
  await expect(page).toHaveURL(/\/editar$/); // não recarregou nem perdeu o que foi digitado
});
