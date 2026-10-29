import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { requireContext } from "@/lib/auth";
import { fmtBytes, fmtDate, localDate } from "@/lib/format";
import { FILE_KIND_LABELS, USE_AUTH_LABELS } from "@/lib/labels";
import { experimentOptions, listExperimentOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, CardBody, CardHeader, DemoBadge, EmptyState, Field, Input, LinkButton, PageHeader, Select, Table, Td, Th, buttonClass, optionsFrom } from "@/components/ui";
import { Uploader } from "./uploader";
import { FileMetaFields } from "./meta-fields";
import { registerExternalLink } from "./actions";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function LibraryPage({ searchParams }: PageProps<"/app/biblioteca">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const tipo = s("tipo");
  const exp = /^[0-9a-f-]{36}$/.test(s("experimento")) ? s("experimento") : "";
  const busca = s("q").slice(0, 100).replace(/[%,()]/g, " ");

  let q = ctx.supabase
    .from("files")
    .select("id, nome_amigavel, nome_original, tipo, autoria, data_arquivo, autorizacao_uso, versao, tamanho_bytes, external_url, mime_type, is_demo, created_at, experiments(codigo)")
    .eq("organization_id", ctx.orgId)
    .is("deleted_at", null)
    .is("substituido_por", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (tipo && tipo in FILE_KIND_LABELS) q = q.eq("tipo", tipo as keyof typeof FILE_KIND_LABELS);
  if (exp) q = q.eq("experiment_id", exp);
  if (busca.trim()) q = q.or(`nome_amigavel.ilike.%${busca.trim()}%,legenda.ilike.%${busca.trim()}%,autoria.ilike.%${busca.trim()}%`);
  const [{ data: files }, exps] = await Promise.all([q, listExperimentOptions(ctx)]);
  const expCode = exps.find((e) => e.id === exp)?.codigo ?? null;
  const showUpload = s("enviar") === "1";

  return (
    <>
      <PageHeader
        title="Biblioteca"
        description="Fotos, documentos, referências e autorizações. Armazenamento privado; links temporários gerados somente após checagem de permissão."
        actions={<LinkButton variant="primary" href={`/app/biblioteca?enviar=1${exp ? `&experimento=${exp}` : ""}`}>Enviar arquivos</LinkButton>}
      />

      {showUpload && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Enviar arquivos" description={`Limite de ${ctx.settings?.limite_upload_mb ?? 25} MB por arquivo. Formatos: imagens (JPG, PNG, WebP), PDF, planilhas, documentos e CSV.`} />
            <CardBody>
              <Uploader maxMb={ctx.settings?.limite_upload_mb ?? 25}>
                <Field label="Arquivos" name="arquivos" required>
                  <input
                    name="arquivos"
                    type="file"
                    multiple
                    required
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.csv,.txt,.xlsx,.xls,.docx,.doc,.pptx"
                    className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-brand-800"
                  />
                </Field>
                <FileMetaFields experiments={experimentOptions(exps)} defaults={{ experiment_id: exp }} suggested={`${expCode ?? "EA360"}-${localDate()}-arquivo01`} />
              </Uploader>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Registrar link externo" description="Arquivo institucional que permanece na origem." />
            <CardBody>
              <ActionForm action={registerExternalLink} resetOnSuccess className="space-y-3">
                <Field label="Link" name="external_url" required>
                  <Input name="external_url" type="url" required placeholder="https://" />
                </Field>
                <Field label="Nome" name="nome_amigavel" required>
                  <Input name="nome_amigavel" id="link-nome" required />
                </Field>
                <Field label="Tipo" name="tipo">
                  <Select name="tipo" id="link-tipo" defaultValue="referencia_externa" options={optionsFrom(FILE_KIND_LABELS)} />
                </Field>
                <Field label="Experimento" name="experiment_id">
                  <Select name="experiment_id" id="link-exp" defaultValue={exp} options={experimentOptions(exps)} placeholder="Sem vínculo" />
                </Field>
                <input type="hidden" name="autorizacao_uso" value="uso_interno" />
                <SubmitButton size="sm">Registrar link</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      )}

      <form className="mb-4 flex flex-wrap items-end gap-2" aria-label="Filtrar arquivos">
        <div>
          <label htmlFor="q" className="text-xs text-muted">
            Buscar
          </label>
          <Input name="q" defaultValue={busca} placeholder="Nome, legenda, autoria" />
        </div>
        <div>
          <label htmlFor="tipo" className="text-xs text-muted">
            Tipo
          </label>
          <Select name="tipo" defaultValue={tipo} options={optionsFrom(FILE_KIND_LABELS)} placeholder="Todos" />
        </div>
        <div>
          <label htmlFor="experimento" className="text-xs text-muted">
            Experimento
          </label>
          <Select name="experimento" defaultValue={exp} options={experimentOptions(exps)} placeholder="Todos" />
        </div>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {!files?.length ? (
        <EmptyState title="Nenhum arquivo encontrado.">Envie fotos e documentos com legenda, autoria e autorização de uso.</EmptyState>
      ) : (
        <Card>
          <Table caption="Arquivos">
            <thead>
              <tr>
                <Th>Arquivo</Th>
                <Th>Tipo</Th>
                <Th>Experimento</Th>
                <Th>Autoria / data</Th>
                <Th>Autorização</Th>
                <Th>Tamanho</Th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <Td>
                    <Link className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline" href={`/app/biblioteca/${f.id}`}>
                      {f.external_url ? <ExternalLink aria-hidden className="h-4 w-4" /> : f.mime_type?.startsWith("image/") ? <ImageIcon aria-hidden className="h-4 w-4" /> : <FileText aria-hidden className="h-4 w-4" />}
                      {f.nome_amigavel}
                    </Link>
                    <span className="ml-1 text-xs text-muted">v{f.versao}</span>
                    {f.is_demo && <span className="ml-1"><DemoBadge /></span>}
                  </Td>
                  <Td>{FILE_KIND_LABELS[f.tipo]}</Td>
                  <Td className="font-mono text-xs">{(f.experiments as unknown as { codigo: string } | null)?.codigo ?? "—"}</Td>
                  <Td className="text-xs">
                    {f.autoria ?? "Não informado"}
                    <br />
                    {fmtDate(f.data_arquivo)}
                  </Td>
                  <Td className="text-xs">{USE_AUTH_LABELS[f.autorizacao_uso]}</Td>
                  <Td className="text-xs tabular">{f.external_url ? "Link" : fmtBytes(f.tamanho_bytes)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
