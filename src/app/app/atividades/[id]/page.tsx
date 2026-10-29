import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { experimentOptions, listExperimentOptions, listMembers, memberOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, CardBody, CardHeader, DemoBadge, Field, Input, PageHeader, StatusBadge, Textarea } from "@/components/ui";
import { TaskForm } from "../task-form";
import { addChecklistItem, addTaskComment, toggleChecklistItem, updateTask } from "../actions";

export const metadata: Metadata = { title: "Atividade" };

export default async function TaskPage({ params }: PageProps<"/app/atividades/[id]">) {
  const { id } = await params;
  const ctx = await requireContext();
  const { data: t } = await ctx.supabase
    .from("tasks")
    .select("*, task_comments(id, texto, created_at, profiles:autor_id(nome)), task_checklist_items(id, texto, feito, ordem), visit_records(visit_id)")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!t) notFound();
  const [members, exps, { data: editorial }] = await Promise.all([
    listMembers(ctx),
    listExperimentOptions(ctx, { includeArchived: true }),
    ctx.supabase.from("editorial_items").select("id, titulo").eq("organization_id", ctx.orgId).limit(200),
  ]);
  const comments = (t.task_comments as unknown as { id: string; texto: string; created_at: string; profiles: { nome: string } | null }[]).sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const checklist = (t.task_checklist_items as unknown as { id: string; texto: string; feito: boolean; ordem: number }[]).sort((a, b) => a.ordem - b.ordem);
  const vr = t.visit_records as unknown as { visit_id: string } | null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/atividades", label: "Atividades" }, { label: t.titulo }]}
        title={t.titulo}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={t.status} label={TASK_STATUS_LABELS[t.status]} />
            {t.is_demo && <DemoBadge />}
            {vr && (
              <Link className="text-brand-700 underline" href={`/app/visitas/${vr.visit_id}`}>
                Originada de pendência de visita
              </Link>
            )}
            <span className="text-xs">Criada em {fmtDateTime(t.created_at)} · Atualizada em {fmtDateTime(t.updated_at)}</span>
          </span>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Detalhes" />
          <CardBody>
            <TaskForm
              action={updateTask}
              task={t as unknown as Record<string, string | null> & { id: string }}
              members={memberOptions(members)}
              experiments={experimentOptions(exps)}
              editorial={(editorial ?? []).map((e) => ({ value: e.id, label: e.titulo }))}
            />
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Checklist" />
            <CardBody className="space-y-2">
              {checklist.map((c) => (
                <ActionForm key={c.id} action={toggleChecklistItem} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="feito" value={c.feito ? "false" : "true"} />
                  <button className="flex items-center gap-2 text-left text-sm" aria-pressed={c.feito}>
                    <span aria-hidden className={`inline-flex h-4 w-4 items-center justify-center rounded border ${c.feito ? "border-brand-700 bg-brand-700 text-white" : "border-border-strong"}`}>
                      {c.feito ? "✓" : ""}
                    </span>
                    <span className={c.feito ? "text-muted line-through" : ""}>{c.texto}</span>
                  </button>
                </ActionForm>
              ))}
              <ActionForm action={addChecklistItem} resetOnSuccess className="flex gap-2 pt-2">
                <input type="hidden" name="task_id" value={id} />
                <Input name="texto" placeholder="Novo item" aria-label="Novo item do checklist" required />
                <SubmitButton size="sm" variant="secondary">
                  Adicionar
                </SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Comentários e histórico" />
            <CardBody className="space-y-3">
              {comments.length === 0 && <p className="text-sm text-muted">Nenhum comentário.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-surface-muted p-2 text-sm">
                  <p className="whitespace-pre-line">{c.texto}</p>
                  <p className="mt-1 text-xs text-muted">
                    {c.profiles?.nome ?? "—"} · {fmtDateTime(c.created_at)}
                  </p>
                </div>
              ))}
              <ActionForm action={addTaskComment} resetOnSuccess className="space-y-2">
                <input type="hidden" name="task_id" value={id} />
                <Field label="Novo comentário" name="texto">
                  <Textarea name="texto" rows={2} required />
                </Field>
                <SubmitButton size="sm">Comentar</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
