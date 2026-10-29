import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDateTime, isoToLocalInput } from "@/lib/format";
import { ANALYSIS_LABELS, RECORD_STATUS_LABELS, VISIT_STATUS_LABELS } from "@/lib/labels";
import { listMembers, listPeople, memberOptions } from "@/lib/data/lookups";
import { ActionForm, DraftGuard, SubmitButton } from "@/components/client";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  Field,
  Input,
  KeyValue,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  buttonClass,
  optionsFrom,
} from "@/components/ui";
import { createTaskFromRecord, saveChecklist, saveVisitRecord, updateVisitStatus, visitRecordTransition } from "../actions";

export const metadata: Metadata = { title: "Visita" };

export default async function VisitPage({ params }: PageProps<"/app/visitas/[id]">) {
  const { id } = await params;
  const ctx = await requireContext();
  const { data: v } = await ctx.supabase
    .from("visit_schedules")
    .select("*, farms:farms!visit_schedules_farm_id_organization_id_fkey(nome), visit_participants(id, papel, people:people!visit_participants_person_id_organization_id_fkey(nome))")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!v) notFound();

  const [{ data: records }, people, members] = await Promise.all([
    ctx.supabase
      .from("visit_records")
      .select("*, experiments(id, codigo, codigo_institucional, titulo, titulo_curto, people:people!experiments_pesquisador_principal_id_organization_id_fkey(nome)), visit_checklist_items(id, item, resposta, observacao, ordem)")
      .eq("visit_id", id)
      .order("created_at"),
    listPeople(ctx),
    listMembers(ctx),
  ]);
  const manage = has(ctx, "visitas.gerenciar");
  const participants = (v.visit_participants as unknown as { id: string; people: { nome: string } | null }[]).map((p) => p.people?.nome).filter(Boolean);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/visitas", label: "Visitas" }, { label: v.titulo }]}
        title={v.titulo}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={v.status} label={VISIT_STATUS_LABELS[v.status]} /> {fmtDateTime(v.data_hora)}
            {v.is_demo && <DemoBadge />}
          </span>
        }
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Agendamento" />
          <CardBody>
            <KeyValue
              items={[
                { label: "Data e hora", value: fmtDateTime(v.data_hora) },
                { label: "Fazenda", value: (v.farms as unknown as { nome: string } | null)?.nome },
                { label: "Local", value: v.local },
                { label: "Interlocutores", value: v.interlocutores },
                { label: "Estudantes participantes", value: participants.join(", ") },
                { label: "Lembretes", value: v.lembrete },
                { label: "Motivo da situação", value: v.motivo_status },
              ]}
            />
          </CardBody>
        </Card>
        {manage && (
          <Card>
            <CardHeader title="Atualizar situação" />
            <CardBody>
              <ActionForm action={updateVisitStatus} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <Field label="Situação" name="status">
                  <Select name="status" defaultValue={v.status} options={optionsFrom(VISIT_STATUS_LABELS)} />
                </Field>
                <Field label="Motivo (obrigatório para adiar/cancelar)" name="motivo_status">
                  <Input name="motivo_status" defaultValue={v.motivo_status ?? ""} />
                </Field>
                <Field label="Nova data (se adiada)" name="nova_data">
                  <Input name="nova_data" type="datetime-local" defaultValue={isoToLocalInput(null)} />
                </Field>
                <SubmitButton size="sm">Salvar situação</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>

      {v.status !== "realizada" && (
        <div className="mb-5">
          <Alert tone="info">As fichas podem ser preenchidas como rascunho, mas só são enviadas para conferência depois que a visita for marcada como realizada.</Alert>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-brand-900">Fichas de acompanhamento por experimento</h2>
      <div className="space-y-6">
        {(records ?? []).map((r) => {
          const e = r.experiments as unknown as { id: string; codigo: string; codigo_institucional: string | null; titulo: string; titulo_curto: string | null; people: { nome: string } | null };
          const editable = ["rascunho", "devolvida", "preenchida"].includes(r.status);
          const items = (r.visit_checklist_items as unknown as { id: string; item: string; resposta: string; observacao: string | null; ordem: number }[]).sort((a, b) => a.ordem - b.ordem);
          const formId = `ficha-form-${r.id}`;
          const missing = [
            !r.etapa_atual && "etapa atual",
            !r.atividades_desde_ultima && "atividades desde a última visita",
            r.ocorrencias_relatadas && !r.informante_person_id && !r.informante_descricao && "identificação do informante",
            !r.fontes && "fontes",
          ].filter(Boolean);
          return (
            <Card key={r.id} id={`ficha-${r.id}`}>
              <CardHeader
                title={
                  <span>
                    <Link href={`/app/experimentos/${e.id}`} className="font-mono text-brand-700 hover:underline">
                      {e.codigo}
                    </Link>{" "}
                    {e.titulo_curto || e.titulo}
                  </span>
                }
                description={`Responsável: ${e.people?.nome ?? "Não informado"}${e.codigo_institucional ? ` · Código institucional: ${e.codigo_institucional}` : ""}`}
                actions={
                  <>
                    <StatusBadge status={r.status} label={RECORD_STATUS_LABELS[r.status]} />
                    <a className={buttonClass("secondary", "sm")} href={`/app/visitas/${id}/ficha/${r.id}`} target="_blank" rel="noopener">
                      <FileDown aria-hidden className="h-4 w-4" /> PDF
                    </a>
                  </>
                }
              />
              <CardBody className="space-y-5">
                {missing.length > 0 && editable && <Alert tone="warning">Dados incompletos: {missing.join(", ")}.</Alert>}
                {r.comentario_conferencia && (
                  <Alert tone={r.status === "devolvida" ? "danger" : "success"} title="Comentário da conferência">
                    {r.comentario_conferencia} {r.conferido_em && `(${fmtDateTime(r.conferido_em)})`}
                  </Alert>
                )}

                <ActionForm action={saveVisitRecord} id={formId} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="id" value={r.id} />
                  <fieldset disabled={!editable} className="contents">
                    <Field label="Objetivo da visita" name="objetivo">
                      <Textarea name="objetivo" id={`objetivo-${r.id}`} defaultValue={r.objetivo ?? ""} rows={2} />
                    </Field>
                    <Field label="Etapa atual" name="etapa_atual">
                      <Textarea name="etapa_atual" id={`etapa-${r.id}`} defaultValue={r.etapa_atual ?? ""} rows={2} />
                    </Field>
                    <Field label="Atividades realizadas desde a última visita" name="atividades_desde_ultima" className="md:col-span-2">
                      <Textarea name="atividades_desde_ultima" id={`ativ-${r.id}`} defaultValue={r.atividades_desde_ultima ?? ""} />
                    </Field>
                    <Field label="Avaliações previstas (relato do responsável)" name="avaliacoes_previstas">
                      <Textarea name="avaliacoes_previstas" id={`avp-${r.id}`} defaultValue={r.avaliacoes_previstas ?? ""} />
                    </Field>
                    <Field label="Avaliações realizadas (relato do responsável)" name="avaliacoes_realizadas">
                      <Textarea name="avaliacoes_realizadas" id={`avr-${r.id}`} defaultValue={r.avaliacoes_realizadas ?? ""} />
                    </Field>
                    <div className="rounded-lg border border-info-600/30 bg-info-100/40 p-3 md:col-span-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-info-600">Informação fornecida pelo pesquisador</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Ocorrências relatadas" name="ocorrencias_relatadas" className="md:col-span-2">
                          <Textarea name="ocorrencias_relatadas" id={`oc-${r.id}`} defaultValue={r.ocorrencias_relatadas ?? ""} />
                        </Field>
                        <Field label="Quem informou (pessoa cadastrada)" name="informante_person_id">
                          <Select name="informante_person_id" id={`inf-${r.id}`} defaultValue={r.informante_person_id ?? ""} options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="—" />
                        </Field>
                        <Field label="ou descrição do informante" name="informante_descricao">
                          <Input name="informante_descricao" id={`infd-${r.id}`} defaultValue={r.informante_descricao ?? ""} />
                        </Field>
                      </div>
                    </div>
                    <div className="rounded-lg border border-accent-500/40 bg-accent-100/40 p-3 md:col-span-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-600">Observação direta das estudantes</p>
                      <Field label="Observações diretas" name="observacoes_diretas">
                        <Textarea name="observacoes_diretas" id={`obs-${r.id}`} defaultValue={r.observacoes_diretas ?? ""} />
                      </Field>
                    </div>
                    <Field label="Resultados disponibilizados" name="resultados_disponibilizados">
                      <Textarea name="resultados_disponibilizados" id={`res-${r.id}`} defaultValue={r.resultados_disponibilizados ?? ""} />
                    </Field>
                    <Field label="Situação da análise" name="situacao_analise">
                      <Select name="situacao_analise" id={`sa-${r.id}`} defaultValue={r.situacao_analise} options={optionsFrom(ANALYSIS_LABELS)} />
                    </Field>
                    <Field label="Fontes, links e anexos citados" name="fontes" className="md:col-span-2">
                      <Textarea name="fontes" id={`fontes-${r.id}`} defaultValue={r.fontes ?? ""} rows={2} />
                    </Field>
                    <Field label="Conteúdo potencial para divulgação" name="conteudo_potencial" className="md:col-span-2" hint="Sugestão editorial: não é conclusão científica.">
                      <Textarea name="conteudo_potencial" id={`cp-${r.id}`} defaultValue={r.conteudo_potencial ?? ""} rows={2} />
                    </Field>
                    <Field label="Próxima ação" name="proxima_acao">
                      <Input name="proxima_acao" id={`pa-${r.id}`} defaultValue={r.proxima_acao ?? ""} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Responsável" name="proxima_acao_responsavel">
                        <Select name="proxima_acao_responsavel" id={`par-${r.id}`} defaultValue={r.proxima_acao_responsavel ?? ""} options={memberOptions(members)} placeholder="—" />
                      </Field>
                      <Field label="Prazo" name="proxima_acao_prazo">
                        <Input name="proxima_acao_prazo" id={`pap-${r.id}`} type="date" defaultValue={r.proxima_acao_prazo ?? ""} />
                      </Field>
                    </div>
                    {editable && (
                      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                        <SubmitButton>Salvar ficha</SubmitButton>
                        <DraftGuard formId={formId} storageKey={`ficha-${r.id}`} />
                      </div>
                    )}
                  </fieldset>
                </ActionForm>

                {items.length > 0 && (
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Roteiro de verificação ({items.filter((i) => i.resposta !== "pendente").length}/{items.length} respondidos)
                    </summary>
                    <ActionForm action={saveChecklist} className="mt-3 space-y-2">
                      {items.map((it) => (
                        <div key={it.id} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                          <input type="hidden" name="item_id" value={it.id} />
                          <label htmlFor={`resposta_${it.id}`} className="text-sm">
                            {it.item}
                          </label>
                          <Select name={`resposta_${it.id}`} defaultValue={it.resposta} options={optionsFrom({ pendente: "Pendente", sim: "Sim", nao: "Não", nao_se_aplica: "Não se aplica" })} disabled={!editable} />
                          <Input name={`obs_${it.id}`} defaultValue={it.observacao ?? ""} placeholder="Observação" aria-label={`Observação: ${it.item}`} disabled={!editable} />
                        </div>
                      ))}
                      {editable && <SubmitButton size="sm" variant="secondary">Salvar roteiro</SubmitButton>}
                    </ActionForm>
                  </details>
                )}

                <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                  {(r.status === "rascunho" || r.status === "devolvida") && (
                    <ActionForm action={visitRecordTransition}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="acao" value="enviar" />
                      <SubmitButton variant="primary">Enviar para conferência</SubmitButton>
                    </ActionForm>
                  )}
                  {r.status === "preenchida" && (
                    <ActionForm action={visitRecordTransition}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="acao" value="conferir" />
                      <SubmitButton>Conferir ficha</SubmitButton>
                    </ActionForm>
                  )}
                  {r.status === "conferida" && manage && (
                    <ActionForm action={visitRecordTransition}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="acao" value="finalizar" />
                      <SubmitButton>Finalizar ficha</SubmitButton>
                    </ActionForm>
                  )}
                  {(r.status === "preenchida" || r.status === "conferida") && (
                    <ActionForm action={visitRecordTransition} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="acao" value="devolver" />
                      <Field label="Motivo da devolução" name="comentario">
                        <Input name="comentario" id={`dev-${r.id}`} required />
                      </Field>
                      <SubmitButton variant="secondary">Devolver</SubmitButton>
                    </ActionForm>
                  )}
                </div>

                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Criar atividade a partir de pendência</summary>
                  {/* key: remonta quando a próxima ação salva muda, para o pré-preenchimento refletir o valor atual */}
                  <ActionForm
                    key={[r.proxima_acao, r.proxima_acao_responsavel, r.proxima_acao_prazo].join("|")}
                    action={createTaskFromRecord}
                    resetOnSuccess
                    className="mt-3 grid gap-3 sm:grid-cols-4"
                  >
                    <input type="hidden" name="record_id" value={r.id} />
                    <Field label="Pendência" name="titulo" className="sm:col-span-2">
                      <Input name="titulo" id={`tt-${r.id}`} defaultValue={r.proxima_acao ?? ""} required />
                    </Field>
                    <Field label="Responsável" name="responsavel_id">
                      <Select name="responsavel_id" id={`tr-${r.id}`} defaultValue={r.proxima_acao_responsavel ?? ""} options={memberOptions(members)} placeholder="—" />
                    </Field>
                    <Field label="Prazo" name="prazo">
                      <Input name="prazo" id={`tp-${r.id}`} type="date" defaultValue={r.proxima_acao_prazo ?? ""} />
                    </Field>
                    <div>
                      <SubmitButton size="sm" variant="secondary">Criar atividade</SubmitButton>
                    </div>
                  </ActionForm>
                </details>
                <p className="text-xs text-muted">
                  Ficha criada em {fmtDateTime(r.created_at)} · Atualizada em {fmtDateTime(r.updated_at)}
                  {r.conferido_em && ` · Conferida em ${fmtDateTime(r.conferido_em)}`}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
