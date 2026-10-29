import { expect, type Page } from "@playwright/test";

export const PASSWORD = "bento-local-123"; // somente Supabase local (supabase/seed.sql)

export async function login(page: Page, user: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/^E-mail/).first().fill(`${user}@bento.local`);
  await page.getByLabel(/^Senha/).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/app/);
}

/** Falha se a página exibir a tela de erro ou mensagens de falha de carregamento. */
export async function expectHealthy(page: Page) {
  await expect(page.getByText("Não foi possível carregar esta página")).toHaveCount(0);
  await expect(page.getByText(/This page could not be found|Application error/)).toHaveCount(0);
}

export const tag = () => Math.random().toString(36).slice(2, 7);
