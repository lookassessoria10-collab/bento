import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { requireContext } from "@/lib/auth";
import { fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import { CHANNEL_LABELS, FILE_KIND_LABELS, USE_AUTH_LABELS } from "@/lib/labels";
import { experimentOptions, listExperimentOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, DemoBadge, Field, Input, KeyValue, PageHeader, buttonClass } from "@/components/ui";
import { FileMetaFields } from "../meta-fields";
import { Uploader } from "../uploader";
import { softDeleteFile, updateFileMeta } from "../actions";

export const metadata: Metadata = { title: "Arquivo" };

export default async function FilePage({ params }: PageProps<"/app/biblioteca/[id]">) {
  const { id } = await params;
  const ctx = await requireContext();
  const { data: f } = await ctx.supabase
    .from("files")
    .select("*, experiments(id, codigo)")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!f) notFound();
  const exps = await listExperimentOptions(ctx, { includeArchived: true });
  // histórico de versões (cadeia de previous_version_id)
  const versions: { id: string; versao: number; created_at: string; motivo_substituicao: string | null }[] = [];
  let prev = f.previous_version_id;
  for (let i = 0; prev && i < 20; i++) {
    const { data: p } = await ctx.supabase.from("files").select("id, versao, created_at, motivo_substituicao, previous_version_id").eq("id", prev).maybeSingle();
    if (!p) break;
    versions.push(p);
    prev = p.previous_version_id;
  }
  const isImage = f.mime_type?.startsWith("image/");
  const e = f.experiments as unknown as { id: string; codigo: string } | null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/biblioteca", label: "Biblioteca" }, { label: f.nome_amigavel }]}
        title={f.nome_amigavel}
        description={`${FILE_KIND_LABELS[f.tipo]} · versão ${f.versao}${f.substituido_por ? " · substituído por versão mais recente" : ""}`}
        actions={
          f.external_url ? (
            <a className={buttonClass("secondary")} href={f.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden className="h-4 w-4" /> Abrir link externo
            </a>
          ) : (
            <a className={buttonClass("secondary")} href={`/app/biblioteca/${id}/download`}>
              <Download aria-hidden className="h-4 w-4" /> Baixar (link temporário)
            </a>
          )
        }
      />
      {f.is_demo && <DemoBadge />}
      {f.substituido_por && (
        <div className="mb-4">
          <Alert tone="info">
            Esta é uma versão anterior, preservada no histórico.{" "}
            <Link className="underline" href={`/app/biblioteca/${f.substituido_por}`}>
              Ver versão atual
            </Link>
          </Alert>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {isImage && !f.external_url && (
            <Card>
              <CardBody>
                {/* pré-visualização segura: imagem servida por URL assinada de curta duração */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/app/biblioteca/${id}/download?inline=1`} alt={f.legenda ?? f.nome_amigavel} className="max-h-[480px] w-auto rounded-lg" />
                {f.legenda && <p className="mt-2 text-sm text-muted">{f.legenda} — {f.autoria}</p>}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Metadados" />
            <CardBody>
              <ActionForm action={updateFileMeta} className="space-y-4">
                <input type="hidden" name="id" value={id} />
                <FileMetaFields file={f} experiments={experimentOptions(exps)} />
                <SubmitButton>Salvar metadados</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Registro" />
            <CardBody>
              <KeyValue
                items={[
                  { label: "Nome original", value: f.nome_original ?? (f.external_url ? "Link externo" : null) },
                  { label: "Formato", value: f.mime_type },
                  { label: "Tamanho", value: fmtBytes(f.tamanho_bytes) },
                  { label: "Data do arquivo", value: fmtDate(f.data_arquivo) },
                  { label: "Registrado em", value: fmtDateTime(f.created_at) },
                  { label: "Experimento", value: e ? <Link className="text-brand-700 underline" href={`/app/experimentos/${e.id}`}>{e.codigo}</Link> : null },
                  { label: "Autorização", value: USE_AUTH_LABELS[f.autorizacao_uso] },
                  { label: "Canais", value: f.autorizacao_canais.map((c) => CHANNEL_LABELS[c]).join(", ") },
                ]}
              />
            </CardBody>
          </Card>
          {!f.external_url && !f.substituido_por && (
            <Card>
              <CardHeader title="Enviar nova versão" description="O original nunca é sobrescrito." />
              <CardBody>
                <Uploader maxMb={ctx.settings?.limite_upload_mb ?? 25} previousVersionId={id}>
                  <input type="file" name="arquivos" required aria-label="Novo arquivo" className="block w-full text-sm" />
                  <Field label="Motivo da substituição" name="motivo_substituicao" required>
                    <Input name="motivo_substituicao" required />
                  </Field>
                  {/* mantém os metadados atuais na nova versão */}
                  {(["nome_amigavel", "tipo", "autoria", "origem", "data_arquivo", "legenda", "licenca", "autorizacao_uso", "experiment_id"] as const).map((k) =>
                    f[k] ? <input key={k} type="hidden" name={k} value={String(f[k])} /> : null,
                  )}
                  {f.autorizacao_canais.map((c) => (
                    <input key={c} type="hidden" name="autorizacao_canais" value={c} />
                  ))}
                </Uploader>
              </CardBody>
            </Card>
          )}
          {versions.length > 0 && (
            <Card>
              <CardHeader title="Versões anteriores" />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {versions.map((v) => (
                    <li key={v.id}>
                      <Link className="text-brand-700 underline" href={`/app/biblioteca/${v.id}`}>
                        Versão {v.versao}
                      </Link>{" "}
                      · {fmtDateTime(v.created_at)}
                    </li>
                  ))}
                </ul>
                {f.motivo_substituicao && <p className="mt-2 text-xs text-muted">Motivo desta versão: {f.motivo_substituicao}</p>}
              </CardBody>
            </Card>
          )}
          <ActionForm action={softDeleteFile} confirm="Remover este arquivo da biblioteca? O original permanece preservado no armazenamento.">
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="ghost" size="sm">
              Remover da biblioteca
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
