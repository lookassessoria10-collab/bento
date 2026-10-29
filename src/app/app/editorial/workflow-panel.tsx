import Link from "next/link";
import { FileDown } from "lucide-react";
import type { AppContext } from "@/lib/auth";
import { has, hasFinalReview } from "@/lib/auth";
import { fmtDate, fmtDateTime, localDate } from "@/lib/format";
import { CHANNEL_LABELS } from "@/lib/labels";
import { STAGE_LABELS, STATUS_LABELS, canSubmit, stageFor, type WorkflowStatus } from "@/lib/workflow";
import { slugify } from "@/lib/text";
import { listMembers, listPeople } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Badge, Card, CardBody, CardHeader, Checkbox, Field, Input, Select, StatusBadge, Textarea, buttonClass } from "@/components/ui";
import { decide, externalValidation, registerPublication, revokePublication, submitForReview } from "./actions";

/** Painel do fluxo de revisão/publicação de um conteúdo. Todas as ações passam pelas RPCs do banco. */
export async function WorkflowPanel({ ctx, itemId, compact = false }: { ctx: AppContext; itemId: string; compact?: boolean }) {
  const { supabase } = ctx;
  const [{ data: item }, { data: versions }, { data: decisions }, { data: releases }, { data: pubs }, { data: docs }, { data: requests }] = await Promise.all([
    supabase.from("editorial_items").select("id, titulo, tipo, status, current_version_id, requer_validacao_cientifica, canais, revisor_cientifico, revisor_final, created_by").eq("id", itemId).single(),
    supabase.from("editorial_versions").select("id, numero, content_hash, created_at, created_by").eq("item_id", itemId).order("numero", { ascending: false }),
    supabase.from("approval_decisions").select("id, etapa, decisao, motivo, escopo_canais, decidido_por, papel, externo, metodo_confirmacao, data_confirmacao, created_at, version_id").eq("item_id", itemId).order("created_at", { ascending: false }),
    supabase.from("release_permissions").select("canal, version_id, revogado_em").eq("item_id", itemId),
    supabase.from("publication_records").select("id, canal, data_publicacao, url, status, version_id, responsavel_id, motivo_revogacao, errata, created_at").eq("item_id", itemId).order("created_at", { ascending: false }),
    supabase.from("generated_documents").select("id, version_id, sha256, gerado_em, rascunho, tamanho_bytes").eq("item_id", itemId).order("gerado_em", { ascending: false }),
    supabase.from("approval_requests").select("id, etapa, revisor_id, prazo, status, version_id").eq("item_id", itemId).eq("status", "aberta"),
  ]);
  if (!item) return null;
  const members = await listMembers(ctx);
  const name = (id: string | null) => (id ? (members.find((m) => m.id === id)?.nome ?? "Usuário") : "—");
  const status = item.status as WorkflowStatus;
  const stage = stageFor(status);
  const current = versions?.find((v) => v.id === item.current_version_id);
  const released = (releases ?? []).filter((r) => r.version_id === item.current_version_id && !r.revogado_em).map((r) => r.canal);
  const finalDocs = (docs ?? []).filter((d) => !d.rascunho && d.version_id === item.current_version_id);
  const isAuthor = current?.created_by === ctx.userId;

  let blockers: string[] = [];
  if (current && (status === "validado" || status === "aguardando_revisao_final")) {
    const chans = item.canais.length ? item.canais : (["interno"] as const);
    const results = await Promise.all(chans.map((c) => supabase.rpc("release_blockers", { p_version: current.id, p_channel: c })));
    blockers = results.flatMap((r, i) => (r.data ?? []).map((b: string) => `${CHANNEL_LABELS[chans[i]]}: ${b}`));
  }

  // quem pode decidir nesta etapa (a decisão final é sempre do banco)
  const canDecide =
    (stage === "conferencia" && has(ctx, "revisao.conferencia") && !isAuthor) ||
    stage === "validacao_cientifica" ||
    (stage === "revisao_final" && hasFinalReview(ctx) && !isAuthor);

  const people = stage === "validacao_cientifica" ? await listPeople(ctx) : [];
  const { data: evidence } =
    stage === "validacao_cientifica"
      ? await supabase.from("files").select("id, nome_amigavel").eq("organization_id", ctx.orgId).in("tipo", ["autorizacao", "documento_institucional"]).is("deleted_at", null).limit(100)
      : { data: [] };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Revisão e publicação"
          description="Validação científica e autorização final são decisões distintas, registradas por versão."
          actions={<StatusBadge status={status} label={STATUS_LABELS[status]} />}
        />
        <CardBody className="space-y-4">
          <ol className="flex flex-wrap gap-2 text-xs" aria-label="Etapas do fluxo">
            {(["rascunho", "em_conferencia", ...(item.requer_validacao_cientifica ? ["aguardando_validacao", "validado"] : []), "aguardando_revisao_final", "liberado", "publicado"] as WorkflowStatus[]).map((s) => (
              <li key={s} className={`rounded-full border px-2 py-0.5 ${s === status ? "border-brand-700 bg-brand-700 text-white" : "border-border text-muted"}`} aria-current={s === status ? "step" : undefined}>
                {STATUS_LABELS[s]}
              </li>
            ))}
          </ol>
          {current ? (
            <p className="text-sm">
              Versão em ciclo: <strong>v{current.numero}</strong> de {fmtDateTime(current.created_at)} por {name(current.created_by)}.{" "}
              <span className="font-mono text-xs text-muted">hash {current.content_hash.slice(0, 12)}…</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Nenhuma versão enviada ainda.</p>
          )}
          {!item.requer_validacao_cientifica && (
            <Alert tone="info">Conteúdo institucional sem informação científica específica: segue fluxo editorial, sem validação científica.</Alert>
          )}
          {(requests ?? []).map((r) => (
            <p key={r.id} className="text-sm">
              Aguardando <strong>{STAGE_LABELS[r.etapa as keyof typeof STAGE_LABELS]}</strong>
              {r.revisor_id ? ` por ${name(r.revisor_id)}` : " (qualquer membro habilitado)"}
              {r.prazo ? ` · prazo ${fmtDate(r.prazo)}` : ""}
            </p>
          ))}

          {canSubmit(status) && has(ctx, "editorial.criar") && (
            <ActionForm action={submitForReview} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
              <input type="hidden" name="id" value={itemId} />
              <Field label="Prazo para conferência" name="prazo">
                <Input name="prazo" id={`prazo-${itemId}`} type="date" />
              </Field>
              <SubmitButton>Fixar versão e enviar para conferência</SubmitButton>
              <p className="w-full text-xs text-muted">Gera um snapshot imutável. Editar depois disso cancela o ciclo e exige nova revisão.</p>
            </ActionForm>
          )}

          {stage && canDecide && !compact && (
            <ActionForm action={decide} className="space-y-3 rounded-lg border border-brand-500/40 bg-brand-50 p-3">
              <input type="hidden" name="id" value={itemId} />
              <p className="text-sm font-semibold">Decisão — {STAGE_LABELS[stage]}</p>
              {stage === "validacao_cientifica" && (
                <p className="text-xs text-muted">Somente o pesquisador responsável (ou revisor delegado) por todos os experimentos citados pode validar. O banco confere isso.</p>
              )}
              {stage === "revisao_final" && (
                <>
                  {blockers.length > 0 && (
                    <Alert tone="warning" title="Pendências que bloqueiam a liberação">
                      <ul className="list-disc pl-4">
                        {blockers.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  <fieldset>
                    <legend className="text-sm font-medium">Canais autorizados para esta versão</legend>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {(["interno", "boletim", "dossie", "instagram", "portal", "outro"] as const).map((c) => (
                        <Checkbox key={c} id={`canal-${c}-${itemId}`} name="canais" value={c} label={CHANNEL_LABELS[c]} defaultChecked={item.canais.includes(c)} />
                      ))}
                    </div>
                  </fieldset>
                </>
              )}
              <Field label="Justificativa (obrigatória para ajustes/rejeição)" name="motivo">
                <Textarea name="motivo" id={`motivo-${itemId}`} rows={2} />
              </Field>
              <Field label="Prazo da próxima etapa" name="prazo">
                <Input name="prazo" id={`prazo2-${itemId}`} type="date" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <SubmitButton name="decisao" value="aprovado">
                  {stage === "revisao_final" ? "Autorizar e liberar" : stage === "validacao_cientifica" ? "Validar cientificamente" : "Aprovar conferência"}
                </SubmitButton>
                <SubmitButton name="decisao" value="ajustes" variant="secondary">
                  Solicitar ajustes
                </SubmitButton>
                <SubmitButton name="decisao" value="rejeitado" variant="danger">
                  Rejeitar
                </SubmitButton>
              </div>
            </ActionForm>
          )}
          {stage === "revisao_final" && isAuthor && <Alert tone="info">Você redigiu esta versão: a liberação deve ser feita por outra pessoa habilitada.</Alert>}

          {stage === "validacao_cientifica" && has(ctx, "editorial.criar") && !compact && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Registrar validação externa documentada (pesquisador sem conta)</summary>
              <ActionForm action={externalValidation} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={itemId} />
                <Field label="Pesquisador responsável" name="person_id" required>
                  <Select name="person_id" id={`ext-p-${itemId}`} options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="Selecione" required />
                </Field>
                <Field label="Comprovante (Biblioteca › Autorização)" name="comprovante_id" required>
                  <Select name="comprovante_id" id={`ext-c-${itemId}`} options={(evidence ?? []).map((f) => ({ value: f.id, label: f.nome_amigavel }))} placeholder="Selecione" required />
                </Field>
                <Field label="Método de confirmação" name="metodo" required>
                  <Input name="metodo" id={`ext-m-${itemId}`} required />
                </Field>
                <Field label="Data da confirmação" name="data" required>
                  <Input name="data" id={`ext-d-${itemId}`} type="date" required />
                </Field>
                <Field label="Observação" name="observacao" className="sm:col-span-2">
                  <Input name="observacao" id={`ext-o-${itemId}`} />
                </Field>
                <div>
                  <SubmitButton variant="secondary">Registrar</SubmitButton>
                </div>
              </ActionForm>
            </details>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <a className={buttonClass("secondary", "sm")} href={`/app/editorial/${itemId}/pdf`} target="_blank" rel="noopener">
              <FileDown aria-hidden className="h-4 w-4" /> PDF de revisão (rascunho)
            </a>
            {current && released.length > 0 && has(ctx, "publicacao.registrar") && (
              <a className={buttonClass("accent", "sm")} href={`/app/editorial/${itemId}/pdf?final=1`} target="_blank" rel="noopener">
                <FileDown aria-hidden className="h-4 w-4" /> Gerar PDF final (v{current.numero})
              </a>
            )}
          </div>
          {finalDocs.length > 0 && (
            <ul className="text-xs text-muted">
              {finalDocs.map((d) => (
                <li key={d.id}>
                  PDF final gerado em {fmtDateTime(d.gerado_em)} · sha256 {d.sha256.slice(0, 16)}… ·{" "}
                  <Link className="underline" href={`/app/editorial/${itemId}/pdf?documento=${d.id}`}>
                    baixar arquivo armazenado
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {(status === "liberado" || status === "publicado") && has(ctx, "publicacao.registrar") && !compact && (
        <Card>
          <CardHeader title="Registrar publicação" description={`Liberado para: ${released.map((c) => CHANNEL_LABELS[c]).join(", ") || "nenhum canal"}. Gerar PDF não equivale a publicar.`} />
          <CardBody>
            <ActionForm action={registerPublication} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={itemId} />
              <Field label="Canal" name="canal" required>
                <Select name="canal" id={`pub-c-${itemId}`} options={released.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))} required />
              </Field>
              <Field label="Data real da publicação" name="data" required>
                <Input name="data" id={`pub-d-${itemId}`} type="date" defaultValue={localDate()} required />
              </Field>
              <Field label="Link da publicação" name="url">
                <Input name="url" id={`pub-u-${itemId}`} type="url" placeholder="https://" />
              </Field>
              <Field label="PDF final vinculado" name="document_id">
                <Select name="document_id" id={`pub-doc-${itemId}`} options={finalDocs.map((d) => ({ value: d.id, label: `PDF ${fmtDateTime(d.gerado_em)}` }))} placeholder="Nenhum" />
              </Field>
              <Field label="Endereço no portal (somente canal Portal)" name="slug" hint="Letras minúsculas, números e hífens.">
                <Input name="slug" id={`pub-s-${itemId}`} defaultValue={slugify(item.titulo)} />
              </Field>
              <Field label="Resumo público (portal)" name="resumo">
                <Input name="resumo" id={`pub-r-${itemId}`} />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton>Confirmar publicação</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
      )}

      {!!pubs?.length && (
        <Card>
          <CardHeader title="Publicações registradas" />
          <CardBody className="space-y-3">
            {pubs.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                <p>
                  <Badge tone={p.status === "ativa" ? "brand" : "danger"}>{p.status}</Badge> {CHANNEL_LABELS[p.canal]} · {fmtDate(p.data_publicacao)} · por {name(p.responsavel_id)} · versão{" "}
                  {versions?.find((v) => v.id === p.version_id)?.numero}
                  {p.url && (
                    <>
                      {" · "}
                      <a className="text-brand-700 underline" href={p.url} target="_blank" rel="noopener noreferrer">
                        link
                      </a>
                    </>
                  )}
                </p>
                {p.motivo_revogacao && <p className="text-xs text-danger-600">Revogada: {p.motivo_revogacao}{p.errata ? ` · Errata: ${p.errata}` : ""}</p>}
                {p.status === "ativa" && hasFinalReview(ctx) && !compact && (
                  <ActionForm action={revokePublication} className="mt-2 flex flex-wrap items-end gap-2" confirm="Revogar esta publicação?">
                    <input type="hidden" name="publication_id" value={p.id} />
                    <Field label="Motivo" name="motivo">
                      <Input name="motivo" id={`rv-m-${p.id}`} required />
                    </Field>
                    <Field label="Errata pública (opcional)" name="errata">
                      <Input name="errata" id={`rv-e-${p.id}`} />
                    </Field>
                    <SubmitButton size="sm" variant="danger">
                      Revogar
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Histórico de decisões" description="Assinatura no banco: responsável, papel, data/hora, versão e escopo." />
        <CardBody>
          {!decisions?.length ? (
            <p className="text-sm text-muted">Nenhuma decisão registrada.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {decisions.map((d) => (
                <li key={d.id} className="rounded-lg border border-border px-3 py-2">
                  <strong>{STAGE_LABELS[d.etapa as keyof typeof STAGE_LABELS]}</strong>: {d.decisao} por {name(d.decidido_por)} ({d.papel.replaceAll("_", " ")}) em {fmtDateTime(d.created_at)} · v
                  {versions?.find((v) => v.id === d.version_id)?.numero}
                  {d.escopo_canais.length > 0 && ` · canais: ${d.escopo_canais.map((c) => CHANNEL_LABELS[c]).join(", ")}`}
                  {d.externo && ` · validação externa (${d.metodo_confirmacao}, ${fmtDate(d.data_confirmacao)})`}
                  {d.motivo && <p className="text-xs text-muted">Justificativa: {d.motivo}</p>}
                </li>
              ))}
            </ul>
          )}
          {!!versions?.length && (
            <p className="mt-3 text-xs text-muted">
              Versões: {versions.map((v) => `v${v.numero} (${fmtDateTime(v.created_at)})`).join(" · ")} —{" "}
              <Link className="underline" href={`/app/aprovacoes/${itemId}`}>
                comparar versões
              </Link>
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
