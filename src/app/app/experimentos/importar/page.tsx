import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/client";
import { FileSpreadsheet } from "lucide-react";
import { IMPORT_FIELDS } from "@/lib/import";
import { Alert, Card, CardBody, CardHeader, PageHeader, buttonClass } from "@/components/ui";
import { ImportWizard } from "./wizard";
import { undoImport } from "./actions";

export const metadata: Metadata = { title: "Importar experimentos" };
// download de arquivo (route handler): <a> simples, sem navegação do cliente
const MODELO_HREF = "/app/experimentos/importar/modelo";

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
        <CardHeader
          title="Modelo de planilha"
          description="Baixe o modelo, preencha uma linha por experimento e salve como CSV ou XLSX. Deixe em branco o que não foi informado — nada é estimado."
          actions={
            <a className={buttonClass("primary", "sm")} href={MODELO_HREF}>
              <FileSpreadsheet aria-hidden className="h-4 w-4" /> Baixar modelo (.csv)
            </a>
          }
        />
        <details className="px-5 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-800">Ver colunas aceitas e formatos</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  <th className="py-2 pr-4">Coluna</th>
                  <th className="py-2">Como preencher</th>
                </tr>
              </thead>
              <tbody>
                {IMPORT_FIELDS.map((f) => (
                  <tr key={f.key} className="border-t border-border/70">
                    <td className="whitespace-nowrap py-2 pr-4 font-medium">
                      {f.label}
                      {f.required && <span className="text-danger-600"> *</span>}
                    </td>
                    <td className="py-2 text-muted">{f.hint || "Texto livre."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Colunas extras (ex.: Autores) não são descartadas: ficam registradas nas observações do experimento.</p>
          </div>
        </details>
      </Card>
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
