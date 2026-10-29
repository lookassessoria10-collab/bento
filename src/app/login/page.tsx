import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input } from "@/components/ui";
import { loginAction, magicLinkAction } from "@/app/auth-actions";
import { getContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/app";
  const ctx = await getContext();
  if (ctx?.orgId) redirect("/app");
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  return (
    <AuthCard
      title="Entrar no Bento"
      description="Acesso restrito à equipe do Entomo Agro 360. Contas são criadas somente por convite."
      footer={
        <>
          <Link className="text-brand-700 hover:underline" href="/recuperar-acesso">
            Esqueci minha senha
          </Link>
          {" · "}
          <Link className="text-brand-700 hover:underline" href="/privacidade">
            Privacidade
          </Link>
        </>
      }
    >
      {erro && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {erro}
        </p>
      )}
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="E-mail" name="email" required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha" name="password" required>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full">Entrar</SubmitButton>
      </ActionForm>
      <details className="mt-6 rounded-lg border border-border p-3 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">Entrar com link por e-mail</summary>
        <ActionForm action={magicLinkAction} className="mt-3 space-y-3">
          <Field label="E-mail" name="email-link">
            <Input id="email-link" name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton variant="secondary" className="w-full">
            Enviar link de acesso
          </SubmitButton>
        </ActionForm>
      </details>
    </AuthCard>
  );
}
