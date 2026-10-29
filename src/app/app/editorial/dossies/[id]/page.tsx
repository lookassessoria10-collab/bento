import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/labels";
import { STATUS_LABELS, isEditable } from "@/lib/workflow";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, Checkbox, Field, Input, PageHeader, Select, StatusBadge, Tabs, Textarea, optionsFrom } from "@/components/ui";
import { WorkflowPanel } from "../../workflow-panel";
import { setDossierExperiments, updateDossier } from "../../actions";

export const metadata: Metadata = { title: "Dossiê" };

const STEPS = [
  ["periodo", "1. Período e escopo"],
  ["selecao", "2. Seleção"],
  ["lacunas", "3. Dados e lacunas"],
  ["sintese", "4. Síntese e referências"],
  ["aprovacao", "5. Aprovação, pré-visualização e PDF"],
] as const;

export default async function DossierPage({ params, searchParams }: PageProps<"/app/editorial/dossies/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const step = STEPS.some(([k]) => k === sp.etapa) ? (sp.etapa as string) : "periodo";
  const ctx = await requireContext();
  const { data: d } = await ctx.supabase.from("dossiers").select("*, editorial_items(id, titulo, status)").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!d) notFound();
  const item = d.editorial_items as unknown as { id: string; titulo: string; status: keyof typeof STATUS_LABELS };
  const editable = has(ctx, "editorial.criar") && isEditable(item.status);
  const base = `/app/editorial/dossies/${id}`;

  const { data: selected } = await ctx.supabase.from("dossier_experiments").select("experiment_id, incluir_resultados").eq("dossier_id", id).order("ordem");
  const selectedIds = new Set((selected ?? []).map((s) => s.experiment_id));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { href: "/app/editorial", label: "Editorial" },
          { href: "/app/editorial/dossies", label: "Dossiês" },
          { label: item.titulo },
        ]}
        title={item.titulo}
        description={<StatusBadge status={item.status} label={STATUS_LABELS[item.status]} />}
      />
      <Tabs current={step} tabs={STEPS.map(([k, l]) => ({ key: k, label: l, href: `${base}?etapa=${k}` }))} />
      {!editable && step !== "aprovacao" && <div className="mb-4"><Alert tone="warning">Dossiê fixado para revisão. Alterações cancelam o ciclo em andamento.</Alert></div>}

      {(step === "periodo" || step === "sintese") && (
        <Card>
          <CardBody>
            <ActionForm action={updateDossier} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              {step === "periodo" ? (
                <>
                  <Field label="Período — início" name="periodo_inicio">
                    <Input name="periodo_inicio" type="date" defaultValue={d.periodo_inicio ?? ""} />
                  </Field>
                  <Field label="Período — fim" name="periodo_fim">
                    <Input name="periodo_fim" type="date" defaultValue={d.periodo_fim ?? ""} />
                  </Field>
                  <Field label="Finalidade" name="finalidade" hint="A versão de divulgação inclui apenas resultados validados para 'Dossiê' e arquivos autorizados.">
                    <Select name="finalidade" defaultValue={d.finalidade} options={optionsFrom({ interno: "Dossiê interno de trabalho", divulgacao: "Versão autorizada de divulgação" })} />
                  </Field>
                  <Field label="Apresentação (Fazenda Meraki e Entomo Agro 360)" name="apresentacao" className="md:col-span-2" hint="Sujeita às autorizações institucionais registradas em Configurações.">
                    <Textarea name="apresentacao" rows={4} defaultValue={d.apresentacao ?? ""} />
                  </Field>
                  <Field label="Escopo e áreas abrangidas" name="escopo" className="md:col-span-2">
                    <Textarea name="escopo" defaultValue={d.escopo ?? ""} />
                  </Field>
                  <Field label="Critérios de inclusão" name="criterios_inclusao">
                    <Textarea name="criterios_inclusao" defaultValue={d.criterios_inclusao ?? ""} />
                  </Field>
                  <Field label="Método de coleta informacional" name="metodo_coleta">
                    <Textarea name="metodo_coleta" defaultValue={d.metodo_coleta ?? ""} />
                  </Field>
                  <input type="hidden" name="sintese" value={d.sintese ?? ""} />
                  <input type="hidden" name="referencias" value={d.referencias ?? ""} />
                </>
              ) : (
                <>
                  {(["periodo_inicio", "periodo_fim", "finalidade", "apresentacao", "escopo", "criterios_inclusao", "metodo_coleta"] as const).map((k) => (
                    <input key={k} type="hidden" name={k} value={(d[k] as string | null) ?? ""} />
                  ))}
                  <Field label="Síntese do conjunto" name="sintese" className="md:col-span-2" hint="Somente tendências administrativas/descritivas verificáveis; sem comparações científicas.">
                    <Textarea name="sintese" rows={6} defaultValue={d.sintese ?? ""} />
                  </Field>
                  <Field label="Referências e anexos" name="referencias" className="md:col-span-2">
                    <Textarea name="referencias" rows={4} defaultValue={d.referencias ?? ""} />
                  </Field>
                </>
              )}
              {editable && (
                <div>
                  <SubmitButton>Salvar e continuar</SubmitButton>
                </div>
              )}
            </ActionForm>
          </CardBody>
        </Card>
      )}

      {step === "selecao" && <Selection />}
      {step === "lacunas" && <Gaps />}
      {step === "aprovacao" && (
        <div className="grid gap-5 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader title="Pré-visualização" description="Abra o PDF do rascunho atual para conferir antes de fixar a versão." />
            <CardBody className="space-y-3 text-sm">
              <p>
                <Link className="text-brand-700 underline" href={`/app/editorial/${item.id}/pdf?rascunho=atual`} target="_blank">
                  Abrir PDF de pré-visualização (rascunho atual)
                </Link>
              </p>
              <p className="text-muted">Experimentos selecionados: {selectedIds.size}. A versão de divulgação nunca incorpora contatos, coordenadas ou campos privados — o snapshot é montado no banco apenas com campos públicos.</p>
            </CardBody>
          </Card>
          <div className="xl:col-span-2">
            <WorkflowPanel ctx={ctx} itemId={item.id} />
          </div>
        </div>
      )}
    </>
  );

  async function Selection() {
    let q = ctx.supabase
      .from("experiments")
      .select("id, codigo, titulo, titulo_curto, fase, data_inicio, data_termino_efetiva, is_demo")
      .eq("organization_id", ctx.orgId)
      .order("codigo_seq");
    if (d!.periodo_fim) q = q.or(`data_inicio.is.null,data_inicio.lte.${d!.periodo_fim}`);
    if (d!.periodo_inicio) q = q.or(`data_termino_efetiva.is.null,data_termino_efetiva.gte.${d!.periodo_inicio}`);
    const { data: exps } = await q;
    const withRes = new Set((selected ?? []).filter((s) => s.incluir_resultados).map((s) => s.experiment_id));
    return (
      <Card>
        <CardHeader title="Experimentos do período" description={`Filtrados pelo período ${fmtDate(d!.periodo_inicio)} a ${fmtDate(d!.periodo_fim)}. A seleção é sempre humana.`} />
        <CardBody>
          <ActionForm action={setDossierExperiments} className="space-y-3">
            <input type="hidden" name="dossier_id" value={id} />
            <fieldset disabled={!editable} className="space-y-2">
              {(exps ?? []).map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-2">
                  <Checkbox name="experiment_ids" value={e.id} defaultChecked={selectedIds.has(e.id)} label={`${e.codigo} — ${e.titulo_curto || e.titulo} (${PHASE_LABELS[e.fase]})${e.is_demo ? " [ilustrativo]" : ""}`} />
                  <Checkbox id={`res-${e.id}`} name="incluir_resultados" value={e.id} defaultChecked={withRes.has(e.id) || !selectedIds.has(e.id)} label="Incluir resultados disponíveis" />
                </div>
              ))}
              {!exps?.length && <p className="text-sm text-muted">Nenhum experimento no período.</p>}
            </fieldset>
            {editable && <SubmitButton>Salvar seleção</SubmitButton>}
          </ActionForm>
        </CardBody>
      </Card>
    );
  }

  async function Gaps() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return <Alert tone="info">Selecione experimentos na etapa 2.</Alert>;
    const [{ data: exps }, { data: results }, { data: files }] = await Promise.all([
      ctx.supabase.from("experiments").select("id, codigo, fonte_cadastro, data_informacao, objetivo_geral, resumo_metodologico, pesquisador_principal_id, updated_at, disponibilidade").in("id", ids),
      ctx.supabase.from("result_summaries").select("id, experiment_id, variavel, validacao_status, escopo_divulgacao, fonte_descricao, fonte_person_id").in("experiment_id", ids),
      ctx.supabase.from("files").select("id, experiment_id, nome_amigavel, tipo, autorizacao_uso, autorizacao_canais").in("experiment_id", ids).is("deleted_at", null),
    ]);
    const warnings: { codigo: string; msg: string }[] = [];
    const sixMonthsAgo = new Date(Date.now() - 180 * 864e5).toISOString();
    for (const e of exps ?? []) {
      if (!e.fonte_cadastro) warnings.push({ codigo: e.codigo, msg: "Fonte do cadastro ausente" });
      if (!e.objetivo_geral) warnings.push({ codigo: e.codigo, msg: "Objetivo não informado" });
      if (!e.resumo_metodologico) warnings.push({ codigo: e.codigo, msg: "Método resumido não informado" });
      if (!e.pesquisador_principal_id) warnings.push({ codigo: e.codigo, msg: "Responsável não informado" });
      if (e.disponibilidade !== "fornecido") warnings.push({ codigo: e.codigo, msg: "Informações ainda não conferidas/fornecidas" });
      if (e.updated_at < sixMonthsAgo) warnings.push({ codigo: e.codigo, msg: "Dados possivelmente desatualizados (mais de 6 meses)" });
      for (const r of (results ?? []).filter((x) => x.experiment_id === e.id)) {
        if (r.validacao_status !== "validado") warnings.push({ codigo: e.codigo, msg: `Resultado "${r.variavel}" não validado (fica fora da versão de divulgação)` });
        else if (!r.escopo_divulgacao.includes("dossie")) warnings.push({ codigo: e.codigo, msg: `Resultado "${r.variavel}" sem autorização para dossiê` });
        if (!r.fonte_descricao && !r.fonte_person_id) warnings.push({ codigo: e.codigo, msg: `Resultado "${r.variavel}" sem fonte` });
      }
      for (const f of (files ?? []).filter((x) => x.experiment_id === e.id)) {
        if (f.autorizacao_uso !== "divulgacao_autorizada" || !f.autorizacao_canais.includes("dossie"))
          warnings.push({ codigo: e.codigo, msg: `Arquivo "${f.nome_amigavel}" sem autorização para dossiê (não entra na versão de divulgação)` });
      }
    }
    return (
      <Card>
        <CardHeader title="Revisão de lacunas" description="Avisos para conferência humana antes de fixar a versão." />
        <CardBody>
          {warnings.length === 0 ? (
            <Alert tone="success">Nenhuma lacuna identificada nos experimentos selecionados.</Alert>
          ) : (
            <ul className="space-y-1 text-sm">
              {warnings.map((w, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{w.codigo}</span> — {w.msg}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    );
  }
}
