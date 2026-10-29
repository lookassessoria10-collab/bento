import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { BULLETIN_SECTION_LABELS } from "@/lib/labels";
import { STATUS_LABELS, isEditable } from "@/lib/workflow";
import { experimentOptions, listExperimentOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, Checkbox, DemoBadge, Field, Input, PageHeader, Select, StatusBadge, Textarea, optionsFrom } from "@/components/ui";
import { WorkflowPanel } from "../../workflow-panel";
import { deleteSection, moveSection, saveSection, updateBulletin } from "../../actions";

export const metadata: Metadata = { title: "Boletim" };

export default async function BulletinPage({ params }: PageProps<"/app/editorial/boletins/[id]">) {
  const { id } = await params;
  const ctx = await requireContext();
  const { data: b } = await ctx.supabase
    .from("bulletin_editions")
    .select("*, editorial_items(id, titulo, status, is_demo)")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!b) notFound();
  const item = b.editorial_items as unknown as { id: string; titulo: string; status: keyof typeof STATUS_LABELS; is_demo: boolean };
  const [{ data: sections }, exps, { data: results }, { data: images }] = await Promise.all([
    ctx.supabase.from("bulletin_sections").select("*").eq("bulletin_id", id).order("ordem"),
    listExperimentOptions(ctx),
    ctx.supabase
      .from("result_summaries")
      .select("id, variavel, validacao_status, escopo_divulgacao, experiments(codigo)")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(300),
    ctx.supabase
      .from("files")
      .select("id, nome_amigavel, autorizacao_uso, autorizacao_canais, mime_type")
      .eq("organization_id", ctx.orgId)
      .is("deleted_at", null)
      .is("substituido_por", null)
      .like("mime_type", "image/%")
      .limit(200),
  ]);
  const editable = has(ctx, "editorial.criar") && isEditable(item.status);
  const resultLabel = (r: NonNullable<typeof results>[number]) =>
    `${(r.experiments as unknown as { codigo: string } | null)?.codigo ?? ""} · ${r.variavel} — ${r.validacao_status === "validado" && r.escopo_divulgacao.includes("boletim") ? "validado p/ boletim" : "NÃO liberado p/ boletim"}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { href: "/app/editorial", label: "Editorial" },
          { href: "/app/editorial/boletins", label: "Boletins" },
          { label: `Nº ${b.numero}` },
        ]}
        title={`Boletim nº ${b.numero} — ${item.titulo}`}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={item.status} label={STATUS_LABELS[item.status]} /> {item.is_demo && <DemoBadge />}
            <Link className="text-brand-700 underline" href={`/app/editorial/${item.id}/pdf?rascunho=atual`} target="_blank">
              Pré-visualizar PDF do rascunho atual
            </Link>
          </span>
        }
      />
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          {!editable && <Alert tone="warning">Edição fixada para revisão. Alterações cancelam o ciclo; peça devolução para ajustes.</Alert>}
          <Card>
            <CardHeader title="Dados da edição" />
            <CardBody>
              <ActionForm action={updateBulletin} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={id} />
                <Field label="Volume" name="volume">
                  <Input name="volume" defaultValue={b.volume ?? ""} />
                </Field>
                <Field label="Período — início" name="periodo_inicio">
                  <Input name="periodo_inicio" type="date" defaultValue={b.periodo_inicio ?? ""} />
                </Field>
                <Field label="Período — fim" name="periodo_fim">
                  <Input name="periodo_fim" type="date" defaultValue={b.periodo_fim ?? ""} />
                </Field>
                <Field label="Data prevista" name="data_prevista">
                  <Input name="data_prevista" type="date" defaultValue={b.data_prevista ?? ""} />
                </Field>
                <Field label="Data de fechamento" name="data_fechamento">
                  <Input name="data_fechamento" type="date" defaultValue={b.data_fechamento ?? ""} />
                </Field>
                <Field label="Imagem de capa (autorizada)" name="capa_file_id">
                  <Select
                    name="capa_file_id"
                    defaultValue={b.capa_file_id ?? ""}
                    options={(images ?? []).map((f) => ({ value: f.id, label: `${f.nome_amigavel}${f.autorizacao_uso === "divulgacao_autorizada" && f.autorizacao_canais.includes("boletim") ? "" : " (sem autorização)"}` }))}
                    placeholder="Sem capa"
                  />
                </Field>
                <Field label="Equipe editorial, autores e revisores" name="equipe_editorial" className="md:col-span-3">
                  <Textarea name="equipe_editorial" rows={2} defaultValue={b.equipe_editorial ?? ""} />
                </Field>
                <Field label="Texto de apresentação" name="apresentacao" className="md:col-span-3">
                  <Textarea name="apresentacao" rows={4} defaultValue={b.apresentacao ?? ""} />
                </Field>
                {editable && (
                  <div>
                    <SubmitButton>Salvar edição</SubmitButton>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>

          {(sections ?? []).map((s, idx) => (
            <Card key={s.id}>
              <CardHeader
                title={`${idx + 1}. ${s.titulo}`}
                description={BULLETIN_SECTION_LABELS[s.tipo as keyof typeof BULLETIN_SECTION_LABELS]}
                actions={
                  editable && (
                    <>
                      <ActionForm action={moveSection}>
                        <input type="hidden" name="bulletin_id" value={id} />
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="dir" value="up" />
                        <button className="rounded p-1 hover:bg-surface-muted" aria-label={`Mover seção ${s.titulo} para cima`}>
                          <ArrowUp aria-hidden className="h-4 w-4" />
                        </button>
                      </ActionForm>
                      <ActionForm action={moveSection}>
                        <input type="hidden" name="bulletin_id" value={id} />
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="dir" value="down" />
                        <button className="rounded p-1 hover:bg-surface-muted" aria-label={`Mover seção ${s.titulo} para baixo`}>
                          <ArrowDown aria-hidden className="h-4 w-4" />
                        </button>
                      </ActionForm>
                      <ActionForm action={deleteSection} confirm="Remover esta seção?">
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton size="sm" variant="ghost">
                          Remover
                        </SubmitButton>
                      </ActionForm>
                    </>
                  )
                }
              />
              <CardBody>
                <SectionForm s={s} bulletinId={id} editable={editable} exps={experimentOptions(exps)} results={(results ?? []).map((r) => ({ value: r.id, label: resultLabel(r) }))} images={(images ?? []).map((f) => ({ value: f.id, label: f.nome_amigavel }))} />
              </CardBody>
            </Card>
          ))}
          {editable && (
            <Card>
              <CardHeader title="Adicionar seção" />
              <CardBody>
                <SectionForm bulletinId={id} editable exps={experimentOptions(exps)} results={(results ?? []).map((r) => ({ value: r.id, label: resultLabel(r) }))} images={(images ?? []).map((f) => ({ value: f.id, label: f.nome_amigavel }))} />
              </CardBody>
            </Card>
          )}
        </div>
        <div className="xl:col-span-2">
          <WorkflowPanel ctx={ctx} itemId={item.id} />
        </div>
      </div>
    </>
  );
}

function SectionForm({
  s,
  bulletinId,
  editable,
  exps,
  results,
  images,
}: {
  s?: { id: string; tipo: string; titulo: string; corpo: string; experiment_id: string | null; result_ids: string[]; file_ids: string[]; referencias: string | null; ordem: number };
  bulletinId: string;
  editable: boolean;
  exps: { value: string; label: string }[];
  results: { value: string; label: string }[];
  images: { value: string; label: string }[];
}) {
  const k = s?.id ?? "nova";
  return (
    <ActionForm action={saveSection} resetOnSuccess={!s} className="grid gap-3 md:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <input type="hidden" name="bulletin_id" value={bulletinId} />
      <input type="hidden" name="ordem" value={s?.ordem ?? 99} />
      <fieldset disabled={!editable} className="contents">
        <Field label="Tipo de seção" name="tipo">
          <Select name="tipo" id={`tipo-${k}`} defaultValue={s?.tipo ?? "livre"} options={optionsFrom(BULLETIN_SECTION_LABELS)} />
        </Field>
        <Field label="Título" name="titulo" required>
          <Input name="titulo" id={`titulo-${k}`} defaultValue={s?.titulo ?? ""} required />
        </Field>
        <Field label="Texto" name="corpo" className="md:col-span-2" hint="Use apenas interpretações aprovadas. Parágrafos separados por linha em branco.">
          <Textarea name="corpo" id={`corpo-${k}`} rows={5} defaultValue={s?.corpo ?? ""} />
        </Field>
        <Field label="Experimento citado" name="experiment_id">
          <Select name="experiment_id" id={`exp-${k}`} defaultValue={s?.experiment_id ?? ""} options={exps} placeholder="Nenhum" />
        </Field>
        <Field label="Referências" name="referencias">
          <Input name="referencias" id={`ref-${k}`} defaultValue={s?.referencias ?? ""} />
        </Field>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium">Resultados incluídos</legend>
          <div className="mt-1 grid max-h-40 gap-1 overflow-y-auto rounded border border-border p-2">
            {results.length === 0 && <span className="text-xs text-muted">Nenhum resultado registrado.</span>}
            {results.map((r) => (
              <Checkbox key={r.value} id={`r-${k}-${r.value}`} name="result_ids" value={r.value} label={r.label} defaultChecked={s?.result_ids.includes(r.value)} />
            ))}
          </div>
        </fieldset>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium">Imagens</legend>
          <div className="mt-1 grid max-h-32 gap-1 overflow-y-auto rounded border border-border p-2">
            {images.length === 0 && <span className="text-xs text-muted">Nenhuma imagem na biblioteca.</span>}
            {images.map((r) => (
              <Checkbox key={r.value} id={`i-${k}-${r.value}`} name="file_ids" value={r.value} label={r.label} defaultChecked={s?.file_ids.includes(r.value)} />
            ))}
          </div>
        </fieldset>
        {editable && (
          <div>
            <SubmitButton size="sm">{s ? "Salvar seção" : "Adicionar seção"}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
}
