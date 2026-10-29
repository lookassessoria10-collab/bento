import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { EDITORIAL_KIND_LABELS, FILE_KIND_LABELS } from "@/lib/labels";
import { STATUS_LABELS, isEditable } from "@/lib/workflow";
import type { DraftBlock, InstagramDraft } from "@/lib/snapshot";
import { experimentOptions, listExperimentOptions, listMembers, listPeople, memberOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, DemoBadge, Field, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { DraftEditor } from "../draft-editor";
import { EditorialItemFields } from "../item-fields";
import { WorkflowPanel } from "../workflow-panel";
import { addInstagramMetrics, addSource, removeSource, updateEditorialItem } from "../actions";

export const metadata: Metadata = { title: "Conteúdo editorial" };

export default async function EditorialItemPage({ params }: PageProps<"/app/editorial/[id]">) {
  const { id } = await params;
  const ctx = await requireContext();
  const { data: item } = await ctx.supabase.from("editorial_items").select("*").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!item) notFound();
  if (item.tipo === "boletim") {
    const { data: b } = await ctx.supabase.from("bulletin_editions").select("id").eq("editorial_item_id", id).maybeSingle();
    if (b) redirect(`/app/editorial/boletins/${b.id}`);
  }
  if (item.tipo === "dossie") {
    const { data: d } = await ctx.supabase.from("dossiers").select("id").eq("editorial_item_id", id).maybeSingle();
    if (d) redirect(`/app/editorial/dossies/${d.id}`);
  }

  const [members, people, exps, { data: sources }, { data: results }, { data: files }, { data: pubs }] = await Promise.all([
    listMembers(ctx),
    listPeople(ctx),
    listExperimentOptions(ctx),
    ctx.supabase
      .from("editorial_sources")
      .select("id, referencia, experiments(id, codigo, titulo), result_summaries(id, variavel, validacao_status, escopo_divulgacao), files(id, nome_amigavel, tipo, autorizacao_uso, autorizacao_canais)")
      .eq("item_id", id),
    ctx.supabase.from("result_summaries").select("id, variavel, validacao_status, experiments(codigo)").eq("organization_id", ctx.orgId).order("created_at", { ascending: false }).limit(200),
    ctx.supabase.from("files").select("id, nome_amigavel, tipo").eq("organization_id", ctx.orgId).is("deleted_at", null).is("substituido_por", null).order("created_at", { ascending: false }).limit(200),
    ctx.supabase.from("publication_records").select("id, canal, data_publicacao, status, instagram_metrics(id, data_referencia, alcance, impressoes, curtidas, comentarios, salvamentos, compartilhamentos)").eq("item_id", id),
  ]);
  const editable = has(ctx, "editorial.criar") && isEditable(item.status);
  const locked = !isEditable(item.status);
  const draft = (item.draft ?? { blocks: [] }) as unknown as { blocks: DraftBlock[]; instagram?: InstagramDraft; relatorio?: Record<string, string> };
  const mode = item.tipo === "instagram" ? "instagram" : item.tipo === "relatorio_piloto" ? "relatorio" : "padrao";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/editorial", label: "Editorial" }, { label: item.titulo }]}
        title={item.titulo}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {EDITORIAL_KIND_LABELS[item.tipo]} · <StatusBadge status={item.status} label={STATUS_LABELS[item.status]} />
            {item.is_demo && <DemoBadge />}
          </span>
        }
      />
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          {locked && (
            <Alert tone="warning" title="Conteúdo em revisão ou já liberado">
              O texto está fixado na versão enviada. Para corrigir, a coordenação pode devolver para ajustes; edições diretas cancelam o ciclo de aprovação.
            </Alert>
          )}
          <Card>
            <CardHeader title={mode === "instagram" ? "Conteúdo do post" : mode === "relatorio" ? "Relatório final do piloto" : "Texto"} description="Texto puro estruturado; nenhum HTML é aceito." />
            <CardBody>
              <DraftEditor itemId={id} initial={draft} editable={has(ctx, "editorial.criar")} locked={locked} mode={mode} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fontes e referências" description="Trechos científicos precisam corresponder a fontes aprovadas. Imagens precisam de autorização individual." />
            <CardBody className="space-y-3">
              {!sources?.length && <p className="text-sm text-muted">Nenhuma fonte vinculada.</p>}
              <ul className="space-y-2">
                {(sources ?? []).map((s) => {
                  const e = s.experiments as unknown as { id: string; codigo: string; titulo: string } | null;
                  const r = s.result_summaries as unknown as { id: string; variavel: string; validacao_status: string; escopo_divulgacao: string[] } | null;
                  const f = s.files as unknown as { id: string; nome_amigavel: string; tipo: string; autorizacao_uso: string; autorizacao_canais: string[] } | null;
                  return (
                    <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                      <div>
                        {e && (
                          <Link className="hover:underline" href={`/app/experimentos/${e.id}`}>
                            Experimento <span className="font-mono">{e.codigo}</span> — {e.titulo}
                          </Link>
                        )}
                        {r && (
                          <span>
                            Resultado: {r.variavel} <StatusBadge status={r.validacao_status} label={r.validacao_status.replace("_", " ")} />
                          </span>
                        )}
                        {f && (
                          <span>
                            Arquivo: {f.nome_amigavel} ({FILE_KIND_LABELS[f.tipo as keyof typeof FILE_KIND_LABELS]}) · {f.autorizacao_uso.replace("_", " ")}
                          </span>
                        )}
                        {s.referencia && <p className="text-muted">{s.referencia}</p>}
                      </div>
                      {editable && (
                        <ActionForm action={removeSource}>
                          <input type="hidden" name="id" value={s.id} />
                          <SubmitButton size="sm" variant="ghost">
                            Remover
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
              {editable && (
                <ActionForm action={addSource} resetOnSuccess className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                  <input type="hidden" name="item_id" value={id} />
                  <Field label="Experimento" name="experiment_id">
                    <Select name="experiment_id" options={experimentOptions(exps)} placeholder="—" />
                  </Field>
                  <Field label="Resultado" name="result_id">
                    <Select
                      name="result_id"
                      options={(results ?? []).map((r) => ({ value: r.id, label: `${(r.experiments as unknown as { codigo: string } | null)?.codigo ?? ""} · ${r.variavel} (${r.validacao_status.replace("_", " ")})` }))}
                      placeholder="—"
                    />
                  </Field>
                  <Field label="Arquivo / imagem" name="file_id">
                    <Select name="file_id" options={(files ?? []).map((f) => ({ value: f.id, label: f.nome_amigavel }))} placeholder="—" />
                  </Field>
                  <Field label="Referência bibliográfica / técnica" name="referencia">
                    <Input name="referencia" />
                  </Field>
                  <div>
                    <SubmitButton size="sm" variant="secondary">
                      Vincular fonte
                    </SubmitButton>
                  </div>
                </ActionForm>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Dados da pauta" />
            <CardBody>
              <ActionForm action={updateEditorialItem} className="space-y-4">
                <input type="hidden" name="id" value={id} />
                <EditorialItemFields item={item} members={memberOptions(members)} people={people.map((p) => ({ value: p.id, label: p.nome }))} />
                {has(ctx, "editorial.criar") && <SubmitButton>Salvar dados</SubmitButton>}
              </ActionForm>
            </CardBody>
          </Card>

          {item.tipo === "instagram" && !!pubs?.length && (
            <Card>
              <CardHeader title="Desempenho (registro manual)" description="Sem integração com a Meta: números inseridos pela equipe, com data de referência." />
              <CardBody className="space-y-4">
                {pubs.map((p) => {
                  const ms = p.instagram_metrics as unknown as { id: string; data_referencia: string; alcance: number | null; impressoes: number | null; curtidas: number | null; comentarios: number | null; salvamentos: number | null; compartilhamentos: number | null }[];
                  return (
                    <div key={p.id} className="space-y-2">
                      <p className="text-sm font-medium">Publicação de {fmtDate(p.data_publicacao)} ({p.status})</p>
                      {ms.map((m) => (
                        <p key={m.id} className="text-xs text-muted">
                          Ref. {fmtDate(m.data_referencia)}: alcance {m.alcance ?? "—"} · impressões {m.impressoes ?? "—"} · curtidas {m.curtidas ?? "—"} · comentários {m.comentarios ?? "—"} · salvamentos {m.salvamentos ?? "—"} · compartilhamentos {m.compartilhamentos ?? "—"}
                        </p>
                      ))}
                      <ActionForm action={addInstagramMetrics} resetOnSuccess className="grid gap-2 sm:grid-cols-4">
                        <input type="hidden" name="publication_id" value={p.id} />
                        {(
                          [
                            ["data_referencia", "Data de referência", "date"],
                            ["alcance", "Alcance", "number"],
                            ["impressoes", "Impressões", "number"],
                            ["curtidas", "Curtidas", "number"],
                            ["comentarios", "Comentários", "number"],
                            ["salvamentos", "Salvamentos", "number"],
                            ["compartilhamentos", "Compartilhamentos", "number"],
                          ] as const
                        ).map(([k, l, t]) => (
                          <Field key={k} label={l} name={k}>
                            <Input name={k} id={`${k}-${p.id}`} type={t} min={0} required={k === "data_referencia"} />
                          </Field>
                        ))}
                        <div className="flex items-end">
                          <SubmitButton size="sm" variant="secondary">
                            Registrar
                          </SubmitButton>
                        </div>
                      </ActionForm>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}
        </div>
        <div className="xl:col-span-2">
          <WorkflowPanel ctx={ctx} itemId={id} />
        </div>
      </div>
    </>
  );
}
