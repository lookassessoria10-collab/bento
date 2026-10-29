import type { Metadata } from "next";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { AUTH_TYPE_LABELS, INSTITUTIONAL_LABELS } from "@/lib/labels";
import { listFarms, listMembers, memberOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, Checkbox, Field, Input, PageHeader, Select, StatusBadge, Tabs, Textarea, optionsFrom } from "@/components/ui";
import {
  addMilestoneMonth,
  saveArea,
  saveAuthorization,
  saveFarm,
  saveMilestone,
  saveProjectSettings,
  saveRoutine,
  saveTemplate,
  switchOrganization,
  toggleRoutine,
} from "./actions";

export const metadata: Metadata = { title: "Configurações" };

const TABS = [
  ["projeto", "Projeto e piloto"],
  ["institucional", "Situação institucional"],
  ["fazenda", "Fazenda e áreas"],
  ["roteiros", "Roteiros e rotinas"],
  ["piloto", "Marcos do piloto"],
  ["auditoria", "Auditoria"],
] as const;

export default async function SettingsPage({ searchParams }: PageProps<"/app/configuracoes">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.aba) ? String(sp.aba) : "projeto";
  const admin = has(ctx, "configuracoes.editar");
  const manager = has(ctx, "institucional.editar");

  return (
    <>
      <PageHeader title="Configurações" description="Projeto, piloto, política de publicação, identidade institucional e cadastros de apoio." />
      <Tabs current={tab} tabs={TABS.map(([k, l]) => ({ key: k, label: l, href: `/app/configuracoes?aba=${k}` }))} />
      {tab === "projeto" && <Project />}
      {tab === "institucional" && <Institutional />}
      {tab === "fazenda" && <Farm />}
      {tab === "roteiros" && <Templates />}
      {tab === "piloto" && <Pilot />}
      {tab === "auditoria" && <Audit />}
    </>
  );

  async function Project() {
    const { data: s } = await ctx.supabase.from("project_settings").select("*").eq("organization_id", ctx.orgId).single();
    if (!s) return null;
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Projeto e piloto" description="O início real do piloto é configurado aqui — não é presumido." />
          <CardBody>
            <ActionForm action={saveProjectSettings} className="grid gap-3 md:grid-cols-2">
              <fieldset disabled={!admin} className="contents">
                <Field label="Nome do projeto" name="nome_projeto" required>
                  <Input name="nome_projeto" defaultValue={s.nome_projeto} required />
                </Field>
                <Field label="Assinatura da plataforma" name="assinatura" required>
                  <Input name="assinatura" defaultValue={s.assinatura} required />
                </Field>
                <Field label="Início real do piloto" name="piloto_inicio">
                  <Input name="piloto_inicio" type="date" defaultValue={s.piloto_inicio ?? ""} />
                </Field>
                <Field label="Duração (meses)" name="piloto_meses">
                  <Input name="piloto_meses" type="number" min={1} max={36} defaultValue={s.piloto_meses} />
                </Field>
                <Field label="Prorrogação (meses)" name="piloto_prorrogacao_meses">
                  <Input name="piloto_prorrogacao_meses" type="number" min={0} max={36} defaultValue={s.piloto_prorrogacao_meses} />
                </Field>
                <Field label="Meta de boletins" name="meta_boletins">
                  <Input name="meta_boletins" type="number" min={0} defaultValue={s.meta_boletins} />
                </Field>
                <Field label="Limite de upload (MB)" name="limite_upload_mb">
                  <Input name="limite_upload_mb" type="number" min={1} max={50} defaultValue={s.limite_upload_mb} />
                </Field>
                <Field label="Contato institucional público (aprovado)" name="contato_institucional">
                  <Input name="contato_institucional" defaultValue={s.contato_institucional ?? ""} placeholder="Nunca telefones pessoais" />
                </Field>
                <Field label="Política editorial" name="politica_editorial" className="md:col-span-2">
                  <Textarea name="politica_editorial" rows={3} defaultValue={s.politica_editorial ?? ""} />
                </Field>
                <div className="space-y-2 md:col-span-2">
                  <Checkbox name="portal_publico_ativo" label="Ativar portal público (somente após autorização institucional)" defaultChecked={s.portal_publico_ativo} />
                  <Checkbox name="feedback_publico_ativo" label="Ativar formulário público de feedback" defaultChecked={s.feedback_publico_ativo} />
                  <Checkbox name="exibir_marcas_institucionais" label="Exibir nomes/marcas institucionais no portal (exige autorização registrada)" defaultChecked={s.exibir_marcas_institucionais} />
                  <Checkbox name="onboarding_concluido" label="Ocultar o guia de primeiros passos" defaultChecked={s.onboarding_concluido} />
                </div>
                {admin && (
                  <div>
                    <SubmitButton>Salvar configurações</SubmitButton>
                  </div>
                )}
              </fieldset>
            </ActionForm>
            {!admin && <p className="mt-3 text-sm text-muted">Somente administradores alteram estas configurações.</p>}
          </CardBody>
        </Card>
        <div className="space-y-5">
          {ctx.organizations.length > 1 && (
            <Card>
              <CardHeader title="Organização ativa" />
              <CardBody>
                <ActionForm action={switchOrganization} className="space-y-2">
                  <Select name="org" aria-label="Organização" defaultValue={ctx.orgId} options={ctx.organizations.map((o) => ({ value: o.id, label: o.nome }))} />
                  <SubmitButton size="sm" variant="secondary">
                    Trocar
                  </SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Backup e exportação" />
            <CardBody className="space-y-2 text-sm">
              <p>Exportações CSV estão em Experimentos e Relatórios. CSV não é backup completo do banco.</p>
              <p className="text-muted">O backup gerenciado e a restauração dependem do plano Supabase contratado; veja docs/deploy.md e docs/operacao.md.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  async function Institutional() {
    const [{ data: org }, { data: auths }, { data: docs }] = await Promise.all([
      ctx.supabase.from("organizations").select("status_institucional").eq("id", ctx.orgId).single(),
      ctx.supabase.from("institutional_authorizations").select("*").eq("organization_id", ctx.orgId).order("created_at"),
      ctx.supabase.from("files").select("id, nome_amigavel").eq("organization_id", ctx.orgId).in("tipo", ["autorizacao", "documento_institucional"]).is("deleted_at", null),
    ]);
    const st = org?.status_institucional ?? "em_alinhamento";
    return (
      <div className="space-y-5">
        <Alert tone={st === "autorizado" ? "success" : "warning"} title={`Situação institucional: ${INSTITUTIONAL_LABELS[st as keyof typeof INSTITUTIONAL_LABELS]}`}>
          A proposta não comprova adesão formal da fazenda, uso de marcas, credenciamento, autorização de publicação nem acesso à base original. Registre cada autorização somente com documento comprobatório.
        </Alert>
        <div className="grid gap-4 md:grid-cols-2">
          {(auths ?? []).map((a) => (
            <Card key={a.id}>
              <CardHeader title={AUTH_TYPE_LABELS[a.tipo as keyof typeof AUTH_TYPE_LABELS]} description={a.descricao ?? undefined} actions={<StatusBadge status={a.status} label={INSTITUTIONAL_LABELS[a.status as keyof typeof INSTITUTIONAL_LABELS]} />} />
              <CardBody>
                <ActionForm action={saveAuthorization} className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="tipo" value={a.tipo} />
                  <input type="hidden" name="descricao" value={a.descricao ?? ""} />
                  <fieldset disabled={!manager} className="contents">
                    <Field label="Situação" name="status">
                      <Select name="status" id={`st-${a.id}`} defaultValue={a.status} options={optionsFrom({ em_alinhamento: "Em alinhamento", autorizado: "Autorizado", negado: "Negado", expirado: "Expirado" })} />
                    </Field>
                    <Field label="Concedido por" name="concedido_por">
                      <Input name="concedido_por" id={`cp-${a.id}`} defaultValue={a.concedido_por ?? ""} />
                    </Field>
                    <Field label="Data da decisão" name="data_decisao">
                      <Input name="data_decisao" id={`dd-${a.id}`} type="date" defaultValue={a.data_decisao ?? ""} />
                    </Field>
                    <Field label="Validade" name="validade">
                      <Input name="validade" id={`va-${a.id}`} type="date" defaultValue={a.validade ?? ""} />
                    </Field>
                    <Field label="Documento comprobatório" name="documento_file_id" className="sm:col-span-2">
                      <Select name="documento_file_id" id={`doc-${a.id}`} defaultValue={a.documento_file_id ?? ""} options={(docs ?? []).map((d) => ({ value: d.id, label: d.nome_amigavel }))} placeholder="Nenhum (envie na Biblioteca)" />
                    </Field>
                    <Field label="Observações" name="observacoes" className="sm:col-span-2">
                      <Input name="observacoes" id={`ob-${a.id}`} defaultValue={a.observacoes ?? ""} />
                    </Field>
                    {manager && (
                      <div>
                        <SubmitButton size="sm">Salvar</SubmitButton>
                      </div>
                    )}
                  </fieldset>
                </ActionForm>
                <p className="mt-2 text-xs text-muted">Atualizado em {fmtDateTime(a.updated_at)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  async function Farm() {
    const farms = await listFarms(ctx);
    const farmMgr = has(ctx, "fazenda.gerenciar");
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {farms.map((f) => (
          <Card key={f.id}>
            <CardHeader title={f.nome} description={`${f.municipio ?? ""}${f.uf ? `/${f.uf}` : ""}`} />
            <CardBody className="space-y-4">
              <ul className="text-sm">
                {f.farm_areas.map((a) => (
                  <li key={a.id}>
                    {a.nome} <span className="text-xs text-muted">({a.tipo})</span>
                  </li>
                ))}
                {!f.farm_areas.length && <li className="text-muted">Nenhuma área cadastrada.</li>}
              </ul>
              {has(ctx, "pessoas.gerenciar") && (
                <ActionForm action={saveArea} resetOnSuccess className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="farm_id" value={f.id} />
                  <Field label="Nova área / talhão" name="nome" required>
                    <Input name="nome" id={`an-${f.id}`} required />
                  </Field>
                  <Field label="Tipo" name="tipo">
                    <Select name="tipo" id={`at-${f.id}`} options={optionsFrom({ talhao: "Talhão", setor: "Setor", campo: "Campo", estufa: "Estufa", laboratorio: "Laboratório", outro: "Outro" })} />
                  </Field>
                  <Field label="Latitude (opcional)" name="latitude">
                    <Input name="latitude" id={`la-${f.id}`} type="number" step="0.000001" />
                  </Field>
                  <Field label="Longitude (opcional)" name="longitude">
                    <Input name="longitude" id={`lo-${f.id}`} type="number" step="0.000001" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Checkbox id={`ca-${f.id}`} name="coordenadas_autorizadas" label="Coordenadas fornecidas e autorizadas (continuam privadas)" />
                  </div>
                  <div>
                    <SubmitButton size="sm" variant="secondary">
                      Adicionar área
                    </SubmitButton>
                  </div>
                </ActionForm>
              )}
            </CardBody>
          </Card>
        ))}
        {farmMgr && (
          <Card>
            <CardHeader title="Nova fazenda / unidade" />
            <CardBody>
              <ActionForm action={saveFarm} resetOnSuccess className="grid gap-2 sm:grid-cols-2">
                <Field label="Nome" name="nome" required>
                  <Input name="nome" required />
                </Field>
                <Field label="Município" name="municipio">
                  <Input name="municipio" />
                </Field>
                <Field label="UF" name="uf">
                  <Input name="uf" maxLength={2} />
                </Field>
                <Field label="Descrição" name="descricao">
                  <Input name="descricao" />
                </Field>
                <div className="sm:col-span-2">
                  <Checkbox name="adesao_formal" label="Adesão formal registrada" />
                </div>
                <SubmitButton size="sm">Cadastrar</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  async function Templates() {
    const [{ data: templates }, { data: routines }, members] = await Promise.all([
      ctx.supabase.from("visit_checklist_templates").select("id, nome, itens, ativo").eq("organization_id", ctx.orgId),
      ctx.supabase.from("recurring_routines").select("id, titulo, regra, dia_prazo, ativo").eq("organization_id", ctx.orgId),
      listMembers(ctx),
    ]);
    const team = has(ctx, "visitas.gerenciar");
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Roteiros de visita (checklist)" description="Um item por linha." />
          <CardBody className="space-y-4">
            {(templates ?? []).map((t) => (
              <ActionForm key={t.id} action={saveTemplate} className="space-y-2 rounded-lg border border-border p-3">
                <input type="hidden" name="id" value={t.id} />
                <Field label="Nome" name="nome">
                  <Input name="nome" id={`tn-${t.id}`} defaultValue={t.nome} disabled={!team} />
                </Field>
                <Field label="Itens" name="itens">
                  <Textarea name="itens" id={`ti-${t.id}`} rows={8} defaultValue={(t.itens as string[]).join("\n")} disabled={!team} />
                </Field>
                {team && <SubmitButton size="sm">Salvar roteiro</SubmitButton>}
              </ActionForm>
            ))}
            {team && (
              <ActionForm action={saveTemplate} resetOnSuccess className="space-y-2">
                <Field label="Novo roteiro" name="nome">
                  <Input name="nome" id="tn-novo" required />
                </Field>
                <Field label="Itens" name="itens">
                  <Textarea name="itens" id="ti-novo" rows={4} />
                </Field>
                <SubmitButton size="sm" variant="secondary">
                  Criar roteiro
                </SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Rotinas recorrentes" description="Geradas sob demanda em Atividades › Gerar rotinas do mês, sem duplicatas." />
          <CardBody className="space-y-3">
            {(routines ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span>
                  {r.titulo} <span className="text-xs text-muted">({r.regra === "mensal_por_experimento" ? "por experimento ativo" : "única"} · prazo dia {r.dia_prazo})</span>
                </span>
                {team && (
                  <ActionForm action={toggleRoutine}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="ativo" value={r.ativo ? "false" : "true"} />
                    <SubmitButton size="sm" variant="ghost">
                      {r.ativo ? "Desativar" : "Ativar"}
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            ))}
            {team && (
              <ActionForm action={saveRoutine} resetOnSuccess className="grid gap-2 sm:grid-cols-2">
                <Field label="Título" name="titulo" required>
                  <Input name="titulo" required />
                </Field>
                <Field label="Regra" name="regra">
                  <Select name="regra" options={optionsFrom({ mensal_por_experimento: "Mensal, por experimento ativo", mensal_unica: "Mensal, única" })} />
                </Field>
                <Field label="Dia do prazo" name="dia_prazo">
                  <Input name="dia_prazo" type="number" min={1} max={28} defaultValue={25} />
                </Field>
                <Field label="Responsável" name="responsavel_id">
                  <Select name="responsavel_id" options={memberOptions(members)} placeholder="—" />
                </Field>
                <SubmitButton size="sm" variant="secondary">
                  Criar rotina
                </SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  async function Pilot() {
    const { data: ms } = await ctx.supabase.from("pilot_milestones").select("*").eq("organization_id", ctx.orgId).order("mes");
    const team = has(ctx, "piloto.editar");
    return (
      <div className="space-y-4">
        {(ms ?? []).map((m) => (
          <Card key={m.id}>
            <CardBody>
              <ActionForm action={saveMilestone} className="grid gap-2 md:grid-cols-6">
                <input type="hidden" name="id" value={m.id} />
                <p className="font-semibold text-brand-800 md:col-span-6">Mês {m.mes}{m.concluido_em ? ` · concluído em ${fmtDate(m.concluido_em)}` : ""}</p>
                <fieldset disabled={!team} className="contents">
                  <Field label="Título" name="titulo" className="md:col-span-2">
                    <Input name="titulo" id={`mt-${m.id}`} defaultValue={m.titulo} />
                  </Field>
                  <Field label="Situação" name="status">
                    <Select name="status" id={`ms-${m.id}`} defaultValue={m.status} options={optionsFrom({ previsto: "Previsto", em_andamento: "Em andamento", concluido: "Concluído", replanejado: "Replanejado" })} />
                  </Field>
                  <Field label="Descrição" name="descricao" className="md:col-span-3">
                    <Input name="descricao" id={`md-${m.id}`} defaultValue={m.descricao ?? ""} />
                  </Field>
                  <Field label="Observação" name="observacao" className="md:col-span-5">
                    <Input name="observacao" id={`mo-${m.id}`} defaultValue={m.observacao ?? ""} />
                  </Field>
                  {team && (
                    <div className="flex items-end">
                      <SubmitButton size="sm">Salvar</SubmitButton>
                    </div>
                  )}
                </fieldset>
              </ActionForm>
            </CardBody>
          </Card>
        ))}
        {has(ctx, "institucional.editar") && (
          <Card>
            <CardHeader title="Adicionar marco (prorrogação)" />
            <CardBody>
              <ActionForm action={addMilestoneMonth} resetOnSuccess className="grid gap-2 sm:grid-cols-4">
                <Field label="Mês" name="mes">
                  <Input name="mes" type="number" min={1} max={36} required />
                </Field>
                <Field label="Título" name="titulo" className="sm:col-span-2">
                  <Input name="titulo" required />
                </Field>
                <div className="flex items-end">
                  <SubmitButton size="sm" variant="secondary">
                    Adicionar
                  </SubmitButton>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  async function Audit() {
    if (!has(ctx, "auditoria.ver")) return <Alert tone="info">A trilha de auditoria é visível para administração e coordenação.</Alert>;
    const [{ data: logs }, members] = await Promise.all([
      ctx.supabase.from("activity_log").select("id, entidade, entidade_id, acao, detalhes, created_at, user_id").eq("organization_id", ctx.orgId).order("created_at", { ascending: false }).limit(200),
      listMembers(ctx),
    ]);
    const name = (id: string | null) => (id ? (members.find((m) => m.id === id)?.nome ?? "usuário") : "sistema");
    return (
      <Card>
        <CardHeader title="Trilha de auditoria" description="Últimos 200 eventos. Registra campos alterados e situações, sem conteúdo sensível." />
        <CardBody>
          <ul className="space-y-1 font-mono text-xs">
            {(logs ?? []).map((l) => (
              <li key={l.id}>
                {fmtDateTime(l.created_at)} · {name(l.user_id)} · {l.acao} · {l.entidade} {l.entidade_id?.slice(0, 8)}
                {(l.detalhes as { campos?: string[] }).campos ? ` · ${(l.detalhes as { campos: string[] }).campos.join(", ")}` : ""}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    );
  }
}
