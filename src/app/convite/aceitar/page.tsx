import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Field, Input } from "@/components/ui";
import { acceptInviteLoggedAction, acceptInviteNewAction } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aceitar convite", robots: { index: false } };

export default async function AcceptInvitePage({ searchParams }: PageProps<"/convite/aceitar">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  if (!token) {
    return (
      <AuthCard title="Convite inválido">
        <Alert tone="danger">O link do convite está incompleto. Solicite um novo convite à administração do projeto.</Alert>
      </AuthCard>
    );
  }

  if (email) {
    return (
      <AuthCard title="Aceitar convite" description={`Você está conectado(a) como ${email}. O convite precisa ter sido emitido para este e-mail.`}>
        <ActionForm action={acceptInviteLoggedAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="w-full">Aceitar convite</SubmitButton>
        </ActionForm>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Criar acesso ao Bento"
      description="Defina seu nome e uma senha. O e-mail é o mesmo para o qual o convite foi enviado."
    >
      <ActionForm action={acceptInviteNewAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="Nome completo" name="nome" required>
          <Input name="nome" autoComplete="name" required />
        </Field>
        <Field label="Senha" name="password" required hint="Mínimo de 10 caracteres, com letras e números.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="Confirmar senha" name="confirm" required>
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <SubmitButton className="w-full">Criar acesso e aceitar convite</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-xs text-muted">Já possui conta? Entre primeiro e depois abra o link do convite novamente.</p>
    </AuthCard>
  );
}
