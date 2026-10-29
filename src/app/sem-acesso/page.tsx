import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Sem acesso", robots: { index: false } };

export default function NoAccessPage() {
  return (
    <AuthCard title="Acesso não ativo">
      <Alert tone="warning">
        Sua conta existe, mas não há participação ativa em nenhuma organização (convite pendente, acesso suspenso ou removido). Procure a administração do projeto.
      </Alert>
      <form action="/auth/sair" method="post" className="mt-4">
        <button className="text-sm text-brand-700 underline">Sair</button>
      </form>
    </AuthCard>
  );
}
