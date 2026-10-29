import { Checkbox, Field, Input, Select, Textarea, optionsFrom } from "@/components/ui";
import { CHANNEL_LABELS, FILE_KIND_LABELS, USE_AUTH_LABELS } from "@/lib/labels";

type Opt = { value: string; label: string };

export function FileMetaFields({
  file,
  experiments,
  defaults,
  suggested,
}: {
  file?: Record<string, unknown>;
  experiments: Opt[];
  defaults?: { experiment_id?: string; tipo?: string };
  suggested?: string;
}) {
  const f = (file ?? {}) as Record<string, string | string[] | null>;
  const canais = (f.autorizacao_canais as string[] | null) ?? [];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Nome amigável" name="nome_amigavel" required hint="Para vários arquivos, será numerado automaticamente.">
        <Input name="nome_amigavel" defaultValue={(f.nome_amigavel as string) ?? ""} required />
      </Field>
      <Field label="Nome sugerido pela convenção" name="nome_sugerido" hint="Ex.: EA360-001-2026-11-15-foto01 (o nome original é preservado).">
        <Input name="nome_sugerido" defaultValue={(f.nome_sugerido as string) ?? suggested ?? ""} />
      </Field>
      <Field label="Tipo" name="tipo" required>
        <Select name="tipo" defaultValue={(f.tipo as string) ?? defaults?.tipo ?? "relatorio"} options={optionsFrom(FILE_KIND_LABELS)} />
      </Field>
      <Field label="Experimento" name="experiment_id">
        <Select name="experiment_id" defaultValue={(f.experiment_id as string) ?? defaults?.experiment_id ?? ""} options={experiments} placeholder="Sem vínculo" />
      </Field>
      <Field label="Autoria" name="autoria" hint="Obrigatória para fotografias.">
        <Input name="autoria" defaultValue={(f.autoria as string) ?? ""} />
      </Field>
      <Field label="Origem" name="origem">
        <Input name="origem" defaultValue={(f.origem as string) ?? ""} placeholder="Pesquisador, visita, fazenda…" />
      </Field>
      <Field label="Data do arquivo" name="data_arquivo" hint="Obrigatória para fotografias.">
        <Input name="data_arquivo" type="date" defaultValue={(f.data_arquivo as string) ?? ""} />
      </Field>
      <Field label="Licença / termo de uso" name="licenca">
        <Input name="licenca" defaultValue={(f.licenca as string) ?? ""} />
      </Field>
      <Field label="Legenda" name="legenda" className="md:col-span-2" hint="Obrigatória para fotografias.">
        <Textarea name="legenda" rows={2} defaultValue={(f.legenda as string) ?? ""} />
      </Field>
      <Field label="Autorização de uso" name="autorizacao_uso">
        <Select name="autorizacao_uso" defaultValue={(f.autorizacao_uso as string) ?? "uso_interno"} options={optionsFrom(USE_AUTH_LABELS)} />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium">Canais autorizados</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {(["interno", "boletim", "dossie", "instagram", "portal"] as const).map((c) => (
            <Checkbox key={c} name="autorizacao_canais" value={c} label={CHANNEL_LABELS[c]} defaultChecked={canais.includes(c)} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">Canais externos exigem &ldquo;Divulgação autorizada&rdquo;.</p>
      </fieldset>
    </div>
  );
}
