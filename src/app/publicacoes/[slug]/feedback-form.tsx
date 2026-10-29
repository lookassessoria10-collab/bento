import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Select, Textarea, optionsFrom } from "@/components/ui";
import { submitFeedback } from "./feedback-actions";

const SCALE = { "5": "5 — muito", "4": "4", "3": "3", "2": "2", "1": "1 — nada" };

export function FeedbackForm({ publicationId }: { publicationId: string }) {
  return (
    <ActionForm action={submitFeedback} resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="publication_id" value={publicationId} />
      <div className="hidden" aria-hidden>
        <label>
          Não preencha
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Clareza" name="clareza" required>
        <Select name="clareza" options={optionsFrom(SCALE)} required />
      </Field>
      <Field label="Utilidade" name="utilidade" required>
        <Select name="utilidade" options={optionsFrom(SCALE)} required />
      </Field>
      <Field label="Perfil (opcional)" name="perfil">
        <Select name="perfil" options={optionsFrom({ produtor: "Produtor(a)", estudante: "Estudante", pesquisador: "Pesquisador(a)", tecnico: "Técnico(a)", outro: "Outro" })} placeholder="Prefiro não informar" />
      </Field>
      <Field label="Sugestão de tema" name="sugestao">
        <Textarea name="sugestao" rows={1} maxLength={1000} />
      </Field>
      <Field label="Comentário" name="comentario" className="sm:col-span-2" hint="Não inclua dados pessoais.">
        <Textarea name="comentario" rows={2} maxLength={2000} />
      </Field>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="consentimento" required className="mt-1 h-4 w-4 accent-brand-700" />
        Concordo que esta resposta anônima seja usada para avaliar e melhorar o projeto, conforme a política de privacidade.
      </label>
      <div>
        <SubmitButton>Enviar</SubmitButton>
      </div>
    </ActionForm>
  );
}
