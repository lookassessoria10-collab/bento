import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input } from "@/components/ui";
import { updatePasswordAction } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Definir nova senha", robots: { index: false } };

export default async function ResetPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?erro=" + encodeURIComponent("Link de recuperação inválido ou expirado."));
  return (
    <AuthCard title="Definir nova senha" description="Use ao menos 10 caracteres, com letras e números.">
      <ActionForm action={updatePasswordAction} className="space-y-4">
        <Field label="Nova senha" name="password" required>
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="Confirmar senha" name="confirm" required>
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <SubmitButton className="w-full">Salvar nova senha</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
