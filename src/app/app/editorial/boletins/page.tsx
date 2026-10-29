import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { STATUS_LABELS, type WorkflowStatus } from "@/lib/workflow";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, DemoBadge, EmptyState, Field, Input, PageHeader, StatusBadge } from "@/components/ui";
import { createEditorialItem } from "../actions";

export const metadata: Metadata = { title: "Boletins" };

export default async function BulletinsPage() {
  const ctx = await requireContext();
  const { data } = await ctx.supabase
    .from("bulletin_editions")
    .select("id, numero, periodo_inicio, periodo_fim, data_prevista, is_demo, editorial_items(id, titulo, status)")
    .eq("organization_id", ctx.orgId)
    .order("numero");
  const meta = ctx.settings?.meta_boletins ?? 2;
  const published = (data ?? []).filter((b) => (b.editorial_items as unknown as { status: string })?.status === "publicado").length;
  return (
    <>
      <PageHeader
        title="Boletins Entomo Agro 360"
        breadcrumbs={[{ href: "/app/editorial", label: "Editorial" }, { label: "Boletins" }]}
        description={`Meta do piloto: ${meta} edições trimestrais (3º e 6º meses), condicionadas à validação de conteúdo. Publicados: ${published}.`}
      />
      <Alert tone="info">As edições são montadas pela equipe a partir de conteúdos validados. Nada é gerado automaticamente.</Alert>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {!data?.length ? (
            <EmptyState title="Nenhuma edição criada." />
          ) : (
            data.map((b) => {
              const i = b.editorial_items as unknown as { id: string; titulo: string; status: WorkflowStatus };
              return (
                <Card key={b.id}>
                  <CardBody className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link href={`/app/editorial/boletins/${b.id}`} className="font-semibold hover:underline">
                        Nº {b.numero} — {i.titulo}
                      </Link>
                      <p className="text-xs text-muted">
                        Período {fmtDate(b.periodo_inicio)} a {fmtDate(b.periodo_fim)} · previsão {fmtDate(b.data_prevista)}
                      </p>
                    </div>
                    <span className="flex items-center gap-2">
                      {b.is_demo && <DemoBadge />}
                      <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                    </span>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
        {has(ctx, "editorial.criar") && (
          <Card>
            <CardHeader title="Nova edição" description="Cria a edição com as sete seções previstas no pré-projeto." />
            <CardBody>
              <ActionForm action={createEditorialItem} className="space-y-3">
                <input type="hidden" name="tipo" value="boletim" />
                <input type="hidden" name="canais" value="boletim" />
                <input type="hidden" name="requer_validacao_cientifica" value="on" />
                <Field label="Título da edição" name="titulo" required>
                  <Input name="titulo" required placeholder="Ex.: Boletim Entomo Agro 360 — 1º trimestre" />
                </Field>
                <SubmitButton>Criar edição</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
