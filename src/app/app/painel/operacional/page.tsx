import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { loadPainel } from "@/lib/data/painel";
import { applyFilters, dueVisits, parseFilters } from "@/lib/gestao";
import { ENTRY_STATUS_LABELS, ENTRY_TIPO_LABELS, addDaysIso, ganttRows, isOpenTask, isOverdueTask, staleExperiments, tasksByResponsible, weeklyCounts } from "@/lib/painel";
import { Gantt, WeekHeatmap } from "@/components/charts-extra";
import { Alert, Card, CardBody, CardHeader, PageHeader, Table, Td, Th, buttonClass, cx } from "@/components/ui";
import { DemoSeal, FilterForm } from "../../gestao/componentes";
import { Kpi, ModeTabs, STATUS_TONE, entriesFor } from "../componentes";

export const metadata: Metadata = { title: "Painel operacional" };

export default async function PainelOperacional({ searchParams }: PageProps<"/app/painel/operacional">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const f = parseFilters(sp);
  // critério de "sem registro recente" configurável pela URL (padrão 30 dias)
  const dias = Math.min(365, Math.max(7, Number(typeof sp.dias === "string" ? sp.dias : 30) || 30));
  const load = await loadPainel(ctx);
  const { ref, demo } = load;
  const d = applyFilters(load.data, f);
  const ids = new Set(d.experiments.map((e) => e.id));
  const byId = new Map(load.data.experiments.map((e) => [e.id, e]));
  const entries = entriesFor(load.schedules, load.events, d, load.data);
  const tasks = load.tasksFull.filter((t) => !t.experiment_id || ids.has(t.experiment_id));
  const week = entries.filter((e) => e.data >= ref && e.data <= addDaysIso(ref, 6) && e.status !== "cancelado");
  const due = dueVisits(d.experiments, load.data.visits, ref);
  const stale = staleExperiments(d.experiments, load.data.visits, ref, dias);
  const open = tasks.filter(isOpenTask).sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  const overdue = open.filter((t) => isOverdueTask(t, ref));
  const doneRecent = tasks.filter((t) => t.status === "concluida").sort((a, b) => (b.concluida_em ?? "").localeCompare(a.concluida_em ?? "")).slice(0, 8);
  const byResp = tasksByResponsible(tasks, ref);
  const byPriority = (["urgente", "alta", "media", "baixa"] as const).map((pr) => ({ pr, n: open.filter((t) => t.prioridade === pr).length }));
  const gantt = ganttRows(d.experiments, load.data.visits);

  return (
    <>
      <PageHeader title="Visão operacional" description={`Agenda, visitas devidas, pendências por responsável e ensaios sem registro recente. Referência: ${fmtDate(ref)}.`} />
      <ModeTabs current="operacional" f={f} canGestor={has(ctx, "gestao.painel")} />
      {demo && <DemoSeal className="mb-4" />}
      <Card className="no-print mb-6 p-4">
        <FilterForm all={load.data} f={f} action="/app/painel/operacional" />
      </Card>
      {load.error && (
        <Alert tone="danger" title="Não foi possível carregar todos os registros.">
          Tente novamente em instantes.
        </Alert>
      )}

      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores operacionais">
          <Kpi label="Compromissos nesta semana" value={week.length} hint={`${fmtDate(ref)} a ${fmtDate(addDaysIso(ref, 6))}`} href="/app/calendario?vista=semana" />
          <Kpi label="Visitas devidas" value={due.filter((x) => x.devida).length} hint="ensaios em andamento além da periodicidade" tone={due.some((x) => x.devida) ? "warning" : "default"} />
          <Kpi label="Pendências vencidas" value={overdue.length} hint={`${open.length} abertas no total`} tone={overdue.length ? "danger" : "default"} href="/app/atividades?vista=lista" metric="pendencias_abertas" />
          <Kpi label={`Sem registro há > ${dias} dias`} value={stale.length} hint="ensaios ativos" tone={stale.length ? "warning" : "default"} />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Agenda dos próximos 7 dias" description="Visitas e compromissos dos ensaios selecionados." />
            <CardBody>
              {week.length ? (
                <ul className="space-y-2">
                  {week.map((e) => (
                    <li key={e.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                      <span>
                        <span className="text-xs text-muted">{fmtDate(e.data)}{e.hora ? ` · ${e.hora}` : ""} · {ENTRY_TIPO_LABELS[e.tipo]}</span>
                        <Link href={e.href} className="block font-medium hover:underline">
                          {e.titulo}
                        </Link>
                      </span>
                      <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold ring-1", STATUS_TONE[e.status])}>{ENTRY_STATUS_LABELS[e.status]}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhum compromisso nos próximos 7 dias.</p>
              )}
              <Link href="/app/calendario" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
                Calendário mensal
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Visitas devidas e executadas" description="Ensaios em andamento, pela periodicidade cadastrada." />
            <CardBody>
              {due.length ? (
                <Table caption="Visitas devidas por ensaio">
                  <thead>
                    <tr>
                      <Th>Ensaio</Th>
                      <Th>Última visita</Th>
                      <Th>Dias</Th>
                      <Th>Situação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {due.map((x) => (
                      <tr key={x.experiment.id}>
                        <Td className="font-mono text-xs">
                          <Link href={`/app/experimentos/${x.experiment.id}?aba=acompanhamento`} className="text-brand-700 hover:underline">
                            {x.experiment.codigo}
                          </Link>
                        </Td>
                        <Td>{x.ultimaVisita ? fmtDate(x.ultimaVisita) : "—"}</Td>
                        <Td className="tabular">
                          {x.diasDesde ?? "—"} / {x.limite}
                        </Td>
                        <Td className={x.devida ? "font-semibold text-warning-600" : "text-muted"}>{x.devida ? "Visita devida" : "Em dia"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-muted">Nenhum ensaio em andamento com periodicidade definida.</p>
              )}
              <p className="mt-2 text-xs text-muted">Visitas realizadas na seleção: {d.visits.length}.</p>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Atividades por responsável" description="Abertas, vencidas e concluídas." />
            <CardBody>
              <Table caption="Atividades por responsável">
                <thead>
                  <tr>
                    <Th>Responsável</Th>
                    <Th className="text-right">Abertas</Th>
                    <Th className="text-right">Vencidas</Th>
                    <Th className="text-right">Concluídas</Th>
                  </tr>
                </thead>
                <tbody>
                  {byResp.map((r) => (
                    <tr key={r.responsavel}>
                      <Td>{r.responsavel}</Td>
                      <Td className="text-right tabular">{r.abertas}</Td>
                      <Td className={cx("text-right tabular", r.vencidas && "font-semibold text-danger-600")}>{r.vencidas}</Td>
                      <Td className="text-right tabular">{r.concluidas}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <p className="mt-2 text-xs text-muted">
                Abertas por prioridade: {byPriority.map((x) => `${PRIORITY_LABELS[x.pr]} ${x.n}`).join(" · ")}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Prazos" description="Pendências abertas por prazo e últimas concluídas." />
            <CardBody>
              <ul className="space-y-1.5 text-sm">
                {open.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex flex-wrap justify-between gap-2">
                    <Link href={`/app/atividades?tarefa=${t.id}`} className="hover:underline">
                      {t.experiment_id && <span className="font-mono text-xs">{byId.get(t.experiment_id)?.codigo} </span>}
                      {t.titulo}
                    </Link>
                    <span className={cx("text-xs", isOverdueTask(t, ref) ? "font-semibold text-danger-600" : "text-muted")}>
                      {t.prazo ? `${isOverdueTask(t, ref) ? "venceu em" : "prazo"} ${fmtDate(t.prazo)}` : "sem prazo"} · {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]}
                    </span>
                  </li>
                ))}
                {!open.length && <li className="text-muted">Nenhuma pendência aberta.</li>}
              </ul>
              {doneRecent.length > 0 && (
                <p className="mt-3 text-xs text-muted">
                  Concluídas recentemente: {doneRecent.map((t) => t.titulo).slice(0, 4).join("; ")}
                  {doneRecent.length > 4 ? "…" : ""}
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={`Ensaios ativos sem registro há mais de ${dias} dias`} description="Critério configurável." />
            <CardBody>
              <form className="no-print mb-3 flex items-end gap-2 text-xs text-muted">
                {Object.entries(f)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                <label className="flex flex-col gap-1">
                  Dias sem registro
                  <input type="number" name="dias" min={7} max={365} defaultValue={dias} className="h-9 w-24 rounded-lg border border-border px-2 text-sm text-foreground" />
                </label>
                <button className={buttonClass("secondary", "sm")}>Aplicar</button>
              </form>
              {stale.length ? (
                <ul className="space-y-1 text-sm">
                  {stale.map((x) => (
                    <li key={x.experiment.id}>
                      <Link href={`/app/experimentos/${x.experiment.id}?aba=acompanhamento`} className="hover:underline">
                        <span className="font-mono text-xs">{x.experiment.codigo}</span> {x.experiment.titulo}
                      </Link>{" "}
                      <span className="text-xs text-muted">{x.ultima ? `última visita ${fmtDate(x.ultima)} (${x.dias} dias)` : "nenhuma visita registrada"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Todos os ensaios ativos têm registro dentro do critério.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Visitas realizadas por semana" description="Contagens reais; semanas sem visita não aparecem." />
            <CardBody>
              <WeekHeatmap data={weeklyCounts(entries)} caption="Visitas realizadas por semana" />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Cronograma previsto × registrado" description="Previsto pelo cadastro do ensaio; registrado pela primeira e última visita. Não indica atraso por si só." />
          <CardBody>
            <Gantt
              refDate={ref}
              caption="Cronograma dos ensaios"
              rows={gantt.map((g) => ({ key: g.experiment.codigo, label: <span className="font-mono">{g.experiment.codigo}</span>, previstoInicio: g.previstoInicio, previstoFim: g.previstoFim, realInicio: g.realInicio, realFim: g.realFim }))}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
