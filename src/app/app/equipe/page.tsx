import type { Metadata } from "next";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { FRONT_LABELS } from "@/lib/labels";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { listPeople } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Badge, Card, CardBody, CardHeader, DemoBadge, Field, Input, PageHeader, Select, Table, Tabs, Td, Th, optionsFrom } from "@/components/ui";
import { InviteForm } from "./invite-form";
import { addRole, addWorkFront, closeWorkFront, inviteMember, resendInvite, revokeInvite, savePerson, setDelegation, setMembershipStatus } from "./actions";

export const metadata: Metadata = { title: "Equipe" };

const PERSON_TYPES = { pesquisador: "Pesquisador", orientador: "Orientador", estudante: "Estudante", tecnico: "Técnico", contato_externo: "Contato externo", outro: "Outro" };
const PERSON_STATUS = { pendente_confirmacao: "Pendente de confirmação", confirmado: "Confirmado", inativo: "Inativo" };

export default async function TeamPage({ searchParams }: PageProps<"/app/equipe">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const tab = ["membros", "pessoas", "frentes"].includes(String(sp.aba)) ? String(sp.aba) : "membros";
  const admin = has(ctx, "equipe.gerenciar");
  const team = has(ctx, "pessoas.gerenciar");

  return (
    <>
      <PageHeader title="Equipe" description="Membros com acesso, pessoas do projeto (com ou sem conta) e rodízio de frentes de trabalho." />
      <Tabs
        current={tab}
        tabs={[
          { key: "membros", label: "Membros e convites", href: "/app/equipe?aba=membros" },
          { key: "pessoas", label: "Pessoas do projeto", href: "/app/equipe?aba=pessoas" },
          { key: "frentes", label: "Frentes e rodízio", href: "/app/equipe?aba=frentes" },
        ]}
      />
      {tab === "membros" && <Members />}
      {tab === "pessoas" && <People />}
      {tab === "frentes" && <Fronts />}
    </>
  );

  async function Members() {
    const [{ data: ms }, { data: invites }] = await Promise.all([
      ctx.supabase.from("memberships").select("id, user_id, role, status, delegacao_revisao_final, inicio, fim, profiles:profiles!memberships_user_id_fkey(nome, email)").eq("organization_id", ctx.orgId).order("created_at"),
      admin
        ? ctx.supabase.from("invitations").select("id, email, role, expires_at, accepted_at, revoked_at, reenvios, created_at").eq("organization_id", ctx.orgId).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as { id: string; email: string; role: Role; expires_at: string; accepted_at: string | null; revoked_at: string | null; reenvios: number; created_at: string }[] }),
    ]);
    const users = new Map<string, string>();
    for (const m of ms ?? []) {
      const p = m.profiles as unknown as { nome: string; email: string } | null;
      users.set(m.user_id, p?.nome || p?.email || "—");
    }
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Membros" description="Um usuário pode ter mais de um papel. Administração do sistema não concede aprovação científica." />
          <Table>
            <thead>
              <tr>
                <Th>Pessoa</Th>
                <Th>Papel</Th>
                <Th>Situação</Th>
                {admin && <Th>Ações</Th>}
              </tr>
            </thead>
            <tbody>
              {(ms ?? []).map((m) => {
                const p = m.profiles as unknown as { nome: string; email: string } | null;
                const self = m.user_id === ctx.userId;
                return (
                  <tr key={m.id}>
                    <Td>
                      {p?.nome || "—"}
                      <div className="text-xs text-muted">{admin ? p?.email : ""}</div>
                    </Td>
                    <Td>
                      {ROLE_LABELS[m.role as Role]}
                      {m.role === "editor" && m.delegacao_revisao_final && (
                        <div>
                          <Badge tone="accent">Delegação de revisão final</Badge>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={m.status === "ativo" ? "brand" : "danger"}>{m.status}</Badge>
                      <div className="text-xs text-muted">desde {fmtDate(m.inicio)}{m.fim ? ` até ${fmtDate(m.fim)}` : ""}</div>
                    </Td>
                    {admin && (
                      <Td>
                        {self ? (
                          <span className="text-xs text-muted">Você não altera o próprio acesso</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <ActionForm action={setMembershipStatus} confirm={m.status === "ativo" ? "Suspender este acesso?" : undefined}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="status" value={m.status === "ativo" ? "suspenso" : "ativo"} />
                              <SubmitButton size="sm" variant="ghost">
                                {m.status === "ativo" ? "Suspender" : "Reativar"}
                              </SubmitButton>
                            </ActionForm>
                            {m.role === "editor" && (
                              <ActionForm action={setDelegation}>
                                <input type="hidden" name="id" value={m.id} />
                                <input type="hidden" name="delegacao" value={m.delegacao_revisao_final ? "false" : "true"} />
                                <SubmitButton size="sm" variant="ghost">
                                  {m.delegacao_revisao_final ? "Retirar delegação" : "Delegar revisão final"}
                                </SubmitButton>
                              </ActionForm>
                            )}
                          </div>
                        )}
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        {admin ? (
          <div className="space-y-5">
            <Card>
              <CardHeader title="Convidar" description="Contas são criadas apenas por convite. Não é possível se autoatribuir papéis." />
              <CardBody>
                <InviteForm action={inviteMember} submitLabel="Gerar convite">
                  <Field label="E-mail institucional" name="email" required>
                    <Input name="email" type="email" required />
                  </Field>
                  <Field label="Papel" name="role">
                    <Select name="role" defaultValue="estudante" options={optionsFrom(ROLE_LABELS)} />
                  </Field>
                </InviteForm>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Papel adicional" />
              <CardBody>
                <ActionForm action={addRole} className="space-y-3">
                  <Field label="Membro" name="user_id">
                    <Select name="user_id" id="add-role-user" options={Array.from(users.entries()).map(([value, label]) => ({ value, label }))} placeholder="Selecione" required />
                  </Field>
                  <Field label="Papel" name="role">
                    <Select name="role" id="add-role-role" options={optionsFrom(ROLE_LABELS)} />
                  </Field>
                  <SubmitButton size="sm" variant="secondary">
                    Atribuir
                  </SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Convites" />
              <CardBody className="space-y-2">
                {!invites?.length && <p className="text-sm text-muted">Nenhum convite.</p>}
                {invites?.map((i) => {
                  const state = i.accepted_at ? "aceito" : i.revoked_at ? "revogado" : new Date(i.expires_at) < new Date() ? "expirado" : "pendente";
                  return (
                    <div key={i.id} className="rounded-lg border border-border p-2 text-sm">
                      <p className="font-medium">{i.email}</p>
                      <p className="text-xs text-muted">
                        {ROLE_LABELS[i.role as Role]} · {state} · expira {fmtDateTime(i.expires_at)}
                        {i.reenvios ? ` · ${i.reenvios} reenvio(s)` : ""}
                      </p>
                      {(state === "pendente" || state === "expirado") && (
                        <div className="mt-1 space-y-1">
                          <InviteForm action={resendInvite} submitLabel="Gerar novo link">
                            <input type="hidden" name="id" value={i.id} />
                          </InviteForm>
                          <ActionForm action={revokeInvite} confirm="Revogar este convite?">
                            <input type="hidden" name="id" value={i.id} />
                            <SubmitButton size="sm" variant="ghost">
                              Revogar
                            </SubmitButton>
                          </ActionForm>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Alert tone="info">O envio automático por e-mail depende de SMTP configurado no Supabase. Sem SMTP, envie o link manualmente por canal institucional.</Alert>
              </CardBody>
            </Card>
          </div>
        ) : (
          <Alert tone="info">Somente administradores convidam pessoas e alteram papéis.</Alert>
        )}
      </div>
    );
  }

  async function People() {
    const people = await listPeople(ctx);
    const { data: contacts } = team ? await ctx.supabase.from("people_contacts").select("person_id, email, telefone").eq("organization_id", ctx.orgId) : { data: [] };
    const contactOf = new Map((contacts ?? []).map((c) => [c.person_id, c]));
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pessoas do projeto" description="Pesquisadores, orientadores e contatos — com ou sem conta. Sem e-mails inventados." />
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>Instituição</Th>
                <Th>Situação</Th>
                <Th>Conta</Th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <Td>
                    {team ? (
                      <details>
                        <summary className="cursor-pointer font-medium">{p.nome}</summary>
                        <ActionForm action={savePerson} className="mt-2 grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="id" value={p.id} />
                          <PersonFields p={p} contact={contactOf.get(p.id)} />
                          <SubmitButton size="sm">Salvar</SubmitButton>
                        </ActionForm>
                      </details>
                    ) : (
                      p.nome
                    )}
                    {p.is_demo && <DemoBadge />}
                  </Td>
                  <Td>{PERSON_TYPES[p.tipo as keyof typeof PERSON_TYPES]}</Td>
                  <Td>{p.instituicao ?? "—"}</Td>
                  <Td>
                    <Badge tone={p.situacao === "confirmado" ? "brand" : "warning"}>{PERSON_STATUS[p.situacao as keyof typeof PERSON_STATUS]}</Badge>
                  </Td>
                  <Td>{p.user_id ? "Com acesso" : "Sem conta"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        {team && (
          <Card>
            <CardHeader title="Nova pessoa" />
            <CardBody>
              <ActionForm action={savePerson} resetOnSuccess className="grid gap-2">
                <PersonFields />
                <SubmitButton size="sm">Cadastrar</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  async function Fronts() {
    const [{ data: fronts }, people] = await Promise.all([
      ctx.supabase.from("work_fronts").select("id, frente, inicio, fim, observacao, people(nome)").eq("organization_id", ctx.orgId).order("inicio", { ascending: false }),
      listPeople(ctx),
    ]);
    const manager = has(ctx, "institucional.editar");
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Frentes de trabalho" description="Articulação, Registros e Comunicação, com rodízio trimestral. O histórico de autoria permanece intacto." />
          <CardBody className="grid gap-4 md:grid-cols-3">
            {(Object.keys(FRONT_LABELS) as (keyof typeof FRONT_LABELS)[]).map((k) => (
              <div key={k}>
                <h3 className="mb-2 font-semibold">{FRONT_LABELS[k]}</h3>
                <ul className="space-y-2 text-sm">
                  {(fronts ?? [])
                    .filter((f) => f.frente === k)
                    .map((f) => (
                      <li key={f.id} className="rounded-lg border border-border p-2">
                        {(f.people as unknown as { nome: string } | null)?.nome}
                        <p className="text-xs text-muted">
                          {fmtDate(f.inicio)} → {f.fim ? fmtDate(f.fim) : "atual"}
                        </p>
                        {!f.fim && manager && (
                          <ActionForm action={closeWorkFront}>
                            <input type="hidden" name="id" value={f.id} />
                            <SubmitButton size="sm" variant="ghost">
                              Encerrar período
                            </SubmitButton>
                          </ActionForm>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </CardBody>
        </Card>
        {manager && (
          <Card>
            <CardHeader title="Registrar período" />
            <CardBody>
              <ActionForm action={addWorkFront} resetOnSuccess className="space-y-3">
                <Field label="Frente" name="frente">
                  <Select name="frente" options={optionsFrom(FRONT_LABELS)} />
                </Field>
                <Field label="Pessoa" name="person_id">
                  <Select name="person_id" options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="Selecione" required />
                </Field>
                <Field label="Início" name="inicio" required>
                  <Input name="inicio" type="date" required />
                </Field>
                <Field label="Fim (opcional)" name="fim">
                  <Input name="fim" type="date" />
                </Field>
                <SubmitButton size="sm">Registrar</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }
}

function PersonFields({ p, contact }: { p?: { id: string; nome: string; tipo: string; instituicao: string | null; situacao: string }; contact?: { email: string | null; telefone: string | null } }) {
  const k = p?.id ?? "novo";
  return (
    <>
      <Field label="Nome" name="nome" required>
        <Input name="nome" id={`nome-${k}`} defaultValue={p?.nome ?? ""} required />
      </Field>
      <Field label="Tipo" name="tipo">
        <Select name="tipo" id={`tipo-${k}`} defaultValue={p?.tipo ?? "pesquisador"} options={optionsFrom(PERSON_TYPES)} />
      </Field>
      <Field label="Instituição" name="instituicao">
        <Input name="instituicao" id={`inst-${k}`} defaultValue={p?.instituicao ?? ""} />
      </Field>
      <Field label="Situação" name="situacao">
        <Select name="situacao" id={`sit-${k}`} defaultValue={p?.situacao ?? "pendente_confirmacao"} options={optionsFrom(PERSON_STATUS)} />
      </Field>
      <Field label="E-mail de contato (restrito)" name="email">
        <Input name="email" id={`email-${k}`} type="email" defaultValue={contact?.email ?? ""} />
      </Field>
      <Field label="Telefone (restrito)" name="telefone">
        <Input name="telefone" id={`tel-${k}`} defaultValue={contact?.telefone ?? ""} />
      </Field>
    </>
  );
}
