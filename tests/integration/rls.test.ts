import { beforeAll, describe, expect, it } from "vitest";
import { anon, as, expId, orgId, service, tag, uid } from "./helpers";

let ORG: string;
let EXP1: string; // EA360-001 (colaboradores; proprietário = pesquisador A)
let EXP2: string; // EA360-002 (privado_equipe; proprietário = pesquisador B)

beforeAll(async () => {
  ORG = await orgId();
  EXP1 = await expId("EA360-001");
  EXP2 = await expId("EA360-002");
});

describe("isolamento entre organizações", () => {
  it("usuário da organização B não vê dados da A", async () => {
    const b = await as("outraorg");
    const { data } = await b.from("experiments").select("codigo");
    expect(data?.map((d) => d.codigo)).toEqual(["TSTB-001"]);
    const { data: people } = await b.from("people").select("id").eq("organization_id", ORG);
    expect(people).toEqual([]);
  });

  it("usuário da A não vê dados da B e não grava na B", async () => {
    const a = await as("coordenacao");
    const orgB = await orgId("org-teste-b");
    const { data } = await a.from("experiments").select("codigo").eq("organization_id", orgB);
    expect(data).toEqual([]);
    const { error } = await a.from("experiments").insert({ organization_id: orgB, titulo: "Invasão", codigo: "", codigo_seq: 0 });
    expect(error).not.toBeNull();
  });

  it("FK composta impede vincular registro da A a objeto da B", async () => {
    const orgB = await orgId("org-teste-b");
    const { data: expB } = await service().from("experiments").select("id").eq("organization_id", orgB).single();
    const est = await as("estudante");
    const { error } = await est.from("result_summaries").insert({ organization_id: ORG, experiment_id: expB!.id, variavel: "x" });
    expect(error).not.toBeNull();
  });
});

describe("acesso por participação no experimento", () => {
  it("pesquisador B não lê o experimento nem resultados do pesquisador A", async () => {
    const pb = await as("pesquisador2");
    const { data } = await pb.from("experiments").select("codigo");
    expect(data?.map((d) => d.codigo)).toEqual(["EA360-002"]);
    const { data: res } = await pb.from("result_summaries").select("id").eq("experiment_id", EXP1);
    expect(res).toEqual([]);
  });

  it("estudo privado não aparece para estudante sem vínculo, mas aparece para a coordenação", async () => {
    const est = await as("estudante");
    const { data } = await est.from("experiments").select("id").eq("id", EXP2);
    expect(data).toEqual([]);
    const coord = await as("coordenacao");
    const { data: c } = await coord.from("experiments").select("id").eq("id", EXP2);
    expect(c).toHaveLength(1);
  });

  it("leitor vê apenas o que foi compartilhado e não grava", async () => {
    const l = await as("leitor");
    const { data } = await l.from("experiments").select("codigo");
    expect(data?.map((d) => d.codigo)).toEqual(["EA360-001"]);
    const { error } = await l.from("experiments").insert({ organization_id: ORG, titulo: "Leitor não cria", codigo: "", codigo_seq: 0 });
    expect(error).not.toBeNull();
    const { data: upd } = await l.from("experiments").update({ titulo: "alterado" }).eq("id", EXP1).select("id");
    expect(upd).toEqual([]);
  });

  it("contatos de pessoas ficam restritos à equipe", async () => {
    const pa = await as("pesquisador");
    const { data, error } = await pa.from("people_contacts").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("códigos de experimento", () => {
  it("são gerados no banco, sequenciais e não manipuláveis", async () => {
    const est = await as("estudante");
    const t = tag();
    const { data: a } = await est.from("experiments").insert({ organization_id: ORG, titulo: `Teste código A ${t}`, codigo: "HACK-999", codigo_seq: 999 }).select("id, codigo, codigo_seq").single();
    const { data: b } = await est.from("experiments").insert({ organization_id: ORG, titulo: `Teste código B ${t}`, codigo: "", codigo_seq: 0 }).select("id, codigo, codigo_seq").single();
    expect(a!.codigo).toMatch(/^EA360-\d{3}$/);
    expect(b!.codigo_seq).toBe(a!.codigo_seq + 1);
    const { error } = await est.from("experiments").update({ codigo: "EA360-001" }).eq("id", a!.id);
    expect(error?.message).toMatch(/não podem ser alterados/);
    // arquivamento não reutiliza código
    await est.from("experiments").update({ archived_at: new Date().toISOString() }).eq("id", b!.id);
    const { data: c } = await est.from("experiments").insert({ organization_id: ORG, titulo: `Teste código C ${t}`, codigo: "", codigo_seq: 0 }).select("codigo_seq").single();
    expect(c!.codigo_seq).toBe(b!.codigo_seq + 1);
  });

  it("autoria é definida pelo servidor", async () => {
    const est = await as("estudante");
    const { data } = await est.from("experiments").insert({ organization_id: ORG, titulo: `Autoria ${tag()}`, codigo: "", codigo_seq: 0, created_by: uid(2) }).select("created_by").single();
    expect(data!.created_by).toBe(uid(5));
  });
});

describe("contas, papéis e convites", () => {
  it("usuário não eleva o próprio papel", async () => {
    const est = await as("estudante");
    const { error } = await est.from("memberships").insert({ organization_id: ORG, user_id: uid(5), role: "admin" });
    expect(error).not.toBeNull();
    const adm = await as("admin");
    const { data: own } = await adm.from("memberships").select("id").eq("user_id", uid(1)).single();
    const { data: upd } = await adm.from("memberships").update({ status: "ativo" }).eq("id", own!.id).select("id");
    expect(upd).toEqual([]); // admin não altera o próprio vínculo
  });

  it("estudante não lê convites; perfil não altera situação da conta", async () => {
    const est = await as("estudante");
    const { data } = await est.from("invitations").select("id");
    expect(data).toEqual([]);
    const { error } = await est.from("profiles").update({ situacao: "ativa" }).eq("id", uid(5));
    expect(error).not.toBeNull();
  });

  it("convite com token inválido ou de outro e-mail é recusado", async () => {
    const est = await as("estudante");
    const { error } = await est.rpc("accept_invitation", { p_token: "token-invalido-com-mais-de-20-caracteres" });
    expect(error?.message).toMatch(/inválido|expirado/);
  });

  it("usuário suspenso perde o acesso imediatamente", async () => {
    const svc = service();
    const { data: m } = await svc.from("memberships").select("id").eq("user_id", uid(6)).single();
    await svc.from("memberships").update({ status: "suspenso" }).eq("id", m!.id);
    const e2 = await as("estudante2");
    const { data } = await e2.from("experiments").select("id");
    expect(data).toEqual([]);
    await svc.from("memberships").update({ status: "ativo" }).eq("id", m!.id);
    const { data: back } = await e2.from("experiments").select("id").limit(1);
    expect(back!.length).toBe(1);
  });
});

describe("tabelas protegidas e anônimos", () => {
  it("anônimo não lê dados internos", async () => {
    const a = anon();
    for (const t of ["experiments", "people", "files", "tasks", "editorial_items", "result_summaries"] as const) {
      const { data } = await a.from(t).select("id").limit(1);
      expect(data ?? []).toEqual([]);
    }
  });

  it("clientes não inserem decisões, versões, publicações nem auditoria", async () => {
    const coord = await as("coordenacao");
    const { data: item } = await service().from("editorial_items").select("id").limit(1).single();
    const r1 = await coord.from("approval_decisions").insert({ organization_id: ORG, item_id: item!.id, version_id: item!.id, etapa: "revisao_final", decisao: "aprovado", decidido_por: uid(2), papel: "x", version_hash: "x" });
    expect(r1.error).not.toBeNull();
    const r2 = await coord.from("activity_log").insert({ organization_id: ORG, entidade: "x", acao: "x" });
    expect(r2.error).not.toBeNull();
    const r3 = await coord.from("public_publications").insert({ organization_id: ORG, publication_id: item!.id, slug: "hack", tipo: "pauta", titulo: "x", content: {}, versao: 1 });
    expect(r3.error).not.toBeNull();
  });

  it("feedback público é recusado com portal desativado", async () => {
    const { error } = await anon().rpc("submit_feedback", {
      p_org_slug: "entomo-agro-360",
      p_publication: uid(1),
      p_clareza: 5,
      p_utilidade: 5,
      p_comentario: "",
      p_sugestao: "",
      p_perfil: "outro",
      p_consentimento: true,
      p_origem_hash: "h",
    });
    expect(error).not.toBeNull();
  });
});
