import { Checkbox, Field, Input, Select, Textarea, optionsFrom } from "@/components/ui";
import { CHANNEL_LABELS, EDITORIAL_KIND_LABELS } from "@/lib/labels";

type Opt = { value: string; label: string };

export function EditorialItemFields({
  item,
  members,
  people,
  fixedTipo,
}: {
  item?: Record<string, unknown>;
  members: Opt[];
  people: Opt[];
  fixedTipo?: string;
}) {
  const i = (item ?? {}) as Record<string, string | string[] | boolean | null>;
  const canais = (i.canais as string[] | undefined) ?? [];
  const tipo = (i.tipo as string) ?? fixedTipo ?? "pauta";
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {item || fixedTipo ? (
        <input type="hidden" name="tipo" value={tipo} />
      ) : (
        <Field label="Tipo" name="tipo" required>
          <Select name="tipo" defaultValue={tipo} options={optionsFrom(EDITORIAL_KIND_LABELS)} />
        </Field>
      )}
      <Field label="Título" name="titulo" required className={item || fixedTipo ? "md:col-span-2" : undefined}>
        <Input name="titulo" defaultValue={(i.titulo as string) ?? ""} required />
      </Field>
      <Field label="Descrição / pauta" name="descricao" className="md:col-span-2">
        <Textarea name="descricao" rows={2} defaultValue={(i.descricao as string) ?? ""} />
      </Field>
      <Field label="Objetivo" name="objetivo">
        <Input name="objetivo" defaultValue={(i.objetivo as string) ?? ""} />
      </Field>
      <Field label="Público destinatário" name="publico">
        <Input name="publico" defaultValue={(i.publico as string) ?? ""} />
      </Field>
      <Field label="Área temática" name="area_tematica">
        <Input name="area_tematica" defaultValue={(i.area_tematica as string) ?? ""} />
      </Field>
      <Field label="Formato (Instagram)" name="formato">
        <Select
          name="formato"
          defaultValue={(i.formato as string) ?? ""}
          options={optionsFrom({ feed: "Feed", carrossel: "Carrossel", reels: "Reels", stories: "Stories" })}
          placeholder="—"
        />
      </Field>
      <Field label="Data sugerida" name="data_sugerida">
        <Input name="data_sugerida" type="date" defaultValue={(i.data_sugerida as string) ?? ""} />
      </Field>
      <Field label="Prazo" name="prazo">
        <Input name="prazo" type="date" defaultValue={(i.prazo as string) ?? ""} />
      </Field>
      <Field label="Responsável pela redação" name="responsavel_redacao">
        <Select name="responsavel_redacao" defaultValue={(i.responsavel_redacao as string) ?? ""} options={members} placeholder="—" />
      </Field>
      <Field label="Pesquisador envolvido" name="pesquisador_person_id">
        <Select name="pesquisador_person_id" defaultValue={(i.pesquisador_person_id as string) ?? ""} options={people} placeholder="—" />
      </Field>
      <Field label="Revisor científico designado" name="revisor_cientifico" hint="Usado em conteúdo educativo sem experimento vinculado.">
        <Select name="revisor_cientifico" defaultValue={(i.revisor_cientifico as string) ?? ""} options={members} placeholder="—" />
      </Field>
      <Field label="Revisor final / orientador" name="revisor_final">
        <Select name="revisor_final" defaultValue={(i.revisor_final as string) ?? ""} options={members} placeholder="—" />
      </Field>
      <Field label="Rótulos" name="labels" hint="Separe por vírgulas.">
        <Input name="labels" defaultValue={((i.labels as string[]) ?? []).join(", ")} />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium">Canais previstos</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {(["boletim", "dossie", "instagram", "portal", "outro"] as const).map((c) => (
            <Checkbox key={c} name="canais" value={c} label={CHANNEL_LABELS[c]} defaultChecked={canais.includes(c)} />
          ))}
        </div>
      </fieldset>
      <div className="md:col-span-2">
        <Checkbox
          name="requer_validacao_cientifica"
          label="Contém informação científica específica (exige validação científica antes da publicação)"
          defaultChecked={(i.requer_validacao_cientifica as boolean | undefined) ?? true}
        />
      </div>
    </div>
  );
}
