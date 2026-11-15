import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Circle, FileText, Share2 } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtMonth } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/labels";
import { pilotMonth } from "@/lib/metrics";
import { dashboardFilters, loadDashboard } from "@/lib/data/dashboard";
import { loadPainel } from "@/lib/data/painel";
import { applyFilters, filtersQuery, parseFilters, portfolio } from "@/lib/gestao";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_TIPO_LABELS,
  FASES_STACK,
  attentionItems,
  delayedExperiments,
  isOpenTask,
  isOverdueEntry,
  isOverdueTask,
  statusByCulture,
  upcoming,
  visitCompliance,
  visitsByMonth,
} from "@/lib/painel";
import { ClickableBars, FASE_COLORS, MonthlyPairs, StackedBars } from "@/components/charts-extra";
import { Alert, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, StatusBadge, Table, Td, Th, buttonClass, cx } from "@/components/ui";
import { DemoSeal, FilterForm } from "./gestao/componentes";
import { Kpi, MetricInfo, ModeTabs, STATUS_TONE, entriesFor } from "./painel/componentes";

export const metadata: Metadata = { title: "Painel geral" };

export default async function PainelGeral({ searchParams }: PageProps<"/app">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const [load, pilot, { data: milestones }] = await Promise.all([
    loadPainel(ctx),
    loadDashboard(ctx, dashboardFilters({})),
    ctx.supabase.from("pilot_milestones").select("id, mes, titulo, status").eq("organization_id", ctx.orgId).order("mes"),
  ]);
  const { ref, demo } = load;
  const d = applyFilters(load.data, f);
  const p = portfolio(d.experiments);
  const byId = new Map(load.data.experiments.map((e) => [e.id, e]));
  const entries = entriesFor(load.schedules, load.events, d, load.data);
  const ids = new Set(d.experiments.map((e) => e.id));
  const tasks = load.tasksFull.filter((t) => !t.experiment_id || ids.has(t.experiment_id));
  const inPeriod = (x: string) => (!f.de || x >= f.de) && (!f.ate || x <= f.ate);
  const delayed = delayedExperiments(d.experiments, entries, tasks, ref);
  const open = d.incidents.filter((i) => i.status === "aberta" || i.status === "em_acompanhamento");
  const next30 = upcoming(entries, ref, 30);
  const nextVisits = next30.filter((e) => e.tipo === "visita");
  const openTasks = tasks.filter(isOpenTask);
  const compliance = visitCompliance(entries.filter((e) => inPeriod(e.data)), ref);
  const attention = attentionItems(d.incidents, tasks, entries, ref, 5);
  const months = visitsByMonth(entries.filter((e) => inPeriod(e.data)));
  const q = filtersQuery(f);
  const canGestor = has(ctx, "gestao.painel");
  const lastStage = (expId: string) =>
    d.visits.filter((v) => v.experiment_id === expId).sort((a, b) => b.data.localeCompare(a.data))[0]?.etapa_atual ?? null;
  const timeline = [
    ...entries.filter((e) => isOverdueEntry(e, ref)).map((e) => ({ e, kind: "atraso" as const })),
    ...next30.map((e) => ({ e, kind: "proximo" as const })),
    ...entries.filter((e) => e.status === "realizado" && e.tipo !== "visita").slice(-3).map((e) => ({ e, kind: "concluido" as const })),
  ].sort((a, b) => a.e.data.localeCompare(b.e.data));
  const pm = pilotMonth(ctx.settings?.piloto_inicio ?? null, ref);
  const totalMeses = (ctx.settings?.piloto_meses ?? 6) + (ctx.settings?.piloto_prorrogacao_meses ?? 0);
  const isEmpty = load.data.experiments.length === 0;
  const onboarding: [string, boolean, string][] = [
    ["Configurar organização e situação institucional", !!ctx.settings?.piloto_inicio, "/app/configuracoes"],
    ["Convidar a equipe", false, "/app/equipe"],
    ["Cadastrar fazenda e áreas", false, "/app/configuracoes?aba=fazenda"],
    ["Cadastrar o primeiro ensaio", !isEmpty, "/app/experimentos/novo"],
    ["Agendar um acompanhamento", load.schedules.length > 0, "/app/visitas/nova"],
    ["Registrar informações na ficha", pilot.taxa.numerador > 0, "/app/visitas"],
    ["Solicitar revisão de um conteúdo", pilot.revisao.conferencia + pilot.revisao.validacao + pilot.revisao.final > 0, "/app/editorial"],
    ["Preparar a publicação", pilot.revisao.liberados > 0 || pilot.boletins.publicados > 0, "/app/editorial/boletins"],
  ];
  const filesPend = load.filesByAuth.filter((x) => x.revisao_status === "pendente").length;
  const filesLib = load.filesByAuth.filter((x) => x.autorizacao_uso === "divulgacao_autorizada").length;

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={
          <>
            {ctx.orgNome} · {f.de || f.ate ? `período ${f.de ? fmtDate(f.de) : "início"} a ${f.ate ? fmtDate(f.ate) : fmtDate(ref)}` : "todo o histórico"} · referência {fmtDate(ref)}
            {p.ultimaAtualizacao && <> · última atualização {fmtDateTime(p.ultimaAtualizacao)}</>}
            {pm && <> · mês {pm} de {totalMeses} do piloto</>}
          </>
        }
        actions={
          <>
            <Link href={canGestor ? `/app/gestao/relatorio${q ? `?${q}` : ""}` : "/app/relatorios"} className={buttonClass("secondary")}>
              <FileText aria-hidden className="h-4 w-4" /> Gerar relatório
            </Link>
            {has(ctx, "compartilhamentos.gerenciar") && (
              <Link href={`/app/compartilhamentos/novo${q ? `?${q}` : ""}`} className={buttonClass("primary")}>
                <Share2 aria-hidden className="h-4 w-4" /> Compartilhar painel
              </Link>
            )}
          </>
        }
      />
      <ModeTabs current="geral" f={f} canGestor={canGestor} />
      {demo && <DemoSeal className="mb-4" />}

      {!ctx.settings?.onboarding_concluido && (isEmpty || has(ctx, "configuracoes.editar")) && (
        <Card className="mb-5">
          <CardHeader title="Primeiros passos" description="Nenhum dado institucional não confirmado é obrigatório para começar." />
          <CardBody>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {onboarding.map(([l, ok, href], i) => (
                <li key={l}>
                  <Link href={href} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm hover:border-brand-500">
                    {ok ? <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 text-brand-600" /> : <Circle aria-hidden className="mt-0.5 h-4 w-4 text-muted" />}
                    <span>
                      <span className="text-xs text-muted">{i + 1}. </span>
                      {l}
                      <span className="sr-only">{ok ? " (concluído)" : " (pendente)"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      <Card className="no-print mb-6 p-4">
        <FilterForm all={load.data} f={f} action="/app" />
      </Card>

      {load.error ? (
        <Alert tone="danger" title="Não foi possível carregar todos os registros.">
          Tente novamente em instantes. Nenhum número foi estimado para compensar a falha.
        </Alert>
      ) : isEmpty ? (
        <Alert tone="info" title="Ainda não há ensaios cadastrados">
          Os indicadores aparecem conforme os dados reais forem registrados. Comece pelo cadastro de ensaios com fonte e data das informações.
        </Alert>
      ) : !d.experiments.length ? (
        <EmptyState title="Nenhum ensaio corresponde aos filtros." action={<Link href="/app" className={buttonClass("secondary")}>Limpar filtros</Link>} />
      ) : (
        <div className="space-y-6">
          <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
            <Kpi label="Total de ensaios" value={p.total} hint="na seleção" href="/app/experimentos" metric="ensaios_total" />
            <Kpi label="Em andamento" value={p.porFase.andamento} hint={`${p.porFase.implantacao} em implantação · ${p.porFase.planejado} planejado(s)`} href="/app/experimentos?fase=andamento" metric="ensaios_andamento" />
            <Kpi label="Concluídos" value={p.porFase.concluido} hint={p.porFase.interrompido ? `${p.porFase.interrompido} interrompido(s)` : "nenhum interrompido"} href="/app/experimentos?fase=concluido" />
            <Kpi
              label="Em atraso"
              value={p.porFase.andamento + p.porFase.implantacao ? delayed.length : "—"}
              hint={p.porFase.andamento + p.porFase.implantacao ? "com compromisso ou pendência vencidos" : "Dados insuficientes: nenhum ensaio ativo"}
              tone={delayed.length ? "warning" : "default"}
              metric="ensaios_atraso"
            />
            <Kpi
              label="Ocorrências abertas"
              value={open.length}
              hint={`${open.filter((i) => i.gravidade === "alta" || i.gravidade === "critica").length} de gravidade alta/crítica`}
              tone={open.some((i) => i.gravidade === "alta" || i.gravidade === "critica") ? "danger" : open.length ? "warning" : "default"}
              href={canGestor ? `/app/gestao${q ? `?${q}` : ""}#bloco-c` : undefined}
              metric="ocorrencias_abertas"
            />
            <Kpi label="Visitas (30 dias)" value={nextVisits.length} hint={`${nextVisits.filter((e) => e.status === "confirmado").length} confirmada(s), as demais planejadas`} href="/app/calendario?vista=lista" metric="visitas_proximas" />
            <Kpi
              label="Pendências abertas"
              value={openTasks.length}
              hint={`${openTasks.filter((t) => isOverdueTask(t, ref)).length} vencida(s)`}
              tone={openTasks.some((t) => isOverdueTask(t, ref)) ? "warning" : "default"}
              href="/app/atividades?vista=lista"
              metric="pendencias_abertas"
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Onde estão os estudos?" description="Ensaios por cultura. Clique para filtrar a página." />
              <CardBody>
                <ClickableBars
                  caption="Ensaios por cultura"
                  active={f.cultura}
                  data={p.culturas.map((c) => ({ key: c.label, label: c.label[0].toUpperCase() + c.label.slice(1), value: c.value }))}
                  hrefFor={(k) => `/app?${filtersQuery({ ...f, cultura: f.cultura === k ? "" : k })}`}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Em que situação estão?" description="Status dos ensaios por cultura." />
              <CardBody>
                <StackedBars
                  caption="Status por cultura"
                  rows={statusByCulture(d.experiments).map((r) => ({ label: r.cultura[0].toUpperCase() + r.cultura.slice(1), counts: r.counts, total: r.total }))}
                  series={FASES_STACK.map((k) => ({ key: k, label: PHASE_LABELS[k], color: FASE_COLORS[k] }))}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="O cronograma de visitas está sendo cumprido?" description="Visitas realizadas × agendadas por mês." />
              <CardBody>
                <MonthlyPairs caption="Visitas por mês" data={months} refMonth={ref.slice(0, 7)} fmt={fmtMonth} />
                <p className="mt-2 text-sm">
                  Cumprimento:{" "}
                  <strong className="tabular">{compliance.percentual === null ? "Dados insuficientes" : `${compliance.percentual.toLocaleString("pt-BR")}%`}</strong>{" "}
                  <span className="text-xs text-muted">
                    ({compliance.numerador} de {compliance.denominador} visitas vencidas)
                  </span>
                </p>
                <MetricInfo k="cumprimento_visitas" />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-5 2xl:grid-cols-5">
            <Card className="2xl:col-span-3">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <AlertTriangle aria-hidden className="h-4 w-4 text-warning-600" /> O que exige ação agora?
                  </span>
                }
                description="As cinco ocorrências, pendências e compromissos mais críticos."
              />
              <CardBody>
                {attention.length ? (
                  <Table caption="Itens que exigem atenção">
                    <thead>
                      <tr>
                        <Th>Item</Th>
                        <Th>Ensaio</Th>
                        <Th>Responsável</Th>
                        <Th>Prazo</Th>
                        <Th>Criticidade</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {attention.map((a, i) => (
                        <tr key={`${a.tipo}-${i}`}>
                          <Td>
                            <Link href={a.href} className="font-medium text-brand-700 hover:underline">
                              {a.tipo}: {a.titulo}
                            </Link>
                          </Td>
                          <Td className="whitespace-nowrap font-mono text-xs">{a.experiment_id ? byId.get(a.experiment_id)?.codigo : "—"}</Td>
                          <Td className="text-xs">{a.responsavel ?? <span className="text-muted">Não informado</span>}</Td>
                          <Td className="whitespace-nowrap text-xs">{a.data ? fmtDate(a.data) : <span className="text-muted">sem prazo</span>}</Td>
                          <Td className="text-xs">{a.criticidade}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted">Nada vencido ou em aberto na seleção.</p>
                )}
              </CardBody>
            </Card>
            <Card className="2xl:col-span-2">
              <CardHeader title="Linha do tempo do cronograma" description="Atrasos, próximos 30 dias e marcos concluídos." />
              <CardBody>
                {timeline.length ? (
                  <ol className="space-y-2 border-l-2 border-border pl-4">
                    {timeline.slice(0, 10).map(({ e, kind }) => (
                      <li key={e.key + kind} className="relative text-sm">
                        <span
                          aria-hidden
                          className={cx("absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ring-2 ring-surface", kind === "atraso" ? "bg-danger-600" : kind === "concluido" ? "bg-brand-700" : "border-2 border-dashed border-info-600 bg-surface")}
                        />
                        <p className="text-xs text-muted">
                          {fmtDate(e.data)} · {kind === "atraso" ? <strong className="text-danger-600">vencido</strong> : kind === "concluido" ? "concluído" : ENTRY_STATUS_LABELS[e.status].toLowerCase()}
                        </p>
                        <Link href={e.href} className="hover:underline">
                          {ENTRY_TIPO_LABELS[e.tipo]}: {e.titulo}
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">Nenhum compromisso vencido ou previsto para os próximos 30 dias.</p>
                )}
                <Link href="/app/calendario" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                  <CalendarDays aria-hidden className="h-4 w-4" /> Abrir o calendário
                </Link>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Próximos acompanhamentos" description="Visitas planejadas ou confirmadas. Planejada não é o mesmo que confirmada." />
            <CardBody>
              {nextVisits.length ? (
                <Table caption="Próximos acompanhamentos">
                  <thead>
                    <tr>
                      <Th>Data</Th>
                      <Th>Ensaio</Th>
                      <Th>Cultura</Th>
                      <Th>Última etapa registrada</Th>
                      <Th>Responsável</Th>
                      <Th>Status</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {nextVisits.map((e) => {
                      const ex = byId.get(e.experiment_ids[0]);
                      return (
                        <tr key={e.key}>
                          <Td className="whitespace-nowrap">
                            {fmtDate(e.data)} {e.hora && <span className="text-xs text-muted">{e.hora}</span>}
                          </Td>
                          <Td className="font-mono text-xs">{ex?.codigo ?? "—"}</Td>
                          <Td>{ex?.culturas.join(", ") ?? "—"}</Td>
                          <Td className="text-xs">{(ex && lastStage(ex.id)) ?? <span className="text-muted">sem registro</span>}</Td>
                          <Td className="text-xs">{ex?.responsavel ?? <span className="text-muted">Não informado</span>}</Td>
                          <Td>
                            <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1", STATUS_TONE[e.status])}>{ENTRY_STATUS_LABELS[e.status]}</span>
                          </Td>
                          <Td>
                            <Link href={`/app/calendario?vista=semana&data=${e.data}`} className="text-xs font-semibold text-brand-700 hover:underline">
                              No calendário
                            </Link>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-muted">Ainda não agendada: nenhuma visita planejada para os próximos 30 dias.</p>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Situação documental" description="Arquivos e conteúdos que você pode consultar." />
              <CardBody className="space-y-1.5 text-sm">
                <p className="flex justify-between">
                  Arquivos registrados <strong className="tabular">{load.filesByAuth.length}</strong>
                </p>
                <p className="flex justify-between">
                  Relatórios <strong className="tabular">{load.filesByAuth.filter((x) => x.tipo === "relatorio").length}</strong>
                </p>
                <p className="flex justify-between">
                  Pendentes de conferência <strong className="tabular">{filesPend}</strong>
                </p>
                <p className="flex justify-between">
                  Liberados para divulgação <strong className="tabular">{filesLib}</strong>
                </p>
                <p className="flex justify-between">
                  Conteúdos em revisão <strong className="tabular">{pilot.revisao.conferencia + pilot.revisao.validacao + pilot.revisao.final}</strong>
                </p>
                <p className="flex justify-between">
                  Liberados, a publicar <strong className="tabular">{pilot.revisao.liberados}</strong>
                </p>
                <LinkButton size="sm" className="mt-2" href={`/app/painel/documentos${q ? `?${q}` : ""}`}>
                  Ver documentos e aprovações
                </LinkButton>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={`Taxa de atualização — ${fmtMonth(ref.slice(0, 7))}`} description="Regra do piloto: ensaios com atualização devida no mês." />
              <CardBody>
                <p className="font-display text-3xl font-semibold tabular text-brand-950">{pilot.taxa.percentual === null ? "Dados insuficientes" : `${pilot.taxa.percentual}%`}</p>
                <p className="mt-1 text-xs text-muted">
                  {pilot.taxa.numerador} de {pilot.taxa.denominador} elegíveis
                </p>
                <MetricInfo k="taxa_atualizacao" />
                {pilot.experimentos.semAtualizacao.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {pilot.experimentos.semAtualizacao.slice(0, 5).map((e) => (
                      <li key={e.id}>
                        <Link className="hover:underline" href={`/app/experimentos/${e.id}`}>
                          <span className="font-mono text-xs">{e.codigo}</span> {e.titulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Linha do tempo do piloto" description={ctx.settings?.piloto_inicio ? `Início em ${fmtDate(ctx.settings.piloto_inicio)} · ${totalMeses} meses` : "Início do piloto não configurado."} />
              <CardBody>
                {(milestones ?? []).length ? (
                  <ol className="grid grid-cols-2 gap-2">
                    {(milestones ?? []).map((m) => (
                      <li key={m.id} className={cx("rounded-lg border p-2 text-sm", pm === m.mes ? "border-brand-600 bg-brand-50" : "border-border")} aria-current={pm === m.mes ? "step" : undefined}>
                        <p className="text-xs font-semibold text-muted">Mês {m.mes}</p>
                        <p className="font-medium">{m.titulo}</p>
                        <StatusBadge status={m.status === "concluido" ? "concluida" : m.status === "em_andamento" ? "em_andamento" : "a_fazer"} label={m.status.replace("_", " ")} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">Sem marcos do piloto cadastrados para esta organização.</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
