import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input } from "@/components/ui";
import { recoverAction } from "@/app/auth-actions";

export const metadata: Metadata = { title: "Recuperar acesso", robots: { index: false } };

export default function RecoverPage() {
  return (
    <AuthCard
      title="Recuperar acesso"
      description="Informe o e-mail da sua conta. O envio depende do servidor de e-mail configurado no Supabase."
      footer={
        <Link className="text-brand-700 hover:underline" href="/login">
          Voltar para o login
        </Link>
      }
    >
      <ActionForm action={recoverAction} className="space-y-4">
        <Field label="E-mail" name="email" required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full">Enviar instruções</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
