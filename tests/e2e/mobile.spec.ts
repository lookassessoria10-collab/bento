import { expect, test } from "@playwright/test";
import { expectHealthy, login } from "./helpers";

test("12. interface funcional em viewport de celular", async ({ page }) => {
  await login(page, "estudante");
  // sem rolagem horizontal da página
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Visitas e acompanhamento" }).click();
  await page.waitForURL(/\/app\/visitas/);
  await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
  await expectHealthy(page);
  await page.goto("/app/experimentos/novo");
  await expect(page.getByLabel(/^Título completo/)).toBeVisible();
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow2).toBe(false);
});
