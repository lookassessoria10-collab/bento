import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ANALYSIS_LABELS, CHANNEL_LABELS } from "@/lib/labels";
import { canValidateExperiment, canWriteExperiment } from "@/lib/permissions";
import { experimentOptions, listExperimentOptions, listPeople, myExperimentAccess } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DemoBadge,
  EmptyState,
  Field,
  Input,
  LinkButton,
  PageHeader,
  Select,
  SourceLine,
  StatusBadge,
  Table,
  Td,
  Textarea,
  Th,
  buttonClass,
  optionsFrom,
} from "@/components/ui";
import { createResult, resultExternalValidation, resultTransition, updateResult } from "./actions";

export const metadata: Metadata = { title: "Resultados" };

const VALID = { nao_validado: "Não validado", validado: "Validado", devolvido: "Devolvido", revogado: "Revogado" } as const;
const CONF = { pendente: "Pendente", conferido: "Conferido", devolvido: "Devolvido" } as const;

export default async function ResultsPage({ searchParams }: PageProps<"/app/resultados">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const selected = /^[0-9a-f-]{36}$/.test(s("resultado")) ? s("resultado") : null;
  const exp = /^[0-9a-f-]{36}$/.test(s("experimento")) ? s("experimento") : "";
  const status = s("validacao");

  let q = ctx.supabase
    .from("result_summaries")
    .select("id, variavel, unidade, situacao_analise, conferencia_status, validacao_status, data_fornecimento, fonte_descricao, is_demo, updated_at, experiments(id, codigo, titulo_curto, titulo)")
    .eq("organization_id", ctx.orgId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (exp) q = q.eq("experiment_id", exp);
  if (status && status in VALID) q = q.eq("validacao_status", status);
  const [{ data: results }, exps, people] = await Promise.all([q, listExperimentOptions(ctx), listPeople(ctx)]);

  return (
    <>
      <PageHeader
        title="Resultados recebidos"
        description="Registro descritivo e rastreável das sínteses fornecidas pelos pesquisadores. O Bento não interpreta, compara tratamentos nem calcula estatísticas."
        actions={<LinkButton variant="primary" href={`/app/resultados?novo=1${exp ? `&experimento=${exp}` : ""}`}>Registrar resultado</LinkButton>}
      />

      {s("novo") === "1" && (
        <Card className="mb-5">
          <CardHeader title="Novo resultado" description="Copie a síntese exatamente como recebida. Não complete dados ausentes." />
          <CardBody>
            <ResultForm action={createResult} exps={experimentOptions(exps)} people={people} defaults={{ experiment_id: exp }} />
          </CardBody>
        </Card>
      )}

      {selected && <ResultDetail id={selected} />}

      <form className="mb-4 flex flex-wrap items-end gap-2" aria-label="Filtrar resultados">
        <div>
          <label htmlFor="experimento" className="text-xs text-muted">
            Experimento
          </label>
          <Select name="experimento" defaultValue={exp} options={experimentOptions(exps)} placeholder="Todos" />
        </div>
        <div>
          <label htmlFor="validacao" className="text-xs text-muted">
            Validação
          </label>
          <Select name="validacao" defaultValue={status} options={optionsFrom(VALID)} placeholder="Todas" />
        </div>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {!results?.length ? (
        <EmptyState title="Nenhum resultado registrado.">Registre resultados somente quando fornecidos pelos responsáveis, com fonte e data.</EmptyState>
      ) : (
        <Card>
          <Table caption="Resultados">
            <thead>
              <tr>
                <Th>Variável</Th>
                <Th>Experimento</Th>
                <Th>Análise</Th>
                <Th>Conferência</Th>
                <Th>Validação científica</Th>
                <Th>Fornecido em</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const e = r.experiments as unknown as { id: string; codigo: string } | null;
                return (
                  <tr key={r.id} className={r.id === selected ? "bg-brand-50" : undefined}>
                    <Td>
                      <Link href={`/app/resultados?resultado=${r.id}`} className="font-medium hover:underline">
                        {r.variavel}
                      </Link>
                      {r.unidade && <span className="text-muted"> ({r.unidade})</span>}
                      {r.is_demo && <span className="ml-1"><DemoBadge /></span>}
                    </Td>
                    <Td className="font-mono text-xs">{e && <Link href={`/app/experimentos/${e.id}?aba=resultados`}>{e.codigo}</Link>}</Td>
                    <Td>{ANALYSIS_LABELS[r.situacao_analise]}</Td>
                    <Td>
                      <StatusBadge status={r.conferencia_status} label={CONF[r.conferencia_status as keyof typeof CONF]} />
                    </Td>
                    <Td>
                      <StatusBadge status={r.validacao_status} label={VALID[r.validacao_status as keyof typeof VALID]} />
                    </Td>
                    <Td className="tabular">{fmtDate(r.data_fornecimento)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );

  async function ResultDetail({ id }: { id: string }) {
    const { data: r } = await ctx.supabase.from("result_summaries").select("*, experiments(id, codigo, titulo, nivel_acesso)").eq("id", id).maybeSingle();
    if (!r) return <Alert tone="danger">Resultado não encontrado ou sem acesso.</Alert>;
    const e = r.experiments as unknown as { id: string; codigo: string; titulo: string; nivel_acesso: "privado_equipe" | "colaboradores" | "preparado_revisao" };
    const access = await myExperimentAccess(ctx, e.id);
    const canEdit = canWriteExperiment(ctx.roles, e.nivel_acesso, access);
    const canValidate = canValidateExperiment(access);
    const team = has(ctx, "revisao.conferencia");
    const { data: files } = await ctx.supabase
      .from("files")
      .select("id, nome_amigavel, tipo")
      .eq("organization_id", ctx.orgId)
      .is("deleted_at", null)
      .in("tipo", ["autorizacao", "documento_institucional", "relatorio"])
      .limit(100);
    return (
      <Card className="mb-5 border-brand-500">
        <CardHeader
          title={`${r.variavel}${r.unidade ? ` (${r.unidade})` : ""}`}
          description={
            <span>
              <Link className="font-mono text-brand-700" href={`/app/experimentos/${e.id}`}>
                {e.codigo}
              </Link>{" "}
              {e.titulo} · Versão da interpretação {r.versao_interpretacao}
            </span>
          }
          actions={
            <>
              <Badge tone="info">Análise: {ANALYSIS_LABELS[r.situacao_analise]}</Badge>
              <StatusBadge status={r.conferencia_status} label={`Conferência: ${CONF[r.conferencia_status as keyof typeof CONF]}`} />
              <StatusBadge status={r.validacao_status} label={`Validação: ${VALID[r.validacao_status as keyof typeof VALID]}`} />
            </>
          }
        />
        <CardBody className="space-y-4">
          {r.is_demo && <DemoBadge />}
          <div>
            <p className="text-xs font-medium uppercase text-muted">Síntese recebida</p>
            <p className="whitespace-pre-line text-sm">{r.sintese || "Sem síntese."}</p>
          </div>
          {r.limitacoes && (
            <p className="text-sm">
              <strong>Limitações informadas:</strong> {r.limitacoes}
            </p>
          )}
          <SourceLine fonte={r.fonte_descricao} data={fmtDate(r.data_fornecimento)} />
          <p className="text-xs text-muted">
            Autorizado para: {r.escopo_divulgacao.map((c) => CHANNEL_LABELS[c]).join(", ")}
            {r.validado_em && ` · Validado em ${fmtDateTime(r.validado_em)}${r.validacao_externa ? " (validação externa documentada)" : ""}`}
          </p>

          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            {team && r.conferencia_status !== "conferido" && (
              <ActionForm action={resultTransition}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="acao" value="conferir" />
                <SubmitButton variant="secondary">Conferir (equipe)</SubmitButton>
              </ActionForm>
            )}
            {(team || canValidate) && (
              <ActionForm action={resultTransition} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="acao" value="devolver" />
                <Field label="Motivo da devolução" name="motivo">
                  <Input name="motivo" id={`motivo-dev-${r.id}`} required />
                </Field>
                <SubmitButton variant="ghost">Devolver</SubmitButton>
              </ActionForm>
            )}
          </div>

          {canValidate && r.conferencia_status === "conferido" && r.validacao_status !== "validado" && (
            <ActionForm action={resultTransition} className="rounded-lg border border-brand-500/40 bg-brand-50 p-3">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="acao" value="validar" />
              <p className="mb-2 text-sm font-medium">Validação científica (pesquisador responsável)</p>
              <p className="mb-2 text-xs text-muted">Escolha para quais destinos esta interpretação está autorizada.</p>
              <div className="mb-3 flex flex-wrap gap-4">
                {(["boletim", "dossie", "instagram", "portal"] as const).map((c) => (
                  <Checkbox key={c} name="escopo" value={c} label={CHANNEL_LABELS[c]} />
                ))}
              </div>
              <SubmitButton>Validar esta versão</SubmitButton>
            </ActionForm>
          )}
          {!canValidate && r.conferencia_status === "conferido" && r.validacao_status !== "validado" && has(ctx, "editorial.criar") && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Registrar validação externa documentada (pesquisador sem conta)</summary>
              <ActionForm action={resultExternalValidation} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={r.id} />
                <Field label="Pesquisador responsável" name="person_id" required>
                  <Select name="person_id" id={`pv-${r.id}`} options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="Selecione" required />
                </Field>
                <Field label="Comprovante (arquivo na Biblioteca)" name="comprovante_id" required hint="Envie antes o e-mail/ofício na Biblioteca como 'Autorização'.">
                  <Select name="comprovante_id" id={`cv-${r.id}`} options={(files ?? []).map((f) => ({ value: f.id, label: f.nome_amigavel }))} placeholder="Selecione" required />
                </Field>
                <Field label="Método de confirmação" name="metodo" required>
                  <Input name="metodo" id={`mv-${r.id}`} placeholder="Ex.: e-mail institucional, ofício assinado" required />
                </Field>
                <Field label="Data da confirmação" name="data" required>
                  <Input name="data" id={`dv-${r.id}`} type="date" required />
                </Field>
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                  {(["boletim", "dossie", "instagram", "portal"] as const).map((c) => (
                    <Checkbox key={c} id={`ev-${c}-${r.id}`} name="escopo" value={c} label={CHANNEL_LABELS[c]} />
                  ))}
                </div>
                <div>
                  <SubmitButton variant="secondary">Registrar validação externa</SubmitButton>
                </div>
              </ActionForm>
            </details>
          )}
          {r.validacao_status === "validado" && (canValidate || has(ctx, "publicacao.revogar")) && (
            <ActionForm action={resultTransition} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="acao" value="revogar" />
              <Field label="Motivo da revogação" name="motivo">
                <Input name="motivo" id={`rev-${r.id}`} required />
              </Field>
              <SubmitButton variant="danger" size="sm">
                Revogar validação
              </SubmitButton>
            </ActionForm>
          )}

          {canEdit && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Editar dados recebidos</summary>
              <div className="mt-3">
                <Alert tone="warning">Alterar síntese, variável, unidade, período ou limitações cria nova versão da interpretação e anula conferência e validação anteriores.</Alert>
                <ResultForm action={updateResult} exps={[{ value: e.id, label: e.codigo }]} people={people} result={r} />
              </div>
            </details>
          )}
        </CardBody>
      </Card>
    );
  }
}

function ResultForm({
  action,
  exps,
  people,
  result,
  defaults,
}: {
  action: (fd: FormData) => Promise<import("@/lib/actions").ActionResult>;
  exps: { value: string; label: string }[];
  people: { id: string; nome: string }[];
  result?: Record<string, unknown> & { id: string };
  defaults?: { experiment_id?: string };
}) {
  const r = (result ?? {}) as Record<string, string | null>;
  const k = result?.id ?? "novo";
  return (
    <ActionForm action={action} className="grid gap-3 md:grid-cols-3">
      {result && <input type="hidden" name="id" value={result.id} />}
      <Field label="Experimento" name="experiment_id" required>
        <Select name="experiment_id" id={`exp-${k}`} defaultValue={r.experiment_id ?? defaults?.experiment_id ?? ""} options={exps} placeholder="Selecione" required />
      </Field>
      <Field label="Variável observada" name="variavel" required>
        <Input name="variavel" id={`var-${k}`} defaultValue={r.variavel ?? ""} required />
      </Field>
      <Field label="Unidade" name="unidade">
        <Input name="unidade" id={`uni-${k}`} defaultValue={r.unidade ?? ""} />
      </Field>
      <Field label="Período — início" name="periodo_inicio">
        <Input name="periodo_inicio" id={`pi-${k}`} type="date" defaultValue={r.periodo_inicio ?? ""} />
      </Field>
      <Field label="Período — fim" name="periodo_fim">
        <Input name="periodo_fim" id={`pf-${k}`} type="date" defaultValue={r.periodo_fim ?? ""} />
      </Field>
      <Field label="Data de referência" name="data_referencia">
        <Input name="data_referencia" id={`dr-${k}`} type="date" defaultValue={r.data_referencia ?? ""} />
      </Field>
      <Field label="Síntese textual recebida" name="sintese" className="md:col-span-3">
        <Textarea name="sintese" id={`sin-${k}`} defaultValue={r.sintese ?? ""} rows={4} />
      </Field>
      <Field label="Situação da análise" name="situacao_analise">
        <Select name="situacao_analise" id={`sa-${k}`} defaultValue={r.situacao_analise ?? "nao_informada"} options={optionsFrom(ANALYSIS_LABELS)} />
      </Field>
      <Field label="Fonte (pessoa)" name="fonte_person_id">
        <Select name="fonte_person_id" id={`fp-${k}`} defaultValue={r.fonte_person_id ?? ""} options={people.map((p) => ({ value: p.id, label: p.nome }))} placeholder="—" />
      </Field>
      <Field label="Fonte (descrição)" name="fonte_descricao">
        <Input name="fonte_descricao" id={`fd-${k}`} defaultValue={r.fonte_descricao ?? ""} placeholder="Relatório, e-mail, reunião…" />
      </Field>
      <Field label="Data do fornecimento" name="data_fornecimento">
        <Input name="data_fornecimento" id={`df-${k}`} type="date" defaultValue={r.data_fornecimento ?? ""} />
      </Field>
      <Field label="Link do relatório original (autorizado)" name="link_original">
        <Input name="link_original" id={`lo-${k}`} type="url" defaultValue={r.link_original ?? ""} />
      </Field>
      <Field label="Referência bibliográfica" name="referencia">
        <Input name="referencia" id={`ref-${k}`} defaultValue={r.referencia ?? ""} />
      </Field>
      <Field label="Limitações informadas" name="limitacoes" className="md:col-span-3">
        <Textarea name="limitacoes" id={`lim-${k}`} defaultValue={r.limitacoes ?? ""} rows={2} />
      </Field>
      <div className="md:col-span-3">
        <SubmitButton>{result ? "Salvar nova versão" : "Registrar resultado"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
