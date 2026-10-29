import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ImportWizard } from "./wizard";
import { undoImport } from "./actions";

export const metadata: Metadata = { title: "Importar experimentos" };

export default async function ImportPage() {
  const ctx = await requirePermission("experimentos.importar");
  const { data: batches } = await ctx.supabase
    .from("import_batches")
    .select("id, arquivo_nome, total_linhas, importadas, invalidas, duplicadas, created_at, desfeito_em, relatorio")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: counts } = await ctx.supabase.from("experiments").select("import_batch_id").eq("organization_id", ctx.orgId).not("import_batch_id", "is", null);
  const imported = new Map<string, number>();
  for (const c of counts ?? []) imported.set(c.import_batch_id!, (imported.get(c.import_batch_id!) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Importar experimentos"
        breadcrumbs={[{ href: "/app/experimentos", label: "Experimentos" }, { label: "Importar" }]}
        description="Enviar → mapear colunas → prévia → validar → identificar duplicatas → confirmar. Duplicatas são identificadas apenas por código institucional; nunca por título semelhante."
      />
      <Alert tone="warning">Importe somente cadastros com autorização de uso. Registros importados entram como &ldquo;pendente de conferência&rdquo;.</Alert>
      <Card className="mt-5">
        <CardBody>
          <ImportWizard />
        </CardBody>
      </Card>
      <Card className="mt-5">
        <CardHeader title="Lotes importados" description="Origem, data, usuário e resultado de cada lote." />
        <CardBody className="space-y-3">
          {!batches?.length && <p className="text-sm text-muted">Nenhum lote.</p>}
          {batches?.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{b.arquivo_nome}</p>
                <p className="text-xs text-muted">
                  {fmtDateTime(b.created_at)} · {b.total_linhas} linha(s) · {imported.get(b.id) ?? 0} importada(s) · {b.invalidas} inválida(s) · {b.duplicadas} duplicada(s)
                  {b.desfeito_em && ` · desfeito em ${fmtDateTime(b.desfeito_em)}`}
                </p>
              </div>
              {!b.desfeito_em && (
                <ActionForm action={undoImport} confirm="Desfazer este lote? Os experimentos sem vínculos serão arquivados.">
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton size="sm" variant="ghost">
                    Desfazer lote
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
