import type { Metadata } from "next";
import { Suspense } from "react";
import { requireContext, has, hasFinalReview } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { AppShell, type NavItem } from "@/components/shell";
import { Flash } from "@/components/client";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ctx = await requireContext();
  const { supabase } = ctx;

  const [{ count: unread }, { count: pendingReviews }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("lida_em", null),
    supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.orgId)
      .eq("status", "aberta")
      .eq("revisor_id", ctx.userId),
  ]);

  const nav: NavItem[] = [
    { href: "/app", label: "Visão geral", icon: "dashboard" },
    { href: "/app/experimentos", label: "Experimentos", icon: "experimentos" },
    { href: "/app/visitas", label: "Visitas e acompanhamento", icon: "visitas" },
    { href: "/app/atividades", label: "Atividades e pendências", icon: "atividades" },
    { href: "/app/resultados", label: "Resultados", icon: "resultados" },
    { href: "/app/biblioteca", label: "Biblioteca", icon: "biblioteca" },
    { href: "/app/aprovacoes", label: "Revisões e aprovações", icon: "aprovacoes", badge: pendingReviews ?? 0 },
  ];
  if (has(ctx, "editorial.criar") || hasFinalReview(ctx)) nav.push({ href: "/app/editorial", label: "Editorial", icon: "editorial" });
  nav.push({ href: "/app/relatorios", label: "Relatórios", icon: "relatorios" });
  nav.push({ href: "/app/equipe", label: "Equipe", icon: "equipe" });
  nav.push({ href: "/app/configuracoes", label: "Configurações", icon: "configuracoes" });
  nav.push({ href: "/app/ajuda", label: "Guia de uso", icon: "ajuda" });

  return (
    <AppShell
      nav={nav}
      user={{ nome: ctx.nome, papel: ctx.roles.map((r) => ROLE_LABELS[r]).join(", ") }}
      orgNome={ctx.orgNome}
      assinatura={ctx.settings?.assinatura ?? "Gestão científica | Entomo Agro 360"}
      unread={unread ?? 0}
    >
      <Suspense>
        <Flash />
      </Suspense>
      {children}
    </AppShell>
  );
}
