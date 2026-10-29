import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { addDays, fmtDate, localDate } from "@/lib/format";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { experimentOptions, listExperimentOptions, listMembers, memberOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, CardBody, CardHeader, DemoBadge, EmptyState, PageHeader, StatusBadge, Table, Tabs, Td, Th, cx } from "@/components/ui";
import { Kanban, type KanbanTask } from "./kanban";
import { TaskForm } from "./task-form";
import { createTask, generateRoutines } from "./actions";

export const metadata: Metadata = { title: "Atividades e pendências" };

const FILTERS = [
  ["todas", "Todas abertas"],
  ["minhas", "Minhas atividades"],
  ["vencidas", "Vencidas"],
  ["semana", "Esta semana"],
  ["revisao", "Aguardando revisão"],
  ["concluidas", "Concluídas"],
] as const;

export default async function TasksPage({ searchParams }: PageProps<"/app/atividades">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const view = ["lista", "quadro", "calendario"].includes(s("vista")) ? s("vista") : "quadro";
  const filtro = FILTERS.some(([k]) => k === s("filtro")) ? s("filtro") : "todas";
  const today = localDate();
  const weekEnd = addDays(today, 7);

  let q = ctx.supabase
    .from("tasks")
    .select("id, titulo, status, prazo, prioridade, ordem, categoria, responsavel_id, colaborador_id, is_demo, origem, profiles:responsavel_id(nome), experiments(codigo)")
    .eq("organization_id", ctx.orgId)
    .order("ordem")
    .limit(300);
  if (filtro === "concluidas") q = q.in("status", ["concluida", "cancelada"]);
  else if (view !== "quadro") q = q.not("status", "in", "(concluida,cancelada)");
  else q = q.neq("status", "cancelada");
  if (filtro === "minhas") q = q.or(`responsavel_id.eq.${ctx.userId},colaborador_id.eq.${ctx.userId}`);
  if (filtro === "vencidas") q = q.lt("prazo", today).not("status", "in", "(concluida,cancelada)");
  if (filtro === "semana") q = q.gte("prazo", today).lte("prazo", weekEnd);
  if (filtro === "revisao") q = q.eq("categoria", "revisao");

  const [{ data: tasks }, members, exps, { data: editorial }] = await Promise.all([
    q,
    listMembers(ctx),
    listExperimentOptions(ctx),
    ctx.supabase.from("editorial_items").select("id, titulo").eq("organization_id", ctx.orgId).is("archived_at", null).limit(200),
  ]);

  const canAll = has(ctx, "atividades.ver_todas");
  const kanban: KanbanTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    status: t.status,
    prazo: t.prazo,
    prioridade: t.prioridade,
    responsavel: (t.profiles as unknown as { nome: string } | null)?.nome ?? null,
    codigo: (t.experiments as unknown as { codigo: string } | null)?.codigo ?? null,
    ordem: t.ordem,
    vencida: !!t.prazo && t.prazo < today && !["concluida", "cancelada"].includes(t.status),
    podeMover: canAll || t.responsavel_id === ctx.userId || t.colaborador_id === ctx.userId,
  }));

  const qs = (patch: Record<string, string>) => `/app/atividades?${new URLSearchParams({ vista: view, filtro, ...patch })}`;
  const showNew = s("nova") === "1";

  // calendário simples: próximas 5 semanas por prazo
  const days = Array.from({ length: 35 }, (_, i) => addDays(today, i - new Date(`${today}T12:00:00Z`).getUTCDay()));

  return (
    <>
      <PageHeader
        title="Atividades e pendências"
        description="Gestão simples do trabalho da equipe. Movimentações no quadro são salvas no servidor."
        actions={
          <>
            {canAll && (
              <ActionForm action={generateRoutines}>
                <SubmitButton variant="secondary">
                  <RefreshCw aria-hidden className="h-4 w-4" /> Gerar rotinas do mês
                </SubmitButton>
              </ActionForm>
            )}
            <Link className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800" href={qs({ nova: "1" })}>
              Nova atividade
            </Link>
          </>
        }
      />

      {showNew && (
        <Card className="mb-5">
          <CardHeader title="Nova atividade" />
          <CardBody>
            <TaskForm
              action={createTask}
              members={memberOptions(members)}
              experiments={experimentOptions(exps)}
              editorial={(editorial ?? []).map((e) => ({ value: e.id, label: e.titulo }))}
              defaults={{ experiment_id: s("experimento"), responsavel_id: ctx.userId }}
            />
          </CardBody>
        </Card>
      )}

      <Tabs
        current={view}
        tabs={[
          { key: "quadro", label: "Quadro", href: qs({ vista: "quadro" }) },
          { key: "lista", label: "Lista", href: qs({ vista: "lista" }) },
          { key: "calendario", label: "Calendário", href: qs({ vista: "calendario" }) },
        ]}
      />
      <nav aria-label="Filtros rápidos" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => (
          <Link
            key={k}
            href={qs({ filtro: k })}
            aria-current={filtro === k ? "true" : undefined}
            className={cx("rounded-full border px-3 py-1 text-sm", filtro === k ? "border-brand-700 bg-brand-700 text-white" : "border-border bg-surface hover:border-brand-500")}
          >
            {l}
          </Link>
        ))}
      </nav>

      {!tasks?.length ? (
        <EmptyState title="Nenhuma atividade encontrada.">Crie atividades manualmente, a partir das pendências das visitas ou gere as rotinas do mês.</EmptyState>
      ) : view === "quadro" ? (
        <Kanban tasks={kanban} />
      ) : view === "lista" ? (
        <Card>
          <Table caption="Atividades">
            <thead>
              <tr>
                <Th>Atividade</Th>
                <Th>Responsável</Th>
                <Th>Prazo</Th>
                <Th>Prioridade</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {kanban.map((t) => (
                <tr key={t.id}>
                  <Td>
                    <Link href={`/app/atividades/${t.id}`} className="font-medium hover:underline">
                      {t.titulo}
                    </Link>
                    {t.codigo && <span className="ml-2 font-mono text-xs text-muted">{t.codigo}</span>}
                    {tasks.find((x) => x.id === t.id)?.is_demo && <span className="ml-2"><DemoBadge /></span>}
                  </Td>
                  <Td>{t.responsavel ?? "—"}</Td>
                  <Td className={cx("tabular", t.vencida && "font-semibold text-danger-600")}>
                    {fmtDate(t.prazo)}
                    {t.vencida && " (vencida)"}
                  </Td>
                  <Td>{PRIORITY_LABELS[t.prioridade as keyof typeof PRIORITY_LABELS]}</Td>
                  <Td>
                    <StatusBadge status={t.status} label={TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7">
            {days.map((d) => {
              const list = kanban.filter((t) => t.prazo === d);
              return (
                <div key={d} className={cx("min-h-20 border-b border-r border-border p-1.5", d === today && "bg-brand-50", !list.length && "hidden md:block")}>
                  <p className="text-xs text-muted tabular">{fmtDate(d).slice(0, 5)}</p>
                  {list.map((t) => (
                    <Link key={t.id} href={`/app/atividades/${t.id}`} className="mt-1 block truncate rounded border border-border bg-surface px-1 text-xs hover:border-brand-500">
                      {t.titulo}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="p-3 text-xs text-muted">Atividades por prazo nas próximas semanas. Itens sem prazo aparecem na lista e no quadro.</p>
        </Card>
      )}
    </>
  );
}
