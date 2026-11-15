import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, History } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtMonth, localDate } from "@/lib/format";
import { loadPainel } from "@/lib/data/painel";
import { listMembers } from "@/lib/data/lookups";
import { applyFilters, parseFilters } from "@/lib/gestao";
import { ENTRY_STATUS_LABELS, ENTRY_TIPO_LABELS, addDaysIso, calendarEntries, isOverdueEntry, upcoming, type EntryStatus, type EntryTipo } from "@/lib/painel";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Tabs, Textarea, buttonClass, cx } from "@/components/ui";
import { DemoSeal } from "../gestao/componentes";
import { STATUS_TONE } from "../painel/componentes";
import { createCalendarEvent, updateCalendarEvent } from "./actions";

export const metadata: Metadata = { title: "Calendário" };
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarioPage({ searchParams }: PageProps<"/app/calendario">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = parseFilters(sp);
  const vista = ["mes", "semana", "lista"].includes(s("vista")) ? s("vista") : "mes";
  const tipo = (Object.keys(ENTRY_TIPO_LABELS) as EntryTipo[]).includes(s("tipo") as EntryTipo) ? (s("tipo") as EntryTipo) : "";
  const status = (Object.keys(ENTRY_STATUS_LABELS) as EntryStatus[]).includes(s("status") as EntryStatus) ? (s("status") as EntryStatus) : "";
  const ensaio = /^[0-9a-f-]{36}$/.test(s("ensaio")) ? s("ensaio") : "";
  const canEdit = has(ctx, "agenda.gerenciar");

  const [load, members] = await Promise.all([loadPainel(ctx), canEdit ? listMembers(ctx) : Promise.resolve([])]);
  const { ref, demo } = load;
  const today = localDate();
  const anchor = ISO.test(s("data")) ? s("data") : ref;
  const d = applyFilters(load.data, { ...f, de: "", ate: "" });
  const ids = new Set(d.experiments.map((e) => e.id));
  const filtered = d.experiments.length !== load.data.experiments.length || !!ensaio;
  const all = calendarEntries(load.schedules, load.events).filter(
    (e) =>
      (e.experiment_ids.length ? e.experiment_ids.some((id) => ids.has(id) && (!ensaio || id === ensaio)) : !filtered) &&
      (!tipo || e.tipo === tipo) &&
      (!status || e.status === status),
  );
  const byId = new Map(load.data.experiments.map((e) => [e.id, e]));
  const overdue = all.filter((e) => isOverdueEntry(e, ref));
  const next = upcoming(all, ref, 365)[0];

  // intervalo da vista
  const month = anchor.slice(0, 7);
  const first = `${month}-01`;
  const startDow = new Date(`${first}T12:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const weekStart = addDaysIso(anchor, -new Date(`${anchor}T12:00:00Z`).getUTCDay());
  const range: [string, string] = vista === "mes" ? [first, `${month}-${String(daysInMonth).padStart(2, "0")}`] : vista === "semana" ? [weekStart, addDaysIso(weekStart, 6)] : [ref, addDaysIso(ref, 60)];
  const inView = all.filter((e) => e.data >= range[0] && e.data <= range[1]);
  const listView = vista === "lista" ? [...overdue.filter((e) => e.data < range[0]), ...inView] : inView;
  const byDay = new Map<string, typeof all>();
  for (const e of inView) byDay.set(e.data, [...(byDay.get(e.data) ?? []), e]);
  const prevAnchor = vista === "semana" ? addDaysIso(anchor, -7) : addDaysIso(first, -1).slice(0, 7) + "-01";
  const nextAnchor = vista === "semana" ? addDaysIso(anchor, 7) : addDaysIso(`${month}-${String(daysInMonth).padStart(2, "0")}`, 1);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ vista, data: anchor, ...(tipo && { tipo }), ...(status && { status }), ...(ensaio && { ensaio }), ...(f.cultura && { cultura: f.cultura }), ...(f.area && { area: f.area }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/app/calendario?${p}`;
  };

  // detalhe de um compromisso
  const evId = /^[0-9a-f-]{36}$/.test(s("evento")) ? s("evento") : "";
  const { data: ev } = evId
    ? await ctx.supabase.from("calendar_events").select("*, profiles:responsavel_id(nome), experiments(codigo, titulo)").eq("id", evId).eq("organization_id", ctx.orgId).maybeSingle()
    : { data: null };
  const hist = (ev?.historico ?? []) as { em: string; data_de: string; data_para: string; status_de: string; status_para: string; motivo: string | null }[];

  const Item = ({ e }: { e: (typeof all)[number] }) => (
    <Link
      href={e.origem === "evento" ? qs({ evento: e.id }) : e.href}
      className={cx("block rounded-lg border bg-surface px-1.5 py-1 text-xs hover:border-brand-500", isOverdueEntry(e, ref) ? "border-danger-600/50" : "border-border")}
      title={`${ENTRY_TIPO_LABELS[e.tipo]} · ${ENTRY_STATUS_LABELS[e.status]}`}
    >
      {e.hora && <span className="font-semibold">{e.hora} </span>}
      {e.titulo}
      <span className="mt-0.5 flex flex-wrap items-center gap-1">
        <span className={cx("rounded-full px-1.5 text-[10px] font-semibold ring-1", STATUS_TONE[e.status])}>{ENTRY_STATUS_LABELS[e.status]}</span>
        <span className="text-[10px] text-muted">{ENTRY_TIPO_LABELS[e.tipo]}</span>
        {isOverdueEntry(e, ref) && <span className="text-[10px] font-bold text-danger-600">vencido</span>}
      </span>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Calendário"
        description="Visitas de acompanhamento, avaliações, reuniões, coletas, prazos e marcos dos ensaios. Datas no horário da Bahia; data prevista e data de realização ficam separadas."
        actions={
          canEdit && (
            <>
              <Link href="/app/visitas/nova" className={buttonClass("secondary")}>
                Agendar visita
              </Link>
              <a href="#novo-compromisso" className={buttonClass("primary")}>
                <CalendarPlus aria-hidden className="h-4 w-4" /> Novo compromisso
              </a>
            </>
          )
        }
      />
      {demo && <DemoSeal className="mb-4" />}
      {load.agendaError && (
        <Alert tone="danger" title="Não foi possível carregar a agenda.">
          Tente novamente em instantes.
        </Alert>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumo da agenda">
        {[
          ["Hoje", fmtDate(today), demo && ref !== today ? `referência da demonstração: ${fmtDate(ref)}` : ""],
          ["Próximo compromisso", next ? fmtDate(next.data) : "Ainda não agendado", next ? next.titulo : ""],
          ["Vencidos", String(overdue.length), "previstos e não realizados"],
          ["Próximos 7 dias", String(upcoming(all, ref, 7).length), "planejados ou confirmados"],
          ["Próximos 30 dias", String(upcoming(all, ref, 30).length), "planejados ou confirmados"],
        ].map(([l, v, h]) => (
          <div key={l} className="rounded-2xl border border-border bg-surface p-3 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{l}</p>
            <p className={cx("mt-1 font-display text-xl font-semibold", l === "Vencidos" && overdue.length ? "text-danger-600" : "text-brand-950")}>{v}</p>
            {h && <p className="truncate text-xs text-muted">{h}</p>}
          </div>
        ))}
      </section>

      <Card className="no-print mb-4 p-4">
        <form className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filtrar calendário">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="data" value={anchor} />
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Ensaio
            <Select name="ensaio" defaultValue={ensaio} placeholder="Todos" options={load.data.experiments.map((e) => ({ value: e.id, label: e.codigo }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Cultura
            <Select name="cultura" defaultValue={f.cultura} placeholder="Todas" options={[...new Set(load.data.experiments.flatMap((e) => e.culturas))].sort().map((c) => ({ value: c, label: c }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Área
            <Select name="area" defaultValue={f.area} placeholder="Todas" options={[...new Set(load.data.experiments.map((e) => e.area_tematica).filter((a): a is string => !!a))].sort().map((a) => ({ value: a, label: a }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Tipo
            <Select name="tipo" defaultValue={tipo} placeholder="Todos" options={Object.entries(ENTRY_TIPO_LABELS).map(([value, label]) => ({ value, label }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Estado
            <Select name="status" defaultValue={status} placeholder="Todos" options={Object.entries(ENTRY_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
          </label>
          <div className="flex items-end gap-2">
            <button className={buttonClass("primary", "md", "flex-1")}>Filtrar</button>
            <Link href="/app/calendario" className={buttonClass("ghost", "md")}>
              Limpar
            </Link>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          current={vista}
          tabs={[
            { key: "mes", label: "Mês", href: qs({ vista: "mes" }) },
            { key: "semana", label: "Semana", href: qs({ vista: "semana" }) },
            { key: "lista", label: "Agenda (60 dias)", href: qs({ vista: "lista", data: ref }) },
          ]}
        />
        {vista !== "lista" && (
          <div className="mb-3 flex items-center gap-2">
            <Link className={buttonClass("ghost", "sm")} href={qs({ data: prevAnchor })} aria-label="Anterior">
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </Link>
            <h2 className="min-w-44 text-center font-semibold">{vista === "mes" ? fmtMonth(month) : `${fmtDate(range[0])} a ${fmtDate(range[1])}`}</h2>
            <Link className={buttonClass("ghost", "sm")} href={qs({ data: nextAnchor })} aria-label="Próximo">
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link className={buttonClass("ghost", "sm")} href={qs({ data: ref })}>
              Hoje
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_340px]">
        <div>
          {vista === "mes" ? (
            <Card className="overflow-hidden">
              <div className="hidden grid-cols-7 border-b border-border bg-surface-muted text-center text-xs font-semibold text-muted md:grid">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-2">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7">
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`v${i}`} className="hidden min-h-24 border-b border-r border-border bg-surface-muted/40 md:block" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = `${month}-${String(i + 1).padStart(2, "0")}`;
                  const list = byDay.get(day) ?? [];
                  return (
                    <div key={day} className={cx("min-h-24 border-b border-r border-border p-1.5", day === ref && "bg-brand-50", !list.length && "hidden md:block")}>
                      <p className={cx("text-xs tabular", day === ref ? "font-bold text-brand-700" : "text-muted")}>
                        <span className="md:hidden">{WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]} </span>
                        {day.slice(8)}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {list.map((e) => (
                          <li key={e.key}>
                            <Item e={e} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {!inView.length && <p className="p-4 text-center text-sm text-muted">Nenhum compromisso neste mês.</p>}
            </Card>
          ) : (
            <Card>
              <CardBody>
                {listView.length ? (
                  <ul className="divide-y divide-border">
                    {listView.map((e) => {
                      const ex = byId.get(e.experiment_ids[0]);
                      return (
                        <li key={e.key} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
                          <span className="min-w-0">
                            <span className="text-xs text-muted">
                              {fmtDate(e.data)}
                              {e.hora ? ` · ${e.hora}` : ""} · {ENTRY_TIPO_LABELS[e.tipo]}
                              {ex ? ` · ${ex.codigo}` : ""}
                            </span>
                            <Link href={e.origem === "evento" ? qs({ evento: e.id }) : e.href} className="block font-medium hover:underline">
                              {e.titulo}
                            </Link>
                            {e.realizado_em && e.realizado_em !== e.data && <span className="text-xs text-muted">Previsto {fmtDate(e.data)} · realizado {fmtDate(e.realizado_em)}</span>}
                          </span>
                          <span className="flex items-center gap-2">
                            {isOverdueEntry(e, ref) && <span className="text-xs font-bold text-danger-600">vencido</span>}
                            <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold ring-1", STATUS_TONE[e.status])}>{ENTRY_STATUS_LABELS[e.status]}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Nenhum compromisso no período.</p>
                )}
              </CardBody>
            </Card>
          )}
          <p className="mt-2 text-xs text-muted">
            Visitas são agendadas e concluídas em Acompanhamentos (a ficha de visita fica vinculada a elas). Os demais compromissos são gerenciados aqui.
          </p>
        </div>

        <aside className="space-y-4">
          {ev && (
            <Card>
              <CardHeader title={ev.titulo} description={`${ENTRY_TIPO_LABELS[ev.tipo as EntryTipo]} · ${ENTRY_STATUS_LABELS[ev.status as EntryStatus]}`} />
              <CardBody className="space-y-2 text-sm">
                <p>
                  Data prevista: <strong>{fmtDate(ev.data_prevista)}</strong>
                  {!ev.dia_inteiro && ev.inicio && <> · {fmtDateTime(ev.inicio).slice(11)}</>}
                </p>
                <p>Realizado em: {ev.realizado_em ? <strong>{fmtDate(ev.realizado_em)}</strong> : <span className="text-muted">ainda não realizado</span>}</p>
                {ev.experiments && (
                  <p>
                    Ensaio:{" "}
                    <Link className="font-mono text-brand-700 hover:underline" href={`/app/experimentos/${ev.experiment_id}?aba=acompanhamento`}>
                      {(ev.experiments as unknown as { codigo: string }).codigo}
                    </Link>
                  </p>
                )}
                <p>Responsável: {(ev.profiles as unknown as { nome: string } | null)?.nome ?? ev.responsavel_descricao ?? <span className="text-muted">Não informado</span>}</p>
                {ev.local_geral && <p>Local: {ev.local_geral}</p>}
                {ev.observacoes && <p className="whitespace-pre-line text-muted">{ev.observacoes}</p>}
                {ev.motivo_status && <p className="text-xs">Motivo registrado: {ev.motivo_status}</p>}
                {hist.length > 0 && (
                  <details className="text-xs">
                    <summary className="flex cursor-pointer items-center gap-1 font-semibold">
                      <History aria-hidden className="h-3.5 w-3.5" /> Histórico ({hist.length})
                    </summary>
                    <ol className="mt-1 space-y-1">
                      {hist.map((h, i) => (
                        <li key={i} className="text-muted">
                          {fmtDateTime(h.em)}: {ENTRY_STATUS_LABELS[h.status_de as EntryStatus] ?? h.status_de} → {ENTRY_STATUS_LABELS[h.status_para as EntryStatus] ?? h.status_para}
                          {h.data_de !== h.data_para && ` · ${fmtDate(h.data_de)} → ${fmtDate(h.data_para)}`}
                          {h.motivo && ` · ${h.motivo}`}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {canEdit && ev.status !== "realizado" && ev.status !== "cancelado" && (
                  <div className="space-y-3 border-t border-border pt-3">
                    {ev.status === "planejado" && (
                      <ActionForm action={updateCalendarEvent}>
                        <input type="hidden" name="id" value={ev.id} />
                        <input type="hidden" name="acao" value="confirmar" />
                        <SubmitButton variant="secondary" size="sm">
                          Confirmar
                        </SubmitButton>
                      </ActionForm>
                    )}
                    <ActionForm action={updateCalendarEvent} className="space-y-2">
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="acao" value="reagendar" />
                      <Field label="Reagendar para" name="nova_data">
                        <Input type="date" name="nova_data" required />
                      </Field>
                      <Field label="Motivo" name="motivo">
                        <Input name="motivo" maxLength={500} />
                      </Field>
                      <SubmitButton variant="secondary" size="sm">
                        Reagendar
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={updateCalendarEvent} className="space-y-2">
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="acao" value="concluir" />
                      <Field label="Realizado em" name="realizado_em" hint="Não pode ser data futura.">
                        <Input type="date" name="realizado_em" max={today} defaultValue={today} />
                      </Field>
                      <SubmitButton size="sm">Registrar como realizado</SubmitButton>
                    </ActionForm>
                    <ActionForm action={updateCalendarEvent} className="space-y-2" confirm="Cancelar este compromisso? O histórico será mantido.">
                      <input type="hidden" name="id" value={ev.id} />
                      <input type="hidden" name="acao" value="cancelar" />
                      <Field label="Motivo do cancelamento" name="motivo" required>
                        <Input name="motivo" maxLength={500} required />
                      </Field>
                      <SubmitButton variant="ghost" size="sm">
                        Cancelar compromisso
                      </SubmitButton>
                    </ActionForm>
                  </div>
                )}
                <Link href={qs({ evento: "" })} className="block text-xs text-brand-700 hover:underline">
                  Fechar detalhes
                </Link>
              </CardBody>
            </Card>
          )}

          {canEdit && (
            <Card id="novo-compromisso">
              <CardHeader title="Novo compromisso" description="Para visitas, use “Agendar visita”." />
              <CardBody>
                <ActionForm action={createCalendarEvent} className="space-y-3" resetOnSuccess>
                  <Field label="Tipo" name="tipo" required>
                    <Select
                      name="tipo"
                      required
                      options={(Object.keys(ENTRY_TIPO_LABELS) as EntryTipo[]).filter((k) => k !== "visita").map((k) => ({ value: k, label: ENTRY_TIPO_LABELS[k] }))}
                      placeholder="Escolha"
                    />
                  </Field>
                  <Field label="Título" name="titulo" required>
                    <Input name="titulo" required minLength={3} maxLength={200} />
                  </Field>
                  <Field label="Ensaio vinculado" name="experiment_id">
                    <Select name="experiment_id" placeholder="Nenhum (compromisso geral)" options={load.data.experiments.map((e) => ({ value: e.id, label: `${e.codigo} · ${e.titulo}` }))} />
                  </Field>
                  <Field label="Data prevista" name="data_prevista" required>
                    <Input type="date" name="data_prevista" required defaultValue={anchor} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Início (opcional)" name="hora_inicio">
                      <Input type="time" name="hora_inicio" />
                    </Field>
                    <Field label="Término" name="hora_fim">
                      <Input type="time" name="hora_fim" />
                    </Field>
                  </div>
                  <Field label="Estado inicial" name="status">
                    <Select
                      name="status"
                      options={[
                        { value: "planejado", label: "Planejado" },
                        { value: "confirmado", label: "Confirmado" },
                      ]}
                    />
                  </Field>
                  <Field label="Responsável" name="responsavel_id" hint="Recebe uma notificação interna.">
                    <Select name="responsavel_id" placeholder="Não definido" options={members.map((m) => ({ value: m.id, label: m.nome }))} />
                  </Field>
                  <Field label="Local (geral)" name="local_geral">
                    <Input name="local_geral" maxLength={200} placeholder="Ex.: setor, laboratório, sala" />
                  </Field>
                  <Field label="Observações" name="observacoes">
                    <Textarea name="observacoes" maxLength={2000} />
                  </Field>
                  <SubmitButton>Criar compromisso</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
