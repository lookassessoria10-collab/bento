import { expect, test } from "@playwright/test";
import { expectHealthy, login } from "./helpers";

test("12. interface funcional em viewport de celular (navegação no rodapé)", async ({ page }) => {
  await login(page, "estudante");
  // sem rolagem horizontal da página
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);

  const bottomNav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(bottomNav).toBeVisible();
  await bottomNav.getByRole("link", { name: "Visitas" }).click();
  await page.waitForURL(/\/app\/visitas/);
  await expectHealthy(page);

  // demais módulos na folha "Mais", que fecha ao navegar
  await bottomNav.getByRole("button", { name: "Mais" }).click();
  const sheet = page.getByRole("dialog", { name: "Mais opções" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("link", { name: "Biblioteca" }).click();
  await page.waitForURL(/\/app\/biblioteca/);
  await expect(sheet).toHaveCount(0);
  await expectHealthy(page);

  await page.goto("/app/experimentos/novo");
  await expect(page.getByLabel(/^Título completo/)).toBeVisible();
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow2).toBe(false);
});
