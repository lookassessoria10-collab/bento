import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectHealthy, login, tag } from "./helpers";

test.describe.configure({ mode: "serial" });

async function selectByText(sel: Locator, re: RegExp) {
  const label = (await sel.locator("option").allTextContents()).find((t) => re.test(t));
  if (!label) throw new Error(`opção não encontrada: ${re} em ${JSON.stringify(await sel.locator("option").allTextContents())}`);
  await sel.selectOption({ label });
}

async function ok(page: Page, text: RegExp | string) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
  // aguarda o router.refresh() terminar antes da próxima interação
  await page.waitForLoadState("networkidle");
}

test("1. login e logout reais", async ({ page }) => {
  await login(page, "estudante");
  await expect(page.getByRole("heading", { name: /Olá, Estudante/ })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL(/\/login/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});

test("2. administrador convida e a pessoa cria acesso pelo convite", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/app/equipe");
  const email = `convidada-${tag()}@bento.local`;
  await page.getByLabel(/^E-mail institucional/).fill(email);
  await page.getByLabel(/^Papel/).first().selectOption("estudante");
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const link = await page.getByLabel("Link do convite").inputValue();
  expect(link).toContain("/convite/aceitar?token=");
  await page.context().clearCookies();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ""));
  await page.getByLabel(/^Nome completo/).fill("Convidada Teste");
  await page.getByLabel(/^Senha/).fill("senha-forte-123");
  await page.getByLabel(/^Confirmar senha/).fill("senha-forte-123");
  await page.getByRole("button", { name: /Criar acesso/ }).click();
  await page.waitForURL(/\/app/);
  await expect(page.getByText("Convidada Teste")).toBeVisible();
  // o mesmo link não pode ser reutilizado
  await page.context().clearCookies();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ""));
  await page.getByLabel(/^Nome completo/).fill("Outra");
  await page.getByLabel(/^Senha/).fill("senha-forte-123");
  await page.getByLabel(/^Confirmar senha/).fill("senha-forte-123");
  await page.getByRole("button", { name: /Criar acesso/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: /inválido|utilizado/ })).toBeVisible();
});

let expUrl = "";
let expCode = "";
test("3. cadastro de experimento gera código e persiste após recarregar", async ({ page }) => {
  await login(page, "estudante");
  await page.goto("/app/experimentos/novo");
  const titulo = `[TESTE E2E] Monitoramento ${tag()}`;
  await page.getByLabel(/^Título completo/).fill(titulo);
  await page.getByLabel(/^Cultura\(s\)/).fill("soja, milho");
  await page.getByLabel(/^Fonte do cadastro/).fill("Reunião de teste");
  await page.getByRole("button", { name: "Cadastrar experimento" }).click();
  await page.waitForURL(/\/app\/experimentos\/[0-9a-f-]{36}/);
  expUrl = page.url().split("?")[0];
  expCode = (await page.locator("h1 .font-mono").innerText()).trim();
  expect(expCode).toMatch(/^EA360-\d{3}$/);
  await page.reload();
  await expect(page.getByText(titulo).first()).toBeVisible();
  // busca e edição
  await page.goto(`/app/experimentos?q=${encodeURIComponent(expCode)}`);
  await expect(page.getByRole("link", { name: expCode })).toBeVisible();
  // ativar acompanhamento sem campos essenciais é bloqueado com mensagens por campo
  await page.goto(`${expUrl}/editar`);
  await page.getByLabel(/Ativar acompanhamento/).check();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Obrigatório para ativar o acompanhamento.").first()).toBeVisible();
});

test("4–5. visita: agendar, realizar, preencher, conferir; pendência vira tarefa e é concluída", async ({ page }) => {
  await login(page, "estudante");
  await page.goto("/app/visitas/nova");
  const titulo = `[TESTE E2E] Visita ${tag()}`;
  await page.getByLabel(/^Título/).fill(titulo);
  await page.getByLabel(/^Data e hora/).fill("2026-11-10T09:00");
  await page.getByLabel(new RegExp(`^${expCode}`)).check();
  await page.getByRole("button", { name: "Agendar visita" }).click();
  await page.waitForURL(/\/app\/visitas\/[0-9a-f-]{36}/);
  const visitUrl = page.url().split("?")[0];
  await expectHealthy(page);
  // envio antes de realizar é bloqueado
  await page.getByRole("button", { name: "Enviar para conferência" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /realizada/ })).toBeVisible();
  await page.getByLabel(/^Situação/).first().selectOption("realizada");
  await page.getByRole("button", { name: "Salvar situação" }).click();
  await ok(page, /Situação da visita atualizada/);
  await page.getByLabel("Etapa atual", { exact: true }).fill("Avaliação de pragas (relato do responsável)");
  await page.getByLabel(/^Observações diretas/).fill("[TESTE] Observação da equipe");
  await page.getByLabel(/^Próxima ação/).fill("[TESTE] Confirmar data da próxima avaliação");
  await page.getByRole("button", { name: "Salvar ficha" }).click();
  await ok(page, /Ficha salva/);
  await page.getByRole("button", { name: "Enviar para conferência" }).click();
  await ok(page, /enviada para conferência/);
  // pendência → atividade
  await page.getByText("Criar atividade a partir de pendência").click();
  await page.getByLabel("Pendência", { exact: true }).fill("[TESTE] Confirmar data da próxima avaliação");
  await page.getByRole("button", { name: "Criar atividade", exact: true }).click();
  await ok(page, /Atividade criada a partir da pendência/);

  // conferência por outra pessoa
  await login(page, "estudante2");
  await page.goto(visitUrl);
  await page.getByRole("button", { name: "Conferir ficha" }).click();
  await ok(page, /Ficha conferida/);
  await page.getByRole("button", { name: "Finalizar ficha" }).click();
  await ok(page, /Ficha finalizada/);
  // PDF real da ficha
  const pdf = await page.request.get(`${visitUrl}/ficha/${await page.locator("[id^=ficha-]").first().getAttribute("id").then((x) => x!.replace("ficha-", ""))}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  // tarefa da pendência aparece e é concluída pela lista/quadro
  await login(page, "estudante");
  await page.goto("/app/atividades?vista=quadro&filtro=todas");
  const card = page.getByRole("listitem").filter({ hasText: "[TESTE] Confirmar data da próxima avaliação" }).first();
  await card.getByRole("combobox").selectOption("concluida");
  await page.goto("/app/atividades?filtro=concluidas&vista=lista");
  await expect(page.getByText("[TESTE] Confirmar data da próxima avaliação").first()).toBeVisible();
});

test("6. upload privado e visualização com autorização correta", async ({ page }) => {
  await login(page, "estudante");
  await page.goto("/app/biblioteca?enviar=1");
  const name = `[TESTE] Protocolo ${tag()}`;
  await page.locator("input[name=arquivos]").setInputFiles({ name: "protocolo-teste.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF") });
  await page.getByLabel(/^Nome amigável/).fill(name);
  await page.getByLabel(/^Tipo/).first().selectOption("protocolo");
  await page.getByRole("button", { name: "Enviar arquivos" }).click();
  await page.waitForURL(/\/app\/biblioteca\/[0-9a-f-]{36}/);
  const fileUrl = page.url();
  // download via URL assinada (redireciona para o Storage)
  const res = await page.request.get(`${fileUrl}/download`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toContain("/storage/v1/object/sign/bento-privado/");
  // pesquisador sem vínculo não acessa
  await login(page, "pesquisador2");
  const denied = await page.request.get(`${fileUrl}/download`, { maxRedirects: 0 });
  expect(denied.status()).toBe(404);
  // upload de tipo perigoso é recusado no cliente e no servidor
  await login(page, "estudante");
  await page.goto("/app/biblioteca?enviar=1");
  await page.locator("input[name=arquivos]").setInputFiles({ name: "x.html", mimeType: "text/html", buffer: Buffer.from("<script>") });
  await page.getByLabel(/^Nome amigável/).fill("perigoso");
  await page.getByRole("button", { name: "Enviar arquivos" }).click();
  await expect(page.getByText(/não permitido|não aceito/)).toBeVisible();
});

let pautaUrl = "";
test("7–10. resultado validado pelo pesquisador; pauta revisada; liberação e PDF final; publicação sem aprovação bloqueada", async ({ page }) => {
  test.setTimeout(300_000);
  // estudante registra resultado do EA360-001
  await login(page, "estudante");
  await page.goto("/app/resultados?novo=1");
  const variavel = `[TESTE] Incidência ${tag()}`;
  await selectByText(page.getByLabel(/^Experimento/).first(), /EA360-001/);
  await page.getByLabel(/^Variável observada/).fill(variavel);
  await page.getByLabel(/^Síntese textual recebida/).fill("[TESTE] Síntese fictícia fornecida pelo responsável.");
  await page.getByRole("button", { name: "Registrar resultado" }).click();
  await page.waitForURL(/resultado=/);
  const resultUrl = page.url();

  // conferência por outra estudante
  await login(page, "estudante2");
  await page.goto(resultUrl);
  await page.getByRole("button", { name: "Conferir (equipe)" }).click();
  await ok(page, /Resultado conferido/);

  // 7. pesquisador responsável valida o próprio experimento
  await login(page, "pesquisador");
  await page.goto(resultUrl);
  await page.getByLabel("Boletim").first().check();
  await page.getByLabel("Portal público").first().check();
  await page.getByRole("button", { name: "Validar esta versão" }).click();
  await ok(page, /validado pelo responsável/);

  // estudante cria pauta com a fonte e envia
  await login(page, "estudante");
  await page.goto("/app/editorial?nova=1");
  const titulo = `[TESTE E2E] Pauta ${tag()}`;
  await page.getByLabel(/^Tipo/).first().selectOption("pauta");
  await page.getByLabel(/^Título/).first().fill(titulo);
  await page.getByLabel("Portal público").check();
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await page.waitForURL(/\/app\/editorial\/[0-9a-f-]{36}/);
  pautaUrl = page.url();
  await page.getByRole("button", { name: "Adicionar bloco" }).click();
  await page.getByLabel("Texto do bloco 1").fill("[TESTE] Texto aprovado para divulgação.");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await ok(page, /Rascunho salvo/);
  await selectByText(page.getByRole("combobox", { name: "Resultado", exact: true }), new RegExp(variavel.replace(/[[\]]/g, "\\$&")));
  await page.getByRole("button", { name: "Vincular fonte" }).click();
  await ok(page, /Fonte vinculada/);
  // 10. sem aprovação não há opção de publicar (e a RPC recusa — ver testes de integração)
  await expect(page.getByRole("button", { name: "Confirmar publicação" })).toHaveCount(0);
  await page.getByRole("button", { name: /Fixar versão/ }).click();
  await ok(page, /enviada para conferência/);

  await login(page, "estudante2");
  await page.goto(pautaUrl);
  await page.getByRole("button", { name: "Aprovar conferência" }).click();
  await ok(page, /aguardando validacao/);

  await login(page, "pesquisador");
  await page.goto(pautaUrl.replace("/editorial/", "/aprovacoes/"));
  await expectHealthy(page);
  await page.getByRole("button", { name: "Validar cientificamente" }).click();
  await ok(page, /validado/);

  // 8. orientador conclui revisão final
  await login(page, "coordenacao");
  await page.goto(pautaUrl.replace("/editorial/", "/aprovacoes/"));
  await page.getByRole("button", { name: "Autorizar e liberar" }).click();
  await ok(page, /liberado/);

  // 9. editor (equipe) gera PDF final e registra publicação manual
  await login(page, "editor");
  await page.goto(pautaUrl);
  const pdf = await page.request.get(`${pautaUrl}/pdf?final=1`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.reload();
  await expect(page.getByText(/PDF final gerado em/)).toBeVisible();
  await page.getByLabel(/^Link da publicação/).fill("https://exemplo.invalid/post");
  await page.getByRole("button", { name: "Confirmar publicação" }).click();
  await ok(page, /Publicação registrada/);
  await expect(page.getByText("Publicações registradas")).toBeVisible();
});

test("11. leitor público não encontra conteúdo interno nem publicação com portal desativado", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByText(/\[TESTE E2E\]/)).toHaveCount(0);
  const slugRes = await page.goto(`/publicacoes/teste-e2e-pauta`);
  expect(slugRes?.status()).toBe(404);
  const internal = await page.request.get(`${pautaUrl}/pdf?final=1`, { maxRedirects: 0 });
  expect([302, 307, 401]).toContain(internal.status());
});
