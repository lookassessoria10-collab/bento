import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Copy, FileDown, Pencil, Plus } from "lucide-react";
import { requireContext } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  ACCESS_LEVEL_LABELS,
  ANALYSIS_LABELS,
  EDITORIAL_KIND_LABELS,
  EXPERIMENT_ACCESS_LABELS,
  FILE_KIND_LABELS,
  INFO_STATUS_LABELS,
  PHASE_LABELS,
  RECORD_STATUS_LABELS,
  TASK_STATUS_LABELS,
  USE_AUTH_LABELS,
  label,
} from "@/lib/labels";
import { STATUS_LABELS } from "@/lib/workflow";
import { canWriteExperiment, can } from "@/lib/permissions";
import { listMembers, listPeople, myExperimentAccess } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  Field,
  Input,
  KeyValue,
  LinkButton,
  PageHeader,
  PrivateBadge,
  Select,
  SourceLine,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Th,
  buttonClass,
  optionsFrom,
} from "@/components/ui";
import {
  addExperimentMember,
  addMilestone,
  addTreatment,
  archiveExperiment,
  cloneExperimentTemplate,
  deleteTreatment,
  updateExperimentMember,
  updateMilestone,
} from "../actions";

export const metadata: Metadata = { title: "Experimento" };
type ExpRow = Database["public"]["Tables"]["experiments"]["Row"];

const TABS = [
  ["resumo", "Resumo"],
  ["metodologia", "Metodologia"],
  ["linha-do-tempo", "Linha do tempo"],
  ["visitas", "Visitas"],
  ["resultados", "Resultados"],
  ["arquivos", "Arquivos"],
  ["pendencias", "Pendências"],
  ["conteudos", "Conteúdos"],
  ["equipe", "Participantes"],
  ["historico", "Histórico"],
] as const;

export default async function ExperimentPage({ params, searchParams }: PageProps<"/app/experimentos/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = (typeof sp.aba === "string" && TABS.some(([k]) => k === sp.aba) ? sp.aba : "resumo") as (typeof TABS)[number][0];
  const ctx = await requireContext();
  const { supabase } = ctx;

  const { data: e } = await supabase
    .from("experiments")
    .select("*, people:people!experiments_pesquisador_principal_id_organization_id_fkey(nome, instituicao), farms:farms!experiments_farm_id_organization_id_fkey(nome, municipio, uf), farm_areas:farm_areas!experiments_farm_area_id_organization_id_fkey(nome, tipo)")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!e) notFound();

  const access = await myExperimentAccess(ctx, id);
  const canWrite = canWriteExperiment(ctx.roles, e.nivel_acesso, access) && !e.archived_at;
  const pi = e.people as unknown as { nome: string; instituicao: string | null } | null;
  const farm = e.farms as unknown as { nome: string; municipio: string | null; uf: string | null } | null;
  const area = e.farm_areas as unknown as { nome: string; tipo: string } | null;
  const base = `/app/experimentos/${id}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/experimentos", label: "Experimentos" }, { label: e.codigo }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg text-brand-700">{e.codigo}</span>
            <span>{e.titulo_curto || e.titulo}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.fase} label={PHASE_LABELS[e.fase]} />
            <Badge tone="info">{INFO_STATUS_LABELS[e.disponibilidade]}</Badge>
            {e.acompanhamento_ativo ? <Badge tone="brand">Acompanhamento ativo</Badge> : <Badge>Rascunho de cadastro</Badge>}
            {e.nivel_acesso === "privado_equipe" && <PrivateBadge>Acesso restrito</PrivateBadge>}
            {e.is_demo && <DemoBadge />}
            {e.archived_at && <Badge tone="danger">Arquivado em {fmtDate(e.archived_at)}</Badge>}
          </span>
        }
        actions={
          <>
            <a className={buttonClass("secondary")} href={`${base}/ficha`} target="_blank" rel="noopener">
              <FileDown aria-hidden className="h-4 w-4" /> Ficha PDF
            </a>
            {canWrite && (
              <LinkButton href={`${base}/editar`}>
                <Pencil aria-hidden className="h-4 w-4" /> Editar
              </LinkButton>
            )}
            {can(ctx.roles, "experimentos.criar") && (
              <ActionForm action={cloneExperimentTemplate}>
                <input type="hidden" name="id" value={id} />
                <SubmitButton variant="ghost">
                  <Copy aria-hidden className="h-4 w-4" /> Usar como modelo
                </SubmitButton>
              </ActionForm>
            )}
            {canWriteExperiment(ctx.roles, e.nivel_acesso, access) && (
              <ActionForm
                action={archiveExperiment}
                confirm={e.archived_at ? "Restaurar este experimento?" : "Arquivar este experimento? O histórico será preservado."}
              >
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="acao" value={e.archived_at ? "restaurar" : "arquivar"} />
                <SubmitButton variant="ghost">
                  <Archive aria-hidden className="h-4 w-4" /> {e.archived_at ? "Restaurar" : "Arquivar"}
                </SubmitButton>
              </ActionForm>
            )}
          </>
        }
      />

      <Tabs current={tab} tabs={TABS.map(([k, l]) => ({ key: k, label: l, href: `${base}?aba=${k}` }))} />

      {tab === "resumo" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Identificação" />
            <CardBody className="space-y-4">
              <KeyValue
                items={[
                  { label: "Título completo", value: e.titulo },
                  { label: "Código institucional", value: e.codigo_institucional },
                  { label: "Área temática", value: e.area_tematica },
                  { label: "Linhas de pesquisa", value: e.linhas_pesquisa.join(", ") },
                  { label: "Culturas", value: e.culturas.join(", ") },
                  { label: "Organismos", value: e.organismos.join(", ") },
                  { label: "Alvos biológicos", value: e.alvos_biologicos.join(", ") },
                  { label: "Palavras-chave", value: e.palavras_chave.join(", ") },
                ]}
              />
              <KeyValue
                items={[
                  { label: "Descrição", value: e.descricao },
                  { label: "Justificativa", value: e.justificativa },
                  { label: "Objetivo geral", value: e.objetivo_geral },
                  { label: "Objetivos específicos", value: e.objetivos_especificos },
                ]}
              />
              <SourceLine fonte={e.fonte_cadastro ? `${e.fonte_cadastro}${e.informante ? ` (informante: ${e.informante})` : ""}` : null} data={fmtDate(e.data_informacao)} />
              <p className="text-xs text-muted">
                Conferência: {e.data_conferencia ? fmtDate(e.data_conferencia) : "não realizada"} · Última atualização: {fmtDateTime(e.updated_at)}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Responsáveis e local" />
            <CardBody>
              <KeyValue
                items={[
                  { label: "Pesquisador principal", value: pi ? `${pi.nome}${pi.instituicao ? ` — ${pi.instituicao}` : ""}` : null },
                  { label: "Fazenda", value: farm ? `${farm.nome}${farm.municipio ? ` (${farm.municipio}/${farm.uf})` : ""}` : null },
                  { label: "Área / talhão", value: area?.nome },
                  { label: "Local", value: e.local_descricao },
                  { label: "Nível de acesso", value: ACCESS_LEVEL_LABELS[e.nivel_acesso] },
                  { label: "Seu acesso", value: access ? EXPERIMENT_ACCESS_LABELS[access] : "Pelo papel na organização" },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "metodologia" && <Methodology id={id} e={e} canWrite={canWrite} />}
      {tab === "linha-do-tempo" && <Timeline id={id} canWrite={canWrite} />}
      {tab === "visitas" && <VisitsTab id={id} />}
      {tab === "resultados" && <ResultsTab id={id} canWrite={canWrite} />}
      {tab === "arquivos" && <FilesTab id={id} />}
      {tab === "pendencias" && <TasksTab id={id} />}
      {tab === "conteudos" && <ContentsTab id={id} />}
      {tab === "equipe" && <MembersTab id={id} manage={can(ctx.roles, "experimentos.ver_todos") || access === "proprietario"} />}
      {tab === "historico" && <HistoryTab id={id} />}
    </>
  );

  async function Methodology({ id, e, canWrite }: { id: string; e: ExpRow; canWrite: boolean }) {
    const { data: treatments } = await supabase.from("experiment_treatments").select("*").eq("experiment_id", id).order("ordem");
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Metodologia e planejamento" description="Conforme informado pelo responsável." />
          <CardBody>
            <KeyValue
              items={[
                { label: "Resumo metodológico", value: e.resumo_metodologico },
                { label: "Protocolo / referência", value: e.protocolo_referencia },
                { label: "Delineamento", value: e.delineamento },
                { label: "Repetições", value: e.num_repeticoes },
                { label: "Unidades experimentais", value: e.unidades_experimentais },
                { label: "Início", value: e.data_inicio && fmtDate(e.data_inicio) },
                { label: "Término previsto", value: e.data_termino_prevista && fmtDate(e.data_termino_prevista) },
                { label: "Término efetivo", value: e.data_termino_efetiva && fmtDate(e.data_termino_efetiva) },
                { label: "Calendário de avaliações", value: e.calendario_avaliacoes },
                { label: "Periodicidade de acompanhamento", value: e.periodicidade_acompanhamento },
                { label: "Observações de escopo", value: e.observacoes_escopo },
                { label: "Motivo de interrupção", value: e.motivo_interrupcao },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Tratamentos descritos" description="Sem interpretação ou comparação automática." />
          <CardBody className="space-y-3">
            {!treatments?.length ? (
              <p className="text-sm text-muted">Nenhum tratamento informado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {treatments.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{t.codigo ? `${t.codigo} — ` : ""}</span>
                      {t.descricao}
                      {t.fonte && <p className="text-xs text-muted">Fonte: {t.fonte}</p>}
                    </div>
                    {canWrite && (
                      <ActionForm action={deleteTreatment} confirm="Remover este tratamento?">
                        <input type="hidden" name="id" value={t.id} />
                        <SubmitButton size="sm" variant="ghost">
                          Remover
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canWrite && (
              <ActionForm action={addTreatment} resetOnSuccess className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <input type="hidden" name="experiment_id" value={id} />
                <Field label="Código" name="codigo">
                  <Input name="codigo" placeholder="T1" />
                </Field>
                <Field label="Descrição" name="descricao" required className="sm:col-span-2">
                  <Input name="descricao" required />
                </Field>
                <Field label="Fonte" name="fonte" className="sm:col-span-2">
                  <Input name="fonte" placeholder="Quem informou / documento" />
                </Field>
                <div className="flex items-end">
                  <SubmitButton size="sm">
                    <Plus aria-hidden className="h-4 w-4" /> Adicionar
                  </SubmitButton>
                </div>
              </ActionForm>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  async function Timeline({ id, canWrite }: { id: string; canWrite: boolean }) {
    const [{ data: milestones }, { data: visits }] = await Promise.all([
      supabase.from("experiment_milestones").select("*").eq("experiment_id", id).order("data_prevista", { nullsFirst: false }),
      supabase.from("visit_schedule_experiments").select("visit_schedules(id, titulo, data_hora, status)").eq("experiment_id", id),
    ]);
    type Ev = { date: string; title: string; kind: string; status: string; href?: string; id?: string; milestone?: boolean };
    const events: Ev[] = [
      ...(milestones ?? []).map((m) => ({
        date: m.data_realizada ?? m.data_prevista ?? "",
        title: m.titulo,
        kind: m.tipo === "avaliacao" ? "Avaliação" : m.tipo === "marco" ? "Marco" : "Etapa",
        status: m.status,
        id: m.id,
        milestone: true,
      })),
      ...(visits ?? []).flatMap((v) => {
        const s = v.visit_schedules as unknown as { id: string; titulo: string; data_hora: string; status: string } | null;
        return s ? [{ date: s.data_hora.slice(0, 10), title: s.titulo, kind: "Visita", status: s.status, href: `/app/visitas/${s.id}` }] : [];
      }),
    ].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cronologia consolidada" description="Etapas, avaliações e visitas do experimento." />
          <CardBody>
            {!events.length ? (
              <p className="text-sm text-muted">Nenhum evento registrado.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-brand-100 pl-5">
                {events.map((ev, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500" aria-hidden />
                    <p className="text-xs text-muted tabular">{ev.date ? fmtDate(ev.date) : "Sem data"} · {ev.kind}</p>
                    <p className="text-sm font-medium">{ev.href ? <Link className="hover:underline" href={ev.href}>{ev.title}</Link> : ev.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge>{ev.status}</Badge>
                      {canWrite && ev.milestone && ev.status === "prevista" && (
                        <ActionForm action={updateMilestone}>
                          <input type="hidden" name="id" value={ev.id} />
                          <input type="hidden" name="status" value="realizada" />
                          <SubmitButton size="sm" variant="ghost">Marcar realizada</SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
        {canWrite && (
          <Card>
            <CardHeader title="Nova etapa ou avaliação" />
            <CardBody>
              <ActionForm action={addMilestone} resetOnSuccess className="space-y-3">
                <input type="hidden" name="experiment_id" value={id} />
                <Field label="Título" name="titulo" required>
                  <Input name="titulo" required />
                </Field>
                <Field label="Tipo" name="tipo">
                  <Select name="tipo" options={optionsFrom({ etapa: "Etapa", avaliacao: "Avaliação", marco: "Marco" })} />
                </Field>
                <Field label="Data prevista" name="data_prevista">
                  <Input name="data_prevista" type="date" />
                </Field>
                <Field label="Observação" name="observacao">
                  <Input name="observacao" />
                </Field>
                <SubmitButton size="sm">Adicionar</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  async function VisitsTab({ id }: { id: string }) {
    const { data } = await supabase
      .from("visit_records")
      .select("id, status, etapa_atual, updated_at, visit_schedules(id, titulo, data_hora, status)")
      .eq("experiment_id", id)
      .order("created_at", { ascending: false });
    return (
      <Card>
        <CardHeader title="Fichas de acompanhamento" actions={<LinkButton size="sm" href={`/app/visitas/nova?experimento=${id}`}>Agendar visita</LinkButton>} />
        {!data?.length ? (
          <CardBody>
            <p className="text-sm text-muted">Nenhuma ficha registrada para este experimento.</p>
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Visita</Th>
                <Th>Data</Th>
                <Th>Etapa informada</Th>
                <Th>Ficha</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const v = r.visit_schedules as unknown as { id: string; titulo: string; data_hora: string } | null;
                return (
                  <tr key={r.id}>
                    <Td>{v && <Link className="text-brand-700 hover:underline" href={`/app/visitas/${v.id}#ficha-${r.id}`}>{v.titulo}</Link>}</Td>
                    <Td className="tabular">{v && fmtDateTime(v.data_hora)}</Td>
                    <Td>{r.etapa_atual ?? <span className="text-muted">Não informado</span>}</Td>
                    <Td>
                      <StatusBadge status={r.status} label={RECORD_STATUS_LABELS[r.status]} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    );
  }

  async function ResultsTab({ id, canWrite }: { id: string; canWrite: boolean }) {
    const { data } = await supabase.from("result_summaries").select("*").eq("experiment_id", id).order("created_at", { ascending: false });
    return (
      <Card>
        <CardHeader
          title="Resultados recebidos"
          description="Sínteses fornecidas pelos responsáveis. Situação da análise, conferência e autorização são independentes."
          actions={canWrite && <LinkButton size="sm" href={`/app/resultados?novo=1&experimento=${id}`}>Registrar resultado</LinkButton>}
        />
        <CardBody className="space-y-3">
          {!data?.length && <p className="text-sm text-muted">Nenhum resultado recebido.</p>}
          {data?.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/app/resultados?resultado=${r.id}`} className="font-medium hover:underline">
                  {r.variavel} {r.unidade && <span className="text-muted">({r.unidade})</span>}
                </Link>
                <Badge tone="info">Análise: {ANALYSIS_LABELS[r.situacao_analise]}</Badge>
                <StatusBadge status={r.conferencia_status} label={`Conferência: ${r.conferencia_status}`} />
                <StatusBadge status={r.validacao_status} label={`Validação: ${r.validacao_status.replace("_", " ")}`} />
                {r.is_demo && <DemoBadge />}
              </div>
              <p className="mt-1 whitespace-pre-line text-sm">{r.sintese || <span className="text-muted">Sem síntese.</span>}</p>
              <SourceLine fonte={r.fonte_descricao} data={fmtDate(r.data_fornecimento)} />
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  async function FilesTab({ id }: { id: string }) {
    const { data } = await supabase
      .from("files")
      .select("id, nome_amigavel, tipo, autoria, data_arquivo, autorizacao_uso, versao, external_url, created_at")
      .eq("experiment_id", id)
      .is("deleted_at", null)
      .is("substituido_por", null)
      .order("created_at", { ascending: false });
    return (
      <Card>
        <CardHeader title="Arquivos" actions={<LinkButton size="sm" href={`/app/biblioteca?enviar=1&experimento=${id}`}>Enviar arquivo</LinkButton>} />
        {!data?.length ? (
          <CardBody>
            <p className="text-sm text-muted">Nenhum arquivo vinculado.</p>
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>Autoria</Th>
                <Th>Uso</Th>
                <Th>Versão</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.id}>
                  <Td>
                    <Link className="text-brand-700 hover:underline" href={`/app/biblioteca/${f.id}`}>
                      {f.nome_amigavel}
                    </Link>
                  </Td>
                  <Td>{FILE_KIND_LABELS[f.tipo]}</Td>
                  <Td>{f.autoria ?? "Não informado"}</Td>
                  <Td>{USE_AUTH_LABELS[f.autorizacao_uso]}</Td>
                  <Td>v{f.versao}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    );
  }

  async function TasksTab({ id }: { id: string }) {
    const { data } = await supabase
      .from("tasks")
      .select("id, titulo, status, prazo, profiles:responsavel_id(nome)")
      .eq("experiment_id", id)
      .order("prazo", { nullsFirst: false });
    return (
      <Card>
        <CardHeader title="Pendências e atividades" actions={<LinkButton size="sm" href={`/app/atividades?nova=1&experimento=${id}`}>Nova atividade</LinkButton>} />
        <CardBody>
          {!data?.length ? (
            <p className="text-sm text-muted">Nenhuma pendência vinculada.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/app/atividades/${t.id}`} className="hover:underline">
                    {t.titulo}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {(t.profiles as unknown as { nome: string } | null)?.nome ?? "Sem responsável"} · prazo {fmtDate(t.prazo)}
                    <StatusBadge status={t.status} label={TASK_STATUS_LABELS[t.status]} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    );
  }

  async function ContentsTab({ id }: { id: string }) {
    const { data } = await supabase
      .from("editorial_sources")
      .select("editorial_items(id, titulo, tipo, status)")
      .eq("experiment_id", id);
    const items = (data ?? [])
      .map((d) => d.editorial_items as unknown as { id: string; titulo: string; tipo: string; status: keyof typeof STATUS_LABELS } | null)
      .filter((x): x is NonNullable<typeof x> => !!x);
    return (
      <Card>
        <CardHeader title="Conteúdos que citam este experimento" description="Situação da revisão e da publicação de cada conteúdo." />
        <CardBody>
          {!items.length ? (
            <p className="text-sm text-muted">Nenhum conteúdo editorial vinculado.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link className="hover:underline" href={`/app/editorial/${i.id}`}>
                    {i.titulo}
                  </Link>
                  <span className="flex gap-2">
                    <Badge>{label(EDITORIAL_KIND_LABELS, i.tipo)}</Badge>
                    <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    );
  }

  async function MembersTab({ id, manage }: { id: string; manage: boolean }) {
    const [{ data }, people, members] = await Promise.all([
      supabase.from("experiment_members").select("id, acesso, funcao, ativo, user_id, profiles:user_id(nome), people:people!experiment_members_person_id_organization_id_fkey(nome)").eq("experiment_id", id),
      listPeople(ctx),
      listMembers(ctx),
    ]);
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Participantes e acessos" description="Acesso por experimento complementa o papel na organização." />
          <Table>
            <thead>
              <tr>
                <Th>Pessoa</Th>
                <Th>Função</Th>
                <Th>Acesso</Th>
                <Th>Situação</Th>
                {manage && <Th>Ações</Th>}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id}>
                  <Td>
                    {(m.profiles as unknown as { nome: string } | null)?.nome ?? (m.people as unknown as { nome: string } | null)?.nome}
                    {!m.user_id && <span className="ml-1 text-xs text-muted">(sem conta)</span>}
                  </Td>
                  <Td>{m.funcao ?? "—"}</Td>
                  <Td>{EXPERIMENT_ACCESS_LABELS[m.acesso]}</Td>
                  <Td>{m.ativo ? "Ativo" : "Inativo"}</Td>
                  {manage && (
                    <Td>
                      <ActionForm action={updateExperimentMember} className="flex gap-1">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="acesso" value={m.acesso} />
                        <input type="hidden" name="ativo" value={m.ativo ? "false" : "true"} />
                        <SubmitButton size="sm" variant="ghost">
                          {m.ativo ? "Desativar" : "Reativar"}
                        </SubmitButton>
                      </ActionForm>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        {manage && (
          <Card>
            <CardHeader title="Vincular participante" />
            <CardBody>
              <ActionForm action={addExperimentMember} resetOnSuccess className="space-y-3">
                <input type="hidden" name="experiment_id" value={id} />
                <Field label="Usuário com conta" name="user_id">
                  <Select name="user_id" options={members.map((m) => ({ value: m.id, label: m.nome }))} placeholder="—" />
                </Field>
                <Field label="ou pessoa sem conta (ficha)" name="person_id">
                  <Select name="person_id" options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="—" />
                </Field>
                <Field label="Acesso" name="acesso">
                  <Select name="acesso" options={optionsFrom(EXPERIMENT_ACCESS_LABELS)} defaultValue="visualizador" />
                </Field>
                <Field label="Função" name="funcao">
                  <Select
                    name="funcao"
                    options={optionsFrom({
                      pesquisador_principal: "Pesquisador principal",
                      colaborador: "Colaborador",
                      equipe_tecnica: "Equipe técnica",
                      estudante: "Estudante",
                      orientador: "Orientador",
                      outro: "Outro",
                    })}
                  />
                </Field>
                <SubmitButton size="sm">Vincular</SubmitButton>
              </ActionForm>
              <p className="mt-3 text-xs text-muted">
                &ldquo;Revisor delegado&rdquo; pode validar cientificamente conteúdos deste experimento. Somente a gestão concede acesso de proprietário.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  async function HistoryTab({ id }: { id: string }) {
    const { data, error } = await supabase
      .from("activity_log")
      .select("id, acao, detalhes, created_at, user_id")
      .eq("entidade_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) return <Alert tone="info">O histórico detalhado é visível para a gestão do projeto.</Alert>;
    const members = await listMembers(ctx);
    const names = new Map(members.map((m) => [m.id, m.nome]));
    return (
      <Card>
        <CardHeader title="Histórico de alterações" description="Registros de auditoria minimizados: campos alterados e mudanças de situação." />
        <CardBody>
          {!data.length ? (
            <EmptyState title="Sem registros de histórico." />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.map((l) => {
                const d = l.detalhes as { campos?: string[] } & Record<string, unknown>;
                return (
                  <li key={l.id} className="rounded-lg border border-border px-3 py-2">
                    <span className="font-medium">{l.acao === "insert" ? "Criação" : l.acao === "update" ? "Alteração" : l.acao}</span> por{" "}
                    {(l.user_id && names.get(l.user_id)) || "sistema"} em {fmtDateTime(l.created_at)}
                    {d.campos && <p className="text-xs text-muted">Campos: {d.campos.join(", ")}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    );
  }
}

