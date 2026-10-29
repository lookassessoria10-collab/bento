import type { ReactNode } from "react";
import { ActionForm, DraftGuard, SubmitButton } from "@/components/client";
import { Card, CardBody, CardHeader, Checkbox, Field, Input, Select, Textarea, optionsFrom } from "@/components/ui";
import type { ActionResult } from "@/lib/actions";
import { ACCESS_LEVEL_LABELS, INFO_STATUS_LABELS, PHASE_LABELS } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

type Experiment = Partial<Database["public"]["Tables"]["experiments"]["Row"]>;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</CardBody>
    </Card>
  );
}

const PERIODICIDADE = { quinzenal: "Quinzenal", mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral", sob_demanda: "Sob demanda" };

export function ExperimentForm({
  action,
  experiment,
  people,
  farms,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  experiment?: Experiment;
  people: { value: string; label: string }[];
  farms: { id: string; nome: string; farm_areas: { id: string; nome: string; tipo: string }[] }[];
}) {
  const e = experiment ?? {};
  const join = (v?: string[] | null) => (v ?? []).join(", ");
  const areas = farms.flatMap((f) => f.farm_areas.map((a) => ({ value: a.id, label: `${f.nome} — ${a.nome}` })));
  const formId = "experiment-form";
  return (
    <ActionForm action={action} className="space-y-5" id={formId}>
      {e.id && <input type="hidden" name="id" value={e.id} />}
      <p className="text-sm text-muted">
        Campos com <span className="text-danger-600">*</span> são sempre obrigatórios. Rascunhos parciais são permitidos; ao ativar o
        acompanhamento, exigem-se pesquisador principal, data de início e objetivo geral. Não preencha por estimativa: deixe em branco
        para registrar &ldquo;Não informado&rdquo;.
      </p>

      <Section title="Identificação" description="O código EA360-XXX é gerado automaticamente pelo banco ao salvar.">
        <Field label="Título completo" name="titulo" required className="md:col-span-2">
          <Input name="titulo" defaultValue={e.titulo ?? ""} required maxLength={400} />
        </Field>
        <Field label="Título curto" name="titulo_curto">
          <Input name="titulo_curto" defaultValue={e.titulo_curto ?? ""} maxLength={120} />
        </Field>
        <Field label="Código institucional original" name="codigo_institucional" hint="Opcional e pesquisável.">
          <Input name="codigo_institucional" defaultValue={e.codigo_institucional ?? ""} />
        </Field>
        <Field label="Área temática" name="area_tematica" hint="Ex.: Entomologia agrícola, Fitotecnia, Solos…">
          <Input name="area_tematica" defaultValue={e.area_tematica ?? ""} />
        </Field>
        <Field label="Linhas de pesquisa" name="linhas_pesquisa" hint="Separe por vírgulas.">
          <Input name="linhas_pesquisa" defaultValue={join(e.linhas_pesquisa)} />
        </Field>
        <Field label="Cultura(s) agrícola(s)" name="culturas" hint="Separe por vírgulas.">
          <Input name="culturas" defaultValue={join(e.culturas)} />
        </Field>
        <Field label="Organismo(s)" name="organismos" hint="Quando pertinente.">
          <Input name="organismos" defaultValue={join(e.organismos)} />
        </Field>
        <Field label="Alvo(s) biológico(s)" name="alvos_biologicos">
          <Input name="alvos_biologicos" defaultValue={join(e.alvos_biologicos)} />
        </Field>
        <Field label="Palavras-chave" name="palavras_chave">
          <Input name="palavras_chave" defaultValue={join(e.palavras_chave)} />
        </Field>
        <Field label="Descrição" name="descricao" className="md:col-span-2">
          <Textarea name="descricao" defaultValue={e.descricao ?? ""} />
        </Field>
        <Field label="Justificativa" name="justificativa" className="md:col-span-2">
          <Textarea name="justificativa" defaultValue={e.justificativa ?? ""} />
        </Field>
        <Field label="Objetivo geral" name="objetivo_geral" className="md:col-span-2">
          <Textarea name="objetivo_geral" defaultValue={e.objetivo_geral ?? ""} />
        </Field>
        <Field label="Objetivos específicos" name="objetivos_especificos" className="md:col-span-2">
          <Textarea name="objetivos_especificos" defaultValue={e.objetivos_especificos ?? ""} />
        </Field>
        <Field label="Fonte do cadastro" name="fonte_cadastro" hint="Documento, reunião, e-mail, base institucional…">
          <Input name="fonte_cadastro" defaultValue={e.fonte_cadastro ?? ""} />
        </Field>
        <Field label="Informante" name="informante">
          <Input name="informante" defaultValue={e.informante ?? ""} />
        </Field>
        <Field label="Data da informação" name="data_informacao">
          <Input name="data_informacao" type="date" defaultValue={e.data_informacao ?? ""} />
        </Field>
        <Field label="Data de conferência" name="data_conferencia">
          <Input name="data_conferencia" type="date" defaultValue={e.data_conferencia ?? ""} />
        </Field>
      </Section>

      <Section title="Responsáveis e local" description="Coordenadas só são registradas na área física, quando disponibilizadas e autorizadas.">
        <Field label="Pesquisador principal" name="pesquisador_principal_id" hint="Cadastre pessoas em Equipe › Pessoas do projeto.">
          <Select name="pesquisador_principal_id" defaultValue={e.pesquisador_principal_id ?? ""} options={people} placeholder="Não informado" />
        </Field>
        <Field label="Fazenda / unidade" name="farm_id">
          <Select name="farm_id" defaultValue={e.farm_id ?? ""} options={farms.map((f) => ({ value: f.id, label: f.nome }))} placeholder="Não informado" />
        </Field>
        <Field label="Área, talhão ou setor" name="farm_area_id">
          <Select name="farm_area_id" defaultValue={e.farm_area_id ?? ""} options={areas} placeholder="Não informado" />
        </Field>
        <Field label="Descrição do local" name="local_descricao">
          <Input name="local_descricao" defaultValue={e.local_descricao ?? ""} />
        </Field>
      </Section>

      <Section title="Metodologia e planejamento" description="Registre apenas o que foi fornecido pelo responsável.">
        <Field label="Resumo metodológico" name="resumo_metodologico" className="md:col-span-2">
          <Textarea name="resumo_metodologico" defaultValue={e.resumo_metodologico ?? ""} rows={4} />
        </Field>
        <Field label="Protocolo / arquivo de referência" name="protocolo_referencia">
          <Input name="protocolo_referencia" defaultValue={e.protocolo_referencia ?? ""} />
        </Field>
        <Field label="Delineamento experimental" name="delineamento">
          <Input name="delineamento" defaultValue={e.delineamento ?? ""} />
        </Field>
        <Field label="Número de repetições" name="num_repeticoes">
          <Input name="num_repeticoes" type="number" min={0} defaultValue={e.num_repeticoes ?? ""} />
        </Field>
        <Field label="Unidades experimentais" name="unidades_experimentais">
          <Input name="unidades_experimentais" defaultValue={e.unidades_experimentais ?? ""} />
        </Field>
        <Field label="Data de início" name="data_inicio">
          <Input name="data_inicio" type="date" defaultValue={e.data_inicio ?? ""} />
        </Field>
        <Field label="Término previsto" name="data_termino_prevista">
          <Input name="data_termino_prevista" type="date" defaultValue={e.data_termino_prevista ?? ""} />
        </Field>
        <Field label="Término efetivo" name="data_termino_efetiva">
          <Input name="data_termino_efetiva" type="date" defaultValue={e.data_termino_efetiva ?? ""} />
        </Field>
        <Field label="Periodicidade de acompanhamento" name="periodicidade_acompanhamento">
          <Select name="periodicidade_acompanhamento" defaultValue={e.periodicidade_acompanhamento ?? "mensal"} options={optionsFrom(PERIODICIDADE)} />
        </Field>
        <Field label="Calendário de avaliações" name="calendario_avaliacoes" className="md:col-span-2">
          <Textarea name="calendario_avaliacoes" defaultValue={e.calendario_avaliacoes ?? ""} />
        </Field>
        <Field label="Observações de escopo" name="observacoes_escopo" className="md:col-span-2">
          <Textarea
            name="observacoes_escopo"
            defaultValue={e.observacoes_escopo ?? "Acompanhamento informacional; não substitui o caderno de campo nem a coleta experimental."}
          />
        </Field>
      </Section>

      <Section title="Situações" description="Situação do experimento é independente da situação de revisão e de publicação.">
        <Field label="Fase do experimento" name="fase" required>
          <Select name="fase" defaultValue={e.fase ?? "implantacao"} options={optionsFrom(PHASE_LABELS)} />
        </Field>
        <Field label="Motivo da interrupção" name="motivo_interrupcao" hint="Obrigatório quando interrompido.">
          <Input name="motivo_interrupcao" defaultValue={e.motivo_interrupcao ?? ""} />
        </Field>
        <Field label="Disponibilidade das informações" name="disponibilidade">
          <Select name="disponibilidade" defaultValue={e.disponibilidade ?? "pendente_conferencia"} options={optionsFrom(INFO_STATUS_LABELS)} />
        </Field>
        <Field label="Nível de acesso" name="nivel_acesso" hint="Nenhuma opção torna o experimento público.">
          <Select name="nivel_acesso" defaultValue={e.nivel_acesso ?? "colaboradores"} options={optionsFrom(ACCESS_LEVEL_LABELS)} />
        </Field>
        <div className="md:col-span-2">
          <Checkbox name="acompanhamento_ativo" label="Ativar acompanhamento (entra no indicador mensal de registros devidos)" defaultChecked={e.acompanhamento_ativo ?? false} />
        </div>
      </Section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
        <SubmitButton>{e.id ? "Salvar alterações" : "Cadastrar experimento"}</SubmitButton>
        <DraftGuard formId={formId} storageKey={e.id ?? "novo-experimento"} />
      </div>
    </ActionForm>
  );
}
