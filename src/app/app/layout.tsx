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

  // Menu agrupado por seção. As URLs antigas continuam as mesmas; cada página repete a checagem de permissão no servidor.
  const nav: NavItem[] = [
    { href: "/app", label: "Painel geral", icon: "dashboard", section: "geral", match: ["/app/gestao", "/app/painel"] },
    { href: "/app/calendario", label: "Calendário", icon: "calendario", section: "geral" },
    { href: "/app/relatorios", label: "Relatórios", icon: "relatorios", section: "geral" },
    { href: "/app/experimentos", label: "Ensaios", icon: "experimentos", section: "pesquisas" },
    { href: "/app/visitas", label: "Acompanhamentos", icon: "visitas", section: "pesquisas" },
    { href: "/app/resultados", label: "Resultados", icon: "resultados", section: "pesquisas" },
    { href: "/app/atividades", label: "Pendências", icon: "atividades", section: "gestao" },
    { href: "/app/aprovacoes", label: "Aprovações", icon: "aprovacoes", section: "gestao", badge: pendingReviews ?? 0 },
  ];
  if (has(ctx, "compartilhamentos.gerenciar")) nav.push({ href: "/app/compartilhamentos", label: "Compartilhamentos", icon: "compartilhamentos", section: "gestao" });
  nav.push({ href: "/app/biblioteca", label: "Arquivos", icon: "biblioteca", section: "documentos" });
  if (has(ctx, "editorial.criar") || hasFinalReview(ctx)) nav.push({ href: "/app/editorial", label: "Publicações", icon: "editorial", section: "documentos" });
  nav.push({ href: "/app/equipe", label: "Equipe", icon: "equipe", section: "admin" });
  nav.push({ href: "/app/configuracoes", label: "Configurações", icon: "configuracoes", section: "admin" });
  nav.push({ href: "/app/ajuda", label: "Guia de uso", icon: "ajuda", section: "ajuda" });

  return (
    <AppShell
      nav={nav}
      user={{ nome: ctx.nome, papel: ctx.roles.map((r) => ROLE_LABELS[r]).join(", ") }}
      orgNome={ctx.orgNome}
      assinatura={ctx.settings?.assinatura ?? "Gestão científica | Entomo Agro 360"}
      unread={unread ?? 0}
      demo={ctx.orgIsDemo}
    >
      <Suspense>
        <Flash />
      </Suspense>
      {children}
    </AppShell>
  );
}
