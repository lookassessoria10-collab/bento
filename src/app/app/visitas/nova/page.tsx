import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { listExperimentOptions, listFarms, listPeople } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, CardBody, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { createVisit } from "../actions";

export const metadata: Metadata = { title: "Agendar visita" };

export default async function NewVisitPage({ searchParams }: PageProps<"/app/visitas/nova">) {
  const ctx = await requirePermission("visitas.gerenciar");
  const sp = await searchParams;
  const pre = typeof sp.experimento === "string" ? sp.experimento : "";
  const [exps, farms, people, { data: templates }] = await Promise.all([
    listExperimentOptions(ctx),
    listFarms(ctx),
    listPeople(ctx),
    ctx.supabase.from("visit_checklist_templates").select("id, nome").eq("organization_id", ctx.orgId).eq("ativo", true),
  ]);
  return (
    <>
      <PageHeader title="Agendar visita" breadcrumbs={[{ href: "/app/visitas", label: "Visitas" }, { label: "Nova" }]} />
      <Card>
        <CardBody>
          <ActionForm action={createVisit} className="grid gap-4 md:grid-cols-2">
            <Field label="Título" name="titulo" required className="md:col-span-2">
              <Input name="titulo" required placeholder="Ex.: Visita mensal de acompanhamento — novembro" />
            </Field>
            <Field label="Data e hora (horário da Bahia)" name="data_hora" required>
              <Input name="data_hora" type="datetime-local" required />
            </Field>
            <Field label="Fazenda" name="farm_id">
              <Select name="farm_id" options={farms.map((f) => ({ value: f.id, label: f.nome }))} placeholder="Não informado" defaultValue={farms[0]?.id} />
            </Field>
            <Field label="Local / ponto de encontro" name="local">
              <Input name="local" />
            </Field>
            <Field label="Roteiro (checklist)" name="checklist_template_id">
              <Select name="checklist_template_id" options={(templates ?? []).map((t) => ({ value: t.id, label: t.nome }))} placeholder="Sem roteiro" defaultValue={templates?.[0]?.id} />
            </Field>
            <Field label="Interlocutores" name="interlocutores" className="md:col-span-2">
              <Input name="interlocutores" placeholder="Pesquisadores ou técnicos que receberão a equipe" />
            </Field>
            <fieldset className="md:col-span-2">
              <legend className="text-sm font-medium">
                Experimentos previstos <span className="text-danger-600">*</span>
              </legend>
              <p className="text-xs text-muted">Cada experimento terá sua própria ficha de acompanhamento.</p>
              <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
                {exps.length === 0 && <p className="text-sm text-muted">Nenhum experimento disponível. Cadastre experimentos primeiro.</p>}
                {exps.map((e) => (
                  <Checkbox key={e.id} name="experiment_ids" value={e.id} defaultChecked={e.id === pre} label={`${e.codigo} — ${e.titulo_curto || e.titulo}`} />
                ))}
              </div>
            </fieldset>
            <fieldset className="md:col-span-2">
              <legend className="text-sm font-medium">Estudantes participantes</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {people
                  .filter((p) => p.tipo === "estudante")
                  .map((p) => (
                    <Checkbox key={p.id} name="participantes" value={p.id} label={p.nome} />
                  ))}
              </div>
            </fieldset>
            <Field label="Lembretes internos" name="lembrete" className="md:col-span-2">
              <Textarea name="lembrete" rows={2} />
            </Field>
            <div className="md:col-span-2">
              <SubmitButton>Agendar visita</SubmitButton>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
