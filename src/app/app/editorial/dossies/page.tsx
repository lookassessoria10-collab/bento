import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { STATUS_LABELS, type WorkflowStatus } from "@/lib/workflow";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, StatusBadge } from "@/components/ui";
import { createEditorialItem } from "../actions";

export const metadata: Metadata = { title: "Dossiês" };

export default async function DossiersPage() {
  const ctx = await requireContext();
  const { data } = await ctx.supabase
    .from("dossiers")
    .select("id, periodo_inicio, periodo_fim, finalidade, editorial_items(titulo, status)")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });
  return (
    <>
      <PageHeader
        title="Dossiê técnico-científico"
        breadcrumbs={[{ href: "/app/editorial", label: "Editorial" }, { label: "Dossiês" }]}
        description="Montagem com seleção e conferência humana: período → seleção → dados → lacunas → aprovação → pré-visualização → PDF."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {!data?.length ? (
            <EmptyState title="Nenhum dossiê iniciado." />
          ) : (
            data.map((d) => {
              const i = d.editorial_items as unknown as { titulo: string; status: WorkflowStatus };
              return (
                <Card key={d.id}>
                  <CardBody className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link className="font-semibold hover:underline" href={`/app/editorial/dossies/${d.id}`}>
                        {i.titulo}
                      </Link>
                      <p className="text-xs text-muted">
                        {d.finalidade === "divulgacao" ? "Versão de divulgação" : "Dossiê interno"} · {fmtDate(d.periodo_inicio)} a {fmtDate(d.periodo_fim)}
                      </p>
                    </div>
                    <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
        {has(ctx, "editorial.criar") && (
          <Card>
            <CardHeader title="Novo dossiê" />
            <CardBody>
              <ActionForm action={createEditorialItem} className="space-y-3">
                <input type="hidden" name="tipo" value="dossie" />
                <input type="hidden" name="canais" value="dossie" />
                <input type="hidden" name="requer_validacao_cientifica" value="on" />
                <Field label="Título" name="titulo" required>
                  <Input name="titulo" required placeholder="Dossiê técnico-científico — piloto 2026/2027" />
                </Field>
                <SubmitButton>Iniciar assistente</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
