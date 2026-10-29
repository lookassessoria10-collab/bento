import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, optionsFrom } from "@/components/ui";
import type { ActionResult } from "@/lib/actions";
import { PRIORITY_LABELS, TASK_CATEGORY_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";

type Opt = { value: string; label: string };

export function TaskForm({
  action,
  task,
  members,
  experiments,
  editorial,
  defaults,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  task?: Record<string, string | null> & { id?: string };
  members: Opt[];
  experiments: Opt[];
  editorial: Opt[];
  defaults?: { experiment_id?: string; responsavel_id?: string };
}) {
  const t = task ?? {};
  return (
    <ActionForm action={action} className="grid gap-4 md:grid-cols-2" resetOnSuccess={!task}>
      {t.id && <input type="hidden" name="id" value={t.id} />}
      {t.visit_record_id && <input type="hidden" name="visit_record_id" value={t.visit_record_id} />}
      <Field label="Título" name="titulo" required className="md:col-span-2">
        <Input name="titulo" defaultValue={t.titulo ?? ""} required />
      </Field>
      <Field label="Descrição" name="descricao" className="md:col-span-2">
        <Textarea name="descricao" defaultValue={t.descricao ?? ""} />
      </Field>
      <Field label="Categoria / frente" name="categoria">
        <Select name="categoria" defaultValue={t.categoria ?? "geral"} options={optionsFrom(TASK_CATEGORY_LABELS)} />
      </Field>
      <Field label="Prioridade" name="prioridade">
        <Select name="prioridade" defaultValue={t.prioridade ?? "media"} options={optionsFrom(PRIORITY_LABELS)} />
      </Field>
      <Field label="Situação" name="status">
        <Select name="status" defaultValue={t.status ?? "a_fazer"} options={optionsFrom(TASK_STATUS_LABELS)} />
      </Field>
      <Field label="Motivo do bloqueio / pendência" name="motivo_bloqueio" hint="Obrigatório quando aguardando terceiro.">
        <Input name="motivo_bloqueio" defaultValue={t.motivo_bloqueio ?? ""} />
      </Field>
      <Field label="Responsável" name="responsavel_id">
        <Select name="responsavel_id" defaultValue={t.responsavel_id ?? defaults?.responsavel_id ?? ""} options={members} placeholder="Sem responsável" />
      </Field>
      <Field label="Colaborador" name="colaborador_id">
        <Select name="colaborador_id" defaultValue={t.colaborador_id ?? ""} options={members} placeholder="—" />
      </Field>
      <Field label="Início" name="inicio">
        <Input name="inicio" type="date" defaultValue={t.inicio ?? ""} />
      </Field>
      <Field label="Prazo" name="prazo">
        <Input name="prazo" type="date" defaultValue={t.prazo ?? ""} />
      </Field>
      <Field label="Último contato" name="ultimo_contato">
        <Input name="ultimo_contato" type="date" defaultValue={t.ultimo_contato ?? ""} />
      </Field>
      <Field label="Experimento vinculado" name="experiment_id">
        <Select name="experiment_id" defaultValue={t.experiment_id ?? defaults?.experiment_id ?? ""} options={experiments} placeholder="Nenhum" />
      </Field>
      <Field label="Conteúdo editorial vinculado" name="editorial_item_id">
        <Select name="editorial_item_id" defaultValue={t.editorial_item_id ?? ""} options={editorial} placeholder="Nenhum" />
      </Field>
      <div className="md:col-span-2">
        <SubmitButton>{t.id ? "Salvar atividade" : "Criar atividade"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
