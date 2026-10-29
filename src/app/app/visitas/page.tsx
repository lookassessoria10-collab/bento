import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { addDays, fmtDateTime, fmtMonth, localDate, localMonth, monthBoundsUtc } from "@/lib/format";
import { monthBounds } from "@/lib/metrics";
import { VISIT_STATUS_LABELS } from "@/lib/labels";
import { listExperimentOptions, experimentOptions } from "@/lib/data/lookups";
import { Alert, Card, CardBody, CardHeader, DemoBadge, EmptyState, LinkButton, PageHeader, Select, StatusBadge, Tabs, buttonClass, cx, optionsFrom } from "@/components/ui";

export const metadata: Metadata = { title: "Visitas e acompanhamento" };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function VisitsPage({ searchParams }: PageProps<"/app/visitas">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const mes = /^\d{4}-\d{2}$/.test(s("mes")) ? s("mes") : localMonth();
  const view = ["calendario", "lista", "semana"].includes(s("vista")) ? s("vista") : "calendario";
  const status = s("status");
  const exp = s("experimento");
  const today = localDate();

  const { start, end } = monthBounds(mes);
  const weekStart = addDays(today, -new Date(`${today}T12:00:00Z`).getUTCDay());
  const range = view === "semana" ? monthBoundsUtc(weekStart, addDays(weekStart, 6)) : monthBoundsUtc(start, end);

  let q = ctx.supabase
    .from("visit_schedules")
    .select("id, titulo, data_hora, status, local, is_demo, visit_schedule_experiments!inner(experiment_id, experiments(codigo)), visit_records(status)")
    .eq("organization_id", ctx.orgId)
    .gte("data_hora", range.from)
    .lt("data_hora", range.to)
    .order("data_hora");
  if (status && status in VISIT_STATUS_LABELS) q = q.eq("status", status as keyof typeof VISIT_STATUS_LABELS);
  if (/^[0-9a-f-]{36}$/.test(exp)) q = q.eq("visit_schedule_experiments.experiment_id", exp);

  const [{ data: visits }, exps, due] = await Promise.all([q, listExperimentOptions(ctx), dueThisMonth()]);

  async function dueThisMonth() {
    // experimentos com acompanhamento mensal ativo e sem ficha enviada neste mês
    const [{ data: active }, { data: recs }] = await Promise.all([
      ctx.supabase
        .from("experiments")
        .select("id, codigo, titulo_curto, titulo")
        .eq("organization_id", ctx.orgId)
        .is("archived_at", null)
        .eq("acompanhamento_ativo", true)
        .in("fase", ["implantacao", "andamento"])
        .in("periodicidade_acompanhamento", ["mensal", "quinzenal"]),
      ctx.supabase
        .from("visit_records")
        .select("experiment_id, status, visit_schedules!inner(data_hora)")
        .eq("organization_id", ctx.orgId)
        .neq("status", "rascunho")
        .gte("visit_schedules.data_hora", monthBoundsUtc(start, end).from)
        .lt("visit_schedules.data_hora", monthBoundsUtc(start, end).to),
    ]);
    const done = new Set((recs ?? []).map((r) => r.experiment_id));
    return (active ?? []).filter((e) => !done.has(e.id));
  }

  const [y, m] = mes.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ mes, vista: view, ...(status && { status }), ...(exp && { experimento: exp }), ...patch });
    return `/app/visitas?${p}`;
  };

  const byDay = new Map<string, NonNullable<typeof visits>>();
  for (const v of visits ?? []) {
    const d = localDate(v.data_hora);
    byDay.set(d, [...(byDay.get(d) ?? []), v]);
  }

  const firstDow = new Date(`${start}T12:00:00Z`).getUTCDay();
  const daysInMonth = Number(end.slice(8));
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)];

  return (
    <>
      <PageHeader
        title="Visitas e acompanhamento"
        description="Planejar → realizar → preencher a ficha → conferir → finalizar. Visita adiada nunca é contada como realizada."
        actions={
          has(ctx, "visitas.gerenciar") && (
            <LinkButton variant="primary" href="/app/visitas/nova">
              <Plus aria-hidden className="h-4 w-4" /> Agendar visita
            </LinkButton>
          )
        }
      />

      {due.length > 0 && (
        <div className="mb-4">
          <Alert tone="warning" title={`${due.length} experimento(s) com acompanhamento devido em ${fmtMonth(localMonth())} ainda sem ficha enviada`}>
            {due.slice(0, 8).map((e, i) => (
              <span key={e.id}>
                {i > 0 && ", "}
                <Link className="underline" href={`/app/experimentos/${e.id}`}>
                  {e.codigo}
                </Link>
              </span>
            ))}
            {due.length > 8 && ` e mais ${due.length - 8}`}
          </Alert>
        </div>
      )}

      <Tabs
        current={view}
        tabs={[
          { key: "calendario", label: "Mês", href: qs({ vista: "calendario" }) },
          { key: "semana", label: "Esta semana", href: qs({ vista: "semana" }) },
          { key: "lista", label: "Lista", href: qs({ vista: "lista" }) },
        ]}
      />

      <form className="mb-4 flex flex-wrap items-end gap-2" aria-label="Filtrar visitas">
        <input type="hidden" name="mes" value={mes} />
        <input type="hidden" name="vista" value={view} />
        <div>
          <label htmlFor="status" className="text-xs text-muted">
            Situação
          </label>
          <Select name="status" defaultValue={status} options={optionsFrom(VISIT_STATUS_LABELS)} placeholder="Todas" />
        </div>
        <div>
          <label htmlFor="experimento" className="text-xs text-muted">
            Experimento
          </label>
          <Select name="experimento" defaultValue={exp} options={experimentOptions(exps)} placeholder="Todos" />
        </div>
        <button className={buttonClass("secondary", "md")}>Filtrar</button>
      </form>

      {view !== "semana" && (
        <div className="mb-3 flex items-center gap-2">
          <Link className={buttonClass("ghost", "sm")} href={qs({ mes: prev })} aria-label="Mês anterior">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Link>
          <h2 className="min-w-44 text-center font-semibold">{fmtMonth(mes)}</h2>
          <Link className={buttonClass("ghost", "sm")} href={qs({ mes: next })} aria-label="Próximo mês">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      )}

      {view === "calendario" ? (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-7 border-b border-border bg-surface-muted text-center text-xs font-semibold text-muted md:grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7">
            {cells.map((d, i) =>
              d === null ? (
                <div key={i} className="hidden min-h-24 border-b border-r border-border bg-surface-muted/40 md:block" />
              ) : (
                <div
                  key={d}
                  className={cx("min-h-24 border-b border-r border-border p-1.5", d === today && "bg-brand-50", !byDay.get(d) && "hidden md:block")}
                >
                  <p className={cx("text-xs tabular", d === today ? "font-bold text-brand-700" : "text-muted")}>
                    <span className="md:hidden">{WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]} </span>
                    {d.slice(8)}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {(byDay.get(d) ?? []).map((v) => (
                      <li key={v.id}>
                        <Link href={`/app/visitas/${v.id}`} className="block rounded border border-border bg-surface px-1.5 py-1 text-xs hover:border-brand-500">
                          <span className="font-medium">{fmtDateTime(v.data_hora).slice(11)}</span> {v.titulo}
                          <span className="mt-0.5 block">
                            <StatusBadge status={v.status} label={VISIT_STATUS_LABELS[v.status]} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
          {!visits?.length && <p className="p-4 text-center text-sm text-muted">Nenhuma visita neste mês.</p>}
        </Card>
      ) : !visits?.length ? (
        <EmptyState title="Nenhuma visita no período.">Agende visitas e vincule os experimentos a acompanhar.</EmptyState>
      ) : (
        <Card>
          <CardHeader title={view === "semana" ? "Visitas desta semana" : `Visitas de ${fmtMonth(mes)}`} />
          <CardBody>
            <ul className="divide-y divide-border">
              {visits.map((v) => {
                const codes = (v.visit_schedule_experiments as unknown as { experiments: { codigo: string } | null }[]).map((x) => x.experiments?.codigo).filter(Boolean);
                const recs = v.visit_records as unknown as { status: string }[];
                return (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link href={`/app/visitas/${v.id}`} className="font-medium hover:underline">
                        {v.titulo}
                      </Link>
                      <p className="text-xs text-muted">
                        {fmtDateTime(v.data_hora)} · {v.local ?? "Local não informado"} · {codes.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {v.is_demo && <DemoBadge />}
                      <span className="text-muted">
                        Fichas: {recs.filter((r) => r.status !== "rascunho").length}/{recs.length}
                      </span>
                      <StatusBadge status={v.status} label={VISIT_STATUS_LABELS[v.status]} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
