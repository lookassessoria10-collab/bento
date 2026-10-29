import { beforeAll, describe, expect, it } from "vitest";
import { anon, as, expId, orgId, service, tag } from "./helpers";

let ORG: string;
let EXP1: string;

beforeAll(async () => {
  ORG = await orgId();
  EXP1 = await expId("EA360-001");
});

async function newResult() {
  const est = await as("estudante");
  const { data, error } = await est
    .from("result_summaries")
    .insert({ organization_id: ORG, experiment_id: EXP1, variavel: `Variável teste ${tag()}`, sintese: "[TESTE] síntese fictícia", situacao_analise: "preliminar" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

describe("resultados: conferência e validação científica", () => {
  it("fluxo correto e barreiras", async () => {
    const id = await newResult();
    const est = await as("estudante");
    const est2 = await as("estudante2");
    const pa = await as("pesquisador");
    const pb = await as("pesquisador2");

    // estudante não pode marcar como validado diretamente
    const { error: direct } = await est.from("result_summaries").update({ validacao_status: "validado" }).eq("id", id);
    expect(direct?.message).toMatch(/fluxo de revisão/);
    // autor não confere o próprio registro
    expect((await est.rpc("result_transition", { p_result: id, p_acao: "conferir" })).error?.message).toMatch(/outra pessoa/);
    // validar antes da conferência é bloqueado
    expect((await pa.rpc("result_transition", { p_result: id, p_acao: "validar", p_escopo: ["boletim"] })).error?.message).toMatch(/conferido/);
    expect((await est2.rpc("result_transition", { p_result: id, p_acao: "conferir" })).error).toBeNull();
    // pesquisador de outro estudo não valida (nem enxerga)
    expect((await pb.rpc("result_transition", { p_result: id, p_acao: "validar", p_escopo: ["boletim"] })).error).not.toBeNull();
    // estudante não valida cientificamente
    expect((await est2.rpc("result_transition", { p_result: id, p_acao: "validar", p_escopo: ["boletim"] })).error?.message).toMatch(/pesquisador responsável/);
    // admin também não
    expect((await (await as("admin")).rpc("result_transition", { p_result: id, p_acao: "validar", p_escopo: ["boletim"] })).error).not.toBeNull();
    expect((await pa.rpc("result_transition", { p_result: id, p_acao: "validar", p_escopo: ["boletim"] })).error).toBeNull();
    const { data: ok } = await est.from("result_summaries").select("validacao_status, escopo_divulgacao, versao_interpretacao").eq("id", id).single();
    expect(ok).toMatchObject({ validacao_status: "validado", versao_interpretacao: 1 });
    expect(ok!.escopo_divulgacao.sort()).toEqual(["boletim", "interno"]);

    // alterar a interpretação após validação invalida a validação e cria nova versão
    await est.from("result_summaries").update({ sintese: "[TESTE] síntese corrigida" }).eq("id", id);
    const { data: after } = await est.from("result_summaries").select("validacao_status, conferencia_status, escopo_divulgacao, versao_interpretacao").eq("id", id).single();
    expect(after).toMatchObject({ validacao_status: "nao_validado", conferencia_status: "pendente", versao_interpretacao: 2, escopo_divulgacao: ["interno"] });
  });
});

describe("motor de revisão editorial", () => {
  it("conferência → validação → revisão final → publicação, sem saltos", async () => {
    const est = await as("estudante");
    const est2 = await as("estudante2");
    const pa = await as("pesquisador");
    const pb = await as("pesquisador2");
    const coord = await as("coordenacao");
    const adm = await as("admin");
    const ed = await as("editor");

    // resultado validado para boletim e portal
    const rid = await newResult();
    await est2.rpc("result_transition", { p_result: rid, p_acao: "conferir" });
    await pa.rpc("result_transition", { p_result: rid, p_acao: "validar", p_escopo: ["boletim", "portal"] });

    const { data: item } = await est
      .from("editorial_items")
      .insert({ organization_id: ORG, tipo: "pauta", titulo: `[TESTE] Pauta ${tag()}`, canais: ["portal"], requer_validacao_cientifica: true, status: "liberado", draft: { blocks: [{ tipo: "paragrafo", texto: "texto" }] } })
      .select("id, status")
      .single();
    // o cliente não consegue criar conteúdo já liberado
    expect(item!.status).toBe("rascunho");
    await est.from("editorial_sources").insert({ organization_id: ORG, item_id: item!.id, experiment_id: EXP1, result_id: rid });

    // publicar sem aprovação é bloqueado
    const blocked = await est.rpc("register_publication", { p_item: item!.id, p_canal: "portal", p_data: "2026-11-01", p_slug: "teste" });
    expect(blocked.error?.message).toMatch(/não foi liberado/);
    // decisão sem envio é bloqueada
    expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).error).not.toBeNull();

    // responsável pelo experimento citado enxerga o conteúdo; pesquisador de outro estudo não
    expect((await pa.from("editorial_items").select("id").eq("id", item!.id)).data).toHaveLength(1);
    expect((await pb.from("editorial_items").select("id").eq("id", item!.id)).data).toEqual([]);

    const { data: v1 } = await est.rpc("submit_for_review", { p_item: item!.id });
    expect(v1).toBeTruthy();
    // autor não confere
    expect((await est.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).error?.message).toMatch(/outra pessoa/);
    // devolução exige justificativa
    expect((await est2.rpc("workflow_decide", { p_item: item!.id, p_decisao: "ajustes" })).error?.message).toMatch(/justificativa/);
    expect((await est2.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).data).toBe("aguardando_validacao");

    // validação científica: só o responsável pelo experimento citado
    expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).error?.message).toMatch(/responsável ou revisor delegado/);
    expect((await pb.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).error).not.toBeNull();
    expect((await pa.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).data).toBe("validado");

    // revisão final: admin e editor sem delegação não podem; coordenação pode, com canal
    expect((await adm.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado", p_canais: ["portal"] })).error?.message).toMatch(/coordenação ou delegação/);
    expect((await ed.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado", p_canais: ["portal"] })).error).not.toBeNull();
    expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado", p_canais: [] })).error?.message).toMatch(/canal/);
    // canal não autorizado pelo pesquisador (instagram) bloqueia a liberação
    expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado", p_canais: ["instagram"] })).error?.message).toMatch(/não autorizado para o canal/);
    expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado", p_canais: ["portal"] })).data).toBe("liberado");

    // decisões assinadas por versão
    const { data: decs } = await coord.from("approval_decisions").select("etapa, decisao, version_id, decidido_por, version_hash").eq("item_id", item!.id);
    expect(decs!.map((d) => d.etapa).sort()).toEqual(["conferencia", "revisao_final", "validacao_cientifica"]);
    expect(new Set(decs!.map((d) => d.version_id)).size).toBe(1);

    // publicação em canal não liberado é bloqueada; no canal liberado funciona
    expect((await est.rpc("register_publication", { p_item: item!.id, p_canal: "instagram", p_data: "2026-11-02" })).error?.message).toMatch(/não foi liberada para o canal/);
    const slug = `teste-${tag()}`;
    const { data: pubId, error: pubErr } = await est.rpc("register_publication", { p_item: item!.id, p_canal: "portal", p_data: "2026-11-02", p_slug: slug });
    expect(pubErr).toBeNull();

    // portal desativado: anônimo não vê; ativado: vê o snapshot (sem fontes internas)
    expect((await anon().from("public_publications").select("id").eq("slug", slug)).data).toEqual([]);
    await service().from("project_settings").update({ portal_publico_ativo: true }).eq("organization_id", ORG);
    try {
      const { data: pub } = await anon().from("public_publications").select("titulo, content").eq("slug", slug).single();
      expect(pub!.titulo).toMatch(/\[TESTE\]/);
      expect(JSON.stringify(pub!.content)).not.toContain("sources");

      // editar o conteúdo após a publicação reabre o ciclo; nova versão não herda a liberação
      await est.from("editorial_items").update({ draft: { blocks: [{ tipo: "paragrafo", texto: "texto alterado" }] } }).eq("id", item!.id);
      const { data: st } = await est.from("editorial_items").select("status").eq("id", item!.id).single();
      expect(st!.status).toBe("rascunho");
      const { data: v2 } = await est.rpc("submit_for_review", { p_item: item!.id });
      expect(v2).not.toBe(v1);
      expect((await est.rpc("register_publication", { p_item: item!.id, p_canal: "portal", p_data: "2026-11-03", p_slug: slug })).error).not.toBeNull();
      // a publicação anterior segue a versão aprovada até ser revogada
      const { data: still } = await anon().from("public_publications").select("versao").eq("slug", slug).single();
      expect(still!.versao).toBe(1);

      // revogação: somente coordenação; some do portal imediatamente
      expect((await est.rpc("revoke_publication", { p_publication: pubId!, p_motivo: "teste" })).error).not.toBeNull();
      expect((await coord.rpc("revoke_publication", { p_publication: pubId!, p_motivo: "teste de revogação", p_errata: "Errata de teste" })).error).toBeNull();
      expect((await anon().from("public_publications").select("id").eq("slug", slug)).data).toEqual([]);
    } finally {
      await service().from("project_settings").update({ portal_publico_ativo: false }).eq("organization_id", ORG);
    }
  });

  it("separação das decisões mesmo quando a mesma pessoa valida e revisa", async () => {
    // coordenação como revisora delegada do experimento valida e depois revisa: duas decisões registradas
    const est = await as("estudante");
    const est2 = await as("estudante2");
    const coord = await as("coordenacao");
    const svc = service();
    const { data: m } = await svc.from("experiment_members").insert({ organization_id: ORG, experiment_id: EXP1, user_id: "00000000-0000-4000-a000-000000000002", acesso: "revisor" }).select("id").single();
    try {
      const { data: item } = await est.from("editorial_items").insert({ organization_id: ORG, tipo: "pauta", titulo: `[TESTE] Dupla ${tag()}`, canais: ["interno"] }).select("id").single();
      await est.from("editorial_sources").insert({ organization_id: ORG, item_id: item!.id, experiment_id: EXP1 });
      await est.rpc("submit_for_review", { p_item: item!.id });
      await est2.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" });
      expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" })).data).toBe("validado");
      expect((await coord.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado", p_canais: ["interno"] })).data).toBe("liberado");
      const { data: decs } = await coord.from("approval_decisions").select("etapa").eq("item_id", item!.id);
      expect(decs).toHaveLength(3);
    } finally {
      await svc.from("experiment_members").delete().eq("id", m!.id);
    }
  });

  it("validação externa exige comprovante e pessoa responsável", async () => {
    const est = await as("estudante");
    const est2 = await as("estudante2");
    const { data: item } = await est.from("editorial_items").insert({ organization_id: ORG, tipo: "pauta", titulo: `[TESTE] Externa ${tag()}`, canais: ["interno"] }).select("id").single();
    await est.from("editorial_sources").insert({ organization_id: ORG, item_id: item!.id, experiment_id: EXP1 });
    await est.rpc("submit_for_review", { p_item: item!.id });
    await est2.rpc("workflow_decide", { p_item: item!.id, p_decisao: "aprovado" });
    const { data: pa } = await service().from("people").select("id").eq("nome", "Pesquisador Teste A").single();
    const { data: other } = await service().from("people").select("id").eq("nome", "Sofia Mota").single();
    const { data: file } = await est.from("files").insert({ organization_id: ORG, nome_amigavel: "[TESTE] e-mail de confirmação", tipo: "autorizacao", external_url: "https://exemplo.invalid/comprovante" }).select("id").single();
    expect((await est.rpc("register_external_validation", { p_item: item!.id, p_person: other!.id, p_comprovante: file!.id, p_metodo: "e-mail", p_data: "2026-11-01" })).error?.message).toMatch(/não é responsável/);
    expect((await est.rpc("register_external_validation", { p_item: item!.id, p_person: pa!.id, p_comprovante: file!.id, p_metodo: "", p_data: "2026-11-01" })).error).not.toBeNull();
    expect((await est.rpc("register_external_validation", { p_item: item!.id, p_person: pa!.id, p_comprovante: file!.id, p_metodo: "e-mail institucional", p_data: "2026-11-01" })).error).toBeNull();
    const { data: d } = await est.from("approval_decisions").select("externo, pessoa_externa_id, comprovante_file_id").eq("item_id", item!.id).eq("etapa", "validacao_cientifica").single();
    expect(d).toMatchObject({ externo: true, pessoa_externa_id: pa!.id, comprovante_file_id: file!.id });
  });

  it("conteúdo educativo sem experimento: só o revisor designado valida (regressão de NULL)", async () => {
    const est = await as("estudante");
    const est2 = await as("estudante2");
    const coord = await as("coordenacao");
    const pa = await as("pesquisador");
    // sem revisor designado: ninguém valida
    const { data: a } = await est.from("editorial_items").insert({ organization_id: ORG, tipo: "pauta", titulo: `[TESTE] Educativo ${tag()}`, canais: ["interno"] }).select("id").single();
    await est.from("editorial_sources").insert({ organization_id: ORG, item_id: a!.id, referencia: "Referência técnica de teste" });
    await est.rpc("submit_for_review", { p_item: a!.id });
    await est2.rpc("workflow_decide", { p_item: a!.id, p_decisao: "aprovado" });
    expect((await coord.rpc("workflow_decide", { p_item: a!.id, p_decisao: "aprovado" })).error?.message).toMatch(/revisor científico designado/);
    // com revisor designado (pesquisador A): só ele valida
    const { data: b } = await est
      .from("editorial_items")
      .insert({ organization_id: ORG, tipo: "pauta", titulo: `[TESTE] Educativo 2 ${tag()}`, canais: ["interno"], revisor_cientifico: "00000000-0000-4000-a000-000000000003" })
      .select("id")
      .single();
    await est.rpc("submit_for_review", { p_item: b!.id });
    await est2.rpc("workflow_decide", { p_item: b!.id, p_decisao: "aprovado" });
    expect((await coord.rpc("workflow_decide", { p_item: b!.id, p_decisao: "aprovado" })).error).not.toBeNull();
    expect((await pa.rpc("workflow_decide", { p_item: b!.id, p_decisao: "aprovado" })).data).toBe("validado");
  });

  it("versões são imutáveis", async () => {
    const coord = await as("coordenacao");
    const { data: v } = await coord.from("editorial_versions").select("id").limit(1).single();
    const { data } = await coord.from("editorial_versions").update({ content: {} }).eq("id", v!.id).select("id");
    expect(data ?? []).toEqual([]);
    const { error } = await service().from("editorial_versions").update({ content: {} }).eq("id", v!.id);
    expect(error?.message).toMatch(/imutável/);
  });
});

describe("fichas de visita", () => {
  it("planejar → realizar → enviar → conferir → finalizar", async () => {
    const est = await as("estudante");
    const est2 = await as("estudante2");
    const { data: v } = await est.from("visit_schedules").insert({ organization_id: ORG, titulo: `[TESTE] Visita ${tag()}`, data_hora: new Date().toISOString() }).select("id").single();
    await est.from("visit_schedule_experiments").insert({ visit_id: v!.id, experiment_id: EXP1, organization_id: ORG });
    const { data: r } = await est.from("visit_records").insert({ organization_id: ORG, visit_id: v!.id, experiment_id: EXP1, status: "finalizada" }).select("id, status").single();
    expect(r!.status).toBe("rascunho"); // cliente não cria ficha já finalizada
    // ficha duplicada para o mesmo experimento na mesma visita é recusada
    expect((await est.from("visit_records").insert({ organization_id: ORG, visit_id: v!.id, experiment_id: EXP1 })).error).not.toBeNull();
    // não envia antes de a visita ser realizada
    expect((await est.rpc("visit_record_transition", { p_record: r!.id, p_acao: "enviar" })).error?.message).toMatch(/realizada/);
    // adiar exige motivo
    expect((await est.from("visit_schedules").update({ status: "adiada" }).eq("id", v!.id)).error).not.toBeNull();
    await est.from("visit_schedules").update({ status: "realizada" }).eq("id", v!.id);
    // ocorrência relatada exige identificar quem informou
    await est.from("visit_records").update({ ocorrencias_relatadas: "[TESTE] ocorrência", etapa_atual: "x" }).eq("id", r!.id);
    expect((await est.rpc("visit_record_transition", { p_record: r!.id, p_acao: "enviar" })).error?.message).toMatch(/quem informou/);
    await est.from("visit_records").update({ informante_descricao: "Pesquisador Teste A" }).eq("id", r!.id);
    expect((await est.rpc("visit_record_transition", { p_record: r!.id, p_acao: "enviar" })).data).toBe("preenchida");
    expect((await est.rpc("visit_record_transition", { p_record: r!.id, p_acao: "conferir" })).error?.message).toMatch(/outra pessoa/);
    expect((await est2.rpc("visit_record_transition", { p_record: r!.id, p_acao: "conferir" })).data).toBe("conferida");
    // ficha conferida não é editada diretamente
    expect((await est.from("visit_records").update({ etapa_atual: "mudou" }).eq("id", r!.id)).error).not.toBeNull();
    expect((await est2.rpc("visit_record_transition", { p_record: r!.id, p_acao: "finalizar" })).data).toBe("finalizada");
  });
});

describe("rotinas recorrentes", () => {
  it("não criam duplicatas", async () => {
    const est = await as("estudante");
    const { data: n1 } = await est.rpc("generate_recurring_tasks", { p_org: ORG, p_mes: "2030-01-01" });
    const { data: n2 } = await est.rpc("generate_recurring_tasks", { p_org: ORG, p_mes: "2030-01-01" });
    expect(n1).toBeGreaterThan(0);
    expect(n2).toBe(0);
  });
});
