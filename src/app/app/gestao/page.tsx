import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Download, FileText, Timer } from "lucide-react";
import { requirePermission, has } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtMonth } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/labels";
import { loadGestao } from "@/lib/data/gestao";
import {
  ESSENTIAL_LABELS,
  FASE_ORDER,
  SEVERITY_LABELS,
  applyFilters,
  byMonth,
  completeness,
  dueVisits,
  filtersQuery,
  openIncidents,
  parseFilters,
  portfolio,
  seriesOf,
} from "@/lib/gestao";
import { BarList, LineChart, Stat } from "@/components/charts";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Table, Td, Th, buttonClass } from "@/components/ui";
import { saveTimeAssumptions } from "./actions";
import { DemoSeal, ExperimentLink, FilterForm, IncidentCard, TimeEconomyTable } from "./componentes";

export const metadata: Metadata = { title: "Painel do gestor" };

const SEV_RANK = { critica: 0, alta: 1, media: 2, baixa: 3 } as const;

export default async function GestaoPage({ searchParams }: PageProps<"/app/gestao">) {
  const ctx = await requirePermission("gestao.painel");
  const f = parseFilters(await searchParams);
  const load = await loadGestao(ctx);
  const { ref, demo } = load;
  const d = applyFilters(load.data, f);
  const p = portfolio(d.experiments);
  const byId = new Map(load.data.experiments.map((e) => [e.id, e]));
  const q = filtersQuery(f);
  const fonte = demo ? "Fonte: medição sintética (DADOS SIMULADOS)." : "Fonte: medições registradas nas fichas.";

  const open = openIncidents(d.incidents, ref);
  const due = dueVisits(d.experiments, load.data.visits, ref);
  const openTasks = d.tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const lateTasks = openTasks.filter((t) => t.prazo && t.prazo < ref);
  const comp = completeness(d.visits, d.measurements);
  const recStatus = (s: string) => d.visits.filter((v) => v.status === s).length;
  const simRev = d.experiments.filter((e) => e.revisao_simulada === "revisado_demo").length;

  // séries em destaque: ensaios com ocorrência, dos mais graves para os mais leves
  const featured = d.experiments
    .map((e) => ({ e, inc: d.incidents.filter((i) => i.experiment_id === e.id), series: seriesOf(d.measurements, e.id) }))
    .filter((x) => x.inc.length && x.series.length)
    .sort((a, b) => Math.min(...a.inc.map((i) => SEV_RANK[i.gravidade])) - Math.min(...b.inc.map((i) => SEV_RANK[i.gravidade])) || a.e.codigo.localeCompare(b.e.codigo))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Painel do gestor"
        description={
          <>
            Visão da unidade experimental para quem coordena: o que exige atenção, como os ensaios evoluem e o estado dos registros. Referência: {fmtDate(ref)}.
          </>
        }
        actions={
          <>
            <Link href={`/app/gestao/relatorio${q ? `?${q}` : ""}`} className={buttonClass("primary")}>
              <FileText aria-hidden className="h-4 w-4" /> Relatório gerencial
            </Link>
            {has(ctx, "relatorios.exportar_interno") && (
              <a href={`/app/gestao/exportar?tipo=experimentos${q ? `&${q}` : ""}`} className={buttonClass("secondary")}>
                <Download aria-hidden className="h-4 w-4" /> CSV
              </a>
            )}
          </>
        }
      />
      {demo && <DemoSeal className="mb-4" />}

      <Card className="mb-6 p-4">
        <FilterForm all={load.data} f={f} action="/app/gestao" />
      </Card>

      {load.error ? (
        <Alert tone="danger" title="Não foi possível carregar todos os registros.">
          Tente novamente em instantes. Nenhum número foi estimado para compensar a falha.
        </Alert>
      ) : !load.data.experiments.length ? (
        <EmptyState title="Nenhum experimento cadastrado nesta organização.">O painel é calculado a partir dos ensaios, visitas e ocorrências registrados.</EmptyState>
      ) : !d.experiments.length ? (
        <EmptyState title="Nenhum ensaio corresponde aos filtros." action={<Link href="/app/gestao" className={buttonClass("secondary")}>Limpar filtros</Link>} />
      ) : (
        <div className="space-y-8">
          {/* A — situação do portfólio */}
          <section aria-labelledby="bloco-a">
            <h2 id="bloco-a" className="mb-3 font-display text-lg font-semibold text-brand-950">
              Situação do portfólio
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Link href="/app/experimentos" className="rounded-2xl focus-visible:outline-2">
                <Stat label="Experimentos" value={p.total} hint="na seleção atual" />
              </Link>
              {FASE_ORDER.filter((x) => x !== "implantacao" || p.porFase.implantacao > 0).map((fase) => (
                <Link key={fase} href={`/app/experimentos?fase=${fase}`} className="rounded-2xl focus-visible:outline-2">
                  <Stat label={PHASE_LABELS[fase]} value={p.porFase[fase]} tone={fase === "interrompido" && p.porFase[fase] ? "danger" : "default"} hint="abrir lista" />
                </Link>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader title="Culturas" />
                <CardBody>
                  <BarList data={p.culturas.map((c) => ({ ...c, label: c.label[0].toUpperCase() + c.label.slice(1) }))} caption="Ensaios por cultura" total={p.total} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Áreas temáticas" />
                <CardBody>
                  <BarList data={p.areas} caption="Ensaios por área temática" total={p.total} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Responsáveis e setores" />
                <CardBody>
                  <BarList data={p.responsaveis} caption="Ensaios por responsável" total={p.total} />
                  <p className="mt-3 text-xs text-muted">
                    {p.setores.length} setor(es): {p.setores.map((s) => s.label).join(", ")}
                  </p>
                </CardBody>
              </Card>
            </div>
            <p className="mt-2 text-xs text-muted">
              Data de referência dos dados: {fmtDate(ref)} · última gravação no banco: {p.ultimaAtualizacao ? fmtDateTime(p.ultimaAtualizacao) : "—"}
            </p>
          </section>

          {/* C — o que exige atenção */}
          <section aria-labelledby="bloco-c">
            <h2 id="bloco-c" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-brand-950">
              <AlertTriangle aria-hidden className="h-5 w-5 text-warning-600" /> Problemas e decisões pendentes
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Ocorrências abertas" value={open.length} tone={open.length ? "warning" : "default"} hint={open.length ? `mais grave: ${SEVERITY_LABELS[open[0].gravidade].toLowerCase()}` : "nenhuma em aberto"} />
              <Stat label="Pendências em aberto" value={openTasks.length} hint={`${lateTasks.length} com prazo vencido`} tone={lateTasks.length ? "danger" : "default"} />
              <Stat label="Visitas devidas" value={due.filter((x) => x.devida).length} hint="ensaios em andamento além da periodicidade" tone={due.some((x) => x.devida) ? "warning" : "default"} />
              <Stat label="Ensaios interrompidos" value={p.porFase.interrompido} hint="sem conclusão final registrada" tone={p.porFase.interrompido ? "danger" : "default"} />
            </div>
            {open.length ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {open.map((i) => (
                  <IncidentCard key={i.id} i={i} e={byId.get(i.experiment_id)!} dias={i.diasSemResposta} proxima={load.proximas[i.experiment_id] ?? null} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Nenhuma ocorrência aberta na seleção.</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Ordem: gravidade e, em seguida, a ocorrência mais antiga. O Bento organiza o registro; não faz diagnóstico nem recomenda manejo.
            </p>
          </section>

          {/* B — evolução e atividades */}
          <section aria-labelledby="bloco-b">
            <h2 id="bloco-b" className="mb-3 font-display text-lg font-semibold text-brand-950">
              Evolução e atividades
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader title="Ensaios por status" />
                <CardBody>
                  <BarList data={FASE_ORDER.map((x) => ({ label: PHASE_LABELS[x], value: p.porFase[x] })).filter((x) => x.value)} caption="Ensaios por status" total={p.total} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Início dos ensaios por mês" />
                <CardBody>
                  <BarList data={byMonth(d.experiments.map((e) => e.data_inicio)).map((m) => ({ label: fmtMonth(m.mes), value: m.value }))} caption="Ensaios iniciados por mês" limit={36} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Visitas registradas por mês" description={`${d.visits.length} no total`} />
                <CardBody>
                  <BarList data={byMonth(d.visits.map((v) => v.data)).map((m) => ({ label: fmtMonth(m.mes), value: m.value }))} caption="Visitas por mês" limit={36} />
                </CardBody>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader title="Preenchimento de registros essenciais" />
                <CardBody>
                  <p className="font-display text-3xl font-semibold tabular text-brand-950">{comp.percentual === null ? "—" : `${comp.percentual.toLocaleString("pt-BR")}%`}</p>
                  <p className="mt-1 text-xs text-muted">
                    {comp.numerador} de {comp.denominador} campos = campos preenchidos ÷ (fichas × 5) × 100. Campos: {Object.values(ESSENTIAL_LABELS).join(", ")}.
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Medições: {comp.comValor} com valor · {comp.ausentesJustificadas} ausente(s) com justificativa · {comp.ausentesSemMotivo} sem justificativa. Ausências nunca contam como zero.
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Conferência e documentação" description="Separado do andamento agronômico." />
                <CardBody className="space-y-1.5 text-sm">
                  <p>
                    Fichas conferidas: <strong className="tabular">{recStatus("conferida") + recStatus("finalizada")}</strong> · aguardando conferência: <strong className="tabular">{recStatus("preenchida")}</strong>
                  </p>
                  <p>
                    Arquivos: <strong className="tabular">{d.files.length}</strong> ({d.files.filter((x) => x.revisao_status === "pendente").length} sem conferência)
                  </p>
                  {demo && (
                    <p>
                      Revisão científica <em>simulada</em>: <strong className="tabular">{simRev}</strong> ensaio(s) “revisado_demo” · {d.experiments.filter((e) => e.revisao_simulada === "nao_liberado").length} não liberado(s)
                    </p>
                  )}
                  <p>
                    Conteúdos editoriais (toda a organização): <strong className="tabular">{load.editorial.length}</strong> ({load.editorial.filter((x) => x.status === "rascunho").length} em rascunho, nenhum publicado automaticamente)
                  </p>
                  {demo && <p className="text-xs text-warning-600">Revisões e conferências desta organização são simuladas e não equivalem a aprovação científica real.</p>}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Agenda de acompanhamento" description="Ensaios em andamento, pela periodicidade cadastrada." />
                <CardBody>
                  {due.length ? (
                    <ul className="space-y-2 text-sm">
                      {due.map((x) => (
                        <li key={x.experiment.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            <ExperimentLink e={x.experiment} /> <span className="text-muted">última visita {x.ultimaVisita ? fmtDate(x.ultimaVisita) : "—"}</span>
                          </span>
                          <span className={x.devida ? "font-semibold text-warning-600" : "text-muted"}>
                            <CalendarClock aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                            {x.diasDesde ?? "—"} de {x.limite} dias{x.devida ? " · devida" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Nenhum ensaio em andamento com periodicidade definida.</p>
                  )}
                  {Object.keys(load.proximas).length === 0 && <p className="mt-2 text-xs text-muted">Nenhuma visita futura agendada no calendário.</p>}
                </CardBody>
              </Card>
            </div>

            <h3 className="mb-2 mt-6 font-display text-base font-semibold text-brand-950">Evolução dos ensaios com ocorrências</h3>
            {featured.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {featured.map(({ e, inc, series }) => (
                  <Card key={e.id}>
                    <CardHeader title={<ExperimentLink e={e} aba="acompanhamento" />} description={`${e.titulo} · ${PHASE_LABELS[e.fase]}`} />
                    <CardBody className="space-y-4">
                      {series.slice(0, 2).map((s) => (
                        <LineChart key={s.variavel} title={s.variavel} unidade={s.unidade} pontos={s.pontos} marcos={inc.map((i) => ({ data: i.detectada_em, label: i.titulo }))} fonte={fonte} />
                      ))}
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhum ensaio da seleção tem ocorrência e série de medições ao mesmo tempo.</p>
            )}
          </section>

          {/* D — acompanhamento administrativo e tempo */}
          <section aria-labelledby="bloco-d">
            <h2 id="bloco-d" className="mb-3 font-display text-lg font-semibold text-brand-950">
              Acompanhamento administrativo
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat label="Fichas de visita" value={d.visits.length} hint="registros de acompanhamento" />
              <Stat label="Medições" value={d.measurements.length} hint={`${comp.ausentesJustificadas} ausente(s) justificada(s)`} />
              <Stat label="Pendências resolvidas" value={d.tasks.filter((t) => t.status === "concluida").length} hint={`de ${d.tasks.length} registradas`} />
              <Stat label={demo ? "Conferências simuladas" : "Fichas conferidas"} value={recStatus("conferida") + recStatus("finalizada")} hint={demo ? "não equivalem a revisão real" : undefined} />
              <Stat label="Relatórios preparados" value={d.files.filter((x) => x.tipo === "relatorio").length} hint="arquivos do tipo relatório" />
            </div>

            <Card className="mt-4">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Timer aria-hidden className="h-5 w-5 text-brand-600" /> Economia de tempo administrativo estimada
                  </span>
                }
                description="Benefício administrativo hipotético. Não tem relação com produtividade agrícola, custo de produção ou resultado de ensaio."
              />
              <CardBody>
                {demo && load.timeItems.length ? (
                  <>
                    <p className="mb-3 inline-flex rounded-full bg-warning-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning-600">SIMULAÇÃO. Tempos hipotéticos. Não medidos em operação real.</p>
                    <TimeEconomyTable items={load.timeItems} />
                    {has(ctx, "gestao.premissas_demo") && (
                      <details className="mt-4 rounded-xl border border-border p-3">
                        <summary className="cursor-pointer text-sm font-semibold">Editar premissas (somente nesta demonstração)</summary>
                        <ActionForm action={saveTimeAssumptions} className="mt-3 space-y-3">
                          {load.timeItems.map((t) => (
                            <fieldset key={t.id} className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
                              <legend className="mb-1 text-sm font-medium sm:col-span-4">{t.atividade}</legend>
                              <label className="flex flex-col gap-1 text-xs text-muted">
                                Vezes por mês
                                <Input type="number" min={0} max={10000} step="0.5" name={`eventos_mes:${t.id}`} defaultValue={t.eventos_mes} required />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-muted">
                                Minutos antes
                                <Input type="number" min={0} max={10000} step="0.5" name={`minutos_antes:${t.id}`} defaultValue={t.minutos_antes} required />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-muted">
                                Minutos com Bento
                                <Input type="number" min={0} max={10000} step="0.5" name={`minutos_bento:${t.id}`} defaultValue={t.minutos_bento} required />
                              </label>
                              <p className="text-[11px] text-muted">Alterada em {fmtDateTime(t.updated_at)}</p>
                            </fieldset>
                          ))}
                          <SubmitButton>Recalcular estimativa</SubmitButton>
                        </ActionForm>
                      </details>
                    )}
                    <p className="mt-3 text-xs text-muted">
                      Medir uma economia real exigiria método de coleta, período de comparação e validação das atividades em operação. Nenhum valor financeiro é calculado.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    A estimativa de tempo é um recurso do ambiente de demonstração e não é aplicada a organizações reais. Para medir economia real, é preciso definir método de coleta, período de comparação e validação das atividades.
                  </p>
                )}
              </CardBody>
            </Card>
          </section>

          <Table caption="Ensaios da seleção">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Ensaio</Th>
                <Th>Cultura</Th>
                <Th>Área</Th>
                <Th>Responsável</Th>
                <Th>Setor</Th>
                <Th>Início</Th>
                <Th>Status</Th>
                <Th>Atualização</Th>
              </tr>
            </thead>
            <tbody>
              {d.experiments.map((e) => (
                <tr key={e.id}>
                  <Td>
                    <ExperimentLink e={e} aba="acompanhamento" />
                  </Td>
                  <Td>{e.titulo}</Td>
                  <Td>{e.culturas.join(", ")}</Td>
                  <Td>{e.area_tematica ?? "—"}</Td>
                  <Td>{e.responsavel ?? "Não informado"}</Td>
                  <Td>{e.setor ?? "—"}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(e.data_inicio)}</Td>
                  <Td>{PHASE_LABELS[e.fase]}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(e.updated_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}
