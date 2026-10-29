import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtMonth, localDate } from "@/lib/format";
import { PHASE_LABELS, VISIT_STATUS_LABELS } from "@/lib/labels";
import { pilotMonth } from "@/lib/metrics";
import { dashboardFilters, loadDashboard } from "@/lib/data/dashboard";
import { listPeople } from "@/lib/data/lookups";
import { BarList, Stat } from "@/components/charts";
import { Alert, Card, CardBody, CardHeader, DemoBadge, Input, LinkButton, PageHeader, Select, StatusBadge, buttonClass, cx, optionsFrom } from "@/components/ui";

export const metadata: Metadata = { title: "Visão geral" };

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const f = dashboardFilters(sp);
  const [d, people, { data: milestones }] = await Promise.all([
    loadDashboard(ctx, f),
    listPeople(ctx),
    ctx.supabase.from("pilot_milestones").select("id, mes, titulo, status").eq("organization_id", ctx.orgId).order("mes"),
  ]);
  const today = localDate();
  const pm = pilotMonth(ctx.settings?.piloto_inicio ?? null, today);
  const totalMeses = (ctx.settings?.piloto_meses ?? 6) + (ctx.settings?.piloto_prorrogacao_meses ?? 0);
  const isEmpty = d.experimentos.total === 0;

  const onboarding: [string, boolean, string][] = [
    ["Configurar organização e situação institucional", !!ctx.settings?.piloto_inicio, "/app/configuracoes"],
    ["Convidar a equipe", false, "/app/equipe"],
    ["Cadastrar fazenda e áreas", false, "/app/configuracoes?aba=fazenda"],
    ["Cadastrar o primeiro experimento", !isEmpty, "/app/experimentos/novo"],
    ["Agendar uma visita", d.visitas.previstas + d.visitas.realizadas > 0, "/app/visitas/nova"],
    ["Registrar informações na ficha", d.taxa.numerador > 0, "/app/visitas"],
    ["Solicitar revisão de um conteúdo", d.revisao.conferencia + d.revisao.validacao + d.revisao.final > 0, "/app/editorial"],
    ["Preparar a publicação", d.revisao.liberados > 0 || d.boletins.publicados > 0, "/app/editorial/boletins"],
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${ctx.nome.split(" ")[0]}`}
        description={`${ctx.settings?.nome_projeto ?? "Entomo Agro 360"} · ${pm ? `mês ${pm} de ${totalMeses} do piloto` : "início do piloto não configurado"} · indicadores de ${fmtDate(f.de)} a ${fmtDate(f.ate)}`}
        actions={
          has(ctx, "experimentos.criar") && (
            <LinkButton variant="primary" href="/app/experimentos/novo">
              Novo experimento
            </LinkButton>
          )
        }
      />

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

      <details className="mb-5 rounded-xl border border-border bg-surface p-3" open={Object.values(sp).some(Boolean)}>
        <summary className="cursor-pointer text-sm font-medium">Filtros dos indicadores</summary>
        <form className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-7" aria-label="Filtros do painel">
          <label className="text-xs text-muted">
            De
            <Input name="de" type="date" defaultValue={f.de} />
          </label>
          <label className="text-xs text-muted">
            Até
            <Input name="ate" type="date" defaultValue={f.ate} />
          </label>
          <label className="text-xs text-muted">
            Área
            <Input name="area" defaultValue={f.area} />
          </label>
          <label className="text-xs text-muted">
            Cultura
            <Input name="cultura" defaultValue={f.cultura} />
          </label>
          <label className="text-xs text-muted">
            Responsável
            <Select name="responsavel" defaultValue={f.responsavel} options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="Todos" />
          </label>
          <label className="text-xs text-muted">
            Fase
            <Select name="fase" defaultValue={f.fase} options={optionsFrom(PHASE_LABELS)} placeholder="Todas" />
          </label>
          <div className="flex items-end gap-2">
            <button className={buttonClass("primary", "md")}>Aplicar</button>
            <Link className="text-sm text-brand-700 underline" href="/app">
              Limpar
            </Link>
          </div>
        </form>
      </details>

      {isEmpty ? (
        <Alert tone="info" title="Ainda não há experimentos cadastrados">
          Os indicadores aparecem conforme os dados reais forem registrados. Comece pelo cadastro de experimentos com fonte e data das informações.
        </Alert>
      ) : (
        <>
          <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Stat label="Experimentos" value={d.experimentos.total} hint={`${d.experimentos.ativos} em acompanhamento ativo`} />
            <Stat
              label={`Registros devidos — ${fmtMonth(today.slice(0, 7))}`}
              value={d.taxa.percentual === null ? "—" : `${d.taxa.percentual}%`}
              hint={`${d.taxa.numerador} de ${d.taxa.denominador} elegíveis`}
              tone={d.taxa.percentual !== null && d.taxa.percentual < 50 ? "warning" : "default"}
            />
            <Stat label="Visitas previstas" value={d.visitas.previstas} hint={`${d.visitas.realizadas} realizadas · ${d.visitas.adiadas} adiadas`} />
            <Stat label="Pendências abertas" value={d.pendencias.abertas} hint={`${d.pendencias.resolvidasNoPeriodo} resolvidas no período`} />
            <Stat label="Pendências vencidas" value={d.pendencias.vencidas} tone={d.pendencias.vencidas ? "danger" : "default"} />
            <Stat label="Boletins publicados" value={`${d.boletins.publicados}/${ctx.settings?.meta_boletins ?? 2}`} hint={`${d.boletins.preparacao} em preparação`} />
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Por fase do experimento" description="Situação do experimento ≠ situação de revisão/publicação." />
              <CardBody>
                <BarList caption="Experimentos por fase" data={d.experimentos.porFase.map((x) => ({ ...x, label: PHASE_LABELS[x.label as keyof typeof PHASE_LABELS] ?? x.label }))} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Por cultura" />
              <CardBody>
                <BarList caption="Experimentos por cultura" data={d.experimentos.porCultura} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Por área temática e local" />
              <CardBody className="space-y-4">
                <BarList caption="Experimentos por área temática" data={d.experimentos.porArea} />
                <BarList caption="Experimentos por local" data={d.experimentos.porLocal} />
              </CardBody>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Revisão de conteúdos" description="Fila atual (sem filtro de período)." />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    Em conferência interna <strong className="tabular">{d.revisao.conferencia}</strong>
                  </li>
                  <li className="flex justify-between">
                    Aguardando validação científica <strong className="tabular">{d.revisao.validacao}</strong>
                  </li>
                  <li className="flex justify-between">
                    Aguardando revisão final <strong className="tabular">{d.revisao.final}</strong>
                  </li>
                  <li className="flex justify-between">
                    Liberados, a publicar <strong className="tabular">{d.revisao.liberados}</strong>
                  </li>
                </ul>
                <LinkButton size="sm" className="mt-3" href="/app/aprovacoes">
                  Abrir filas
                </LinkButton>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Sem atualização devida neste mês" description="Elegíveis sem ficha enviada (exclui encerrados sem atualização prevista)." />
              <CardBody>
                {d.experimentos.semAtualizacao.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum experimento pendente.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {d.experimentos.semAtualizacao.slice(0, 10).map((e) => (
                      <li key={e.id}>
                        <Link className="hover:underline" href={`/app/experimentos/${e.id}`}>
                          <span className="font-mono text-xs">{e.codigo}</span> {e.titulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <details className="mt-2 text-xs text-muted">
                  <summary className="cursor-pointer">Como é calculado</summary>
                  <ul className="mt-1 list-disc pl-4">
                    {d.taxa.regras.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </details>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Agenda" description="Próximos 7 e 30 dias (horário da Bahia)." />
              <CardBody>
                {d.agenda.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma visita agendada nos próximos 30 dias.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {d.agenda.map((v) => (
                      <li key={v.id} className={cx("rounded-lg border p-2", v.em7 ? "border-accent-500" : "border-border")}>
                        <Link className="font-medium hover:underline" href={`/app/visitas/${v.id}`}>
                          {v.titulo}
                        </Link>
                        <p className="text-xs text-muted">
                          {fmtDateTime(v.data_hora)} · {VISIT_STATUS_LABELS[v.status]} {v.em7 && "· próximos 7 dias"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Linha do tempo do piloto" description={ctx.settings?.piloto_inicio ? `Início em ${fmtDate(ctx.settings.piloto_inicio)} · ${totalMeses} meses` : "Configure o início real do piloto em Configurações."} />
          <CardBody>
            <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(milestones ?? []).map((m) => (
                <li key={m.id} className={cx("rounded-lg border p-2 text-sm", pm === m.mes ? "border-brand-600 bg-brand-50" : "border-border")} aria-current={pm === m.mes ? "step" : undefined}>
                  <p className="text-xs font-semibold text-muted">Mês {m.mes}</p>
                  <p className="font-medium">{m.titulo}</p>
                  <StatusBadge status={m.status === "concluido" ? "concluida" : m.status === "em_andamento" ? "em_andamento" : "a_fazer"} label={m.status.replace("_", " ")} />
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Atualizações recentes" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {d.recentes.map((e) => (
                <li key={e.id}>
                  <Link className="hover:underline" href={`/app/experimentos/${e.id}`}>
                    <span className="font-mono text-xs">{e.codigo}</span> {e.titulo_curto || e.titulo}
                  </Link>
                  {e.is_demo && <span className="ml-1"><DemoBadge /></span>}
                  <p className="text-xs text-muted">{fmtDateTime(e.updated_at)}</p>
                </li>
              ))}
              {!d.recentes.length && <li className="text-muted">Sem atualizações.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
