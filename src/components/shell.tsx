"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  FlaskConical,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Newspaper,
  Search,
  Settings,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { BentoMark, Logo } from "@/components/logo";
import { cx } from "@/components/ui";

const ICONS = {
  dashboard: LayoutDashboard,
  experimentos: FlaskConical,
  visitas: CalendarCheck,
  atividades: CheckSquare,
  resultados: Sprout,
  biblioteca: FolderOpen,
  aprovacoes: ClipboardCheck,
  editorial: Newspaper,
  relatorios: BarChart3,
  equipe: Users,
  configuracoes: Settings,
  ajuda: BookOpen,
} as const;

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
}

// atalhos da barra inferior (celular/tablet); o restante fica em "Mais"
const PRIMARY = ["/app", "/app/experimentos", "/app/visitas", "/app/atividades"];
const SHORT: Record<string, string> = {
  "/app": "Início",
  "/app/experimentos": "Experimentos",
  "/app/visitas": "Visitas",
  "/app/atividades": "Atividades",
};

function initials(nome: string) {
  return (
    nome
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "B"
  );
}

export function AppShell({
  nav,
  user,
  orgNome,
  assinatura,
  unread,
  children,
}: {
  nav: NavItem[];
  user: { nome: string; papel: string };
  orgNome: string;
  assinatura: string;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // a folha "Mais" fecha sozinha ao navegar: fica aberta apenas para a rota em que foi aberta
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const primary = nav.filter((n) => PRIMARY.includes(n.href));
  const more = nav.filter((n) => !PRIMARY.includes(n.href));
  const moreBadge = more.reduce((a, n) => a + (n.badge ?? 0), 0);
  const moreActive = more.some((n) => isActive(n.href));

  return (
    <div className="flex min-h-screen">
      {/* ---------------- menu lateral (desktop) ---------------- */}
      <aside className="no-print sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col bg-gradient-to-b from-brand-900 via-brand-900 to-brand-950 text-white lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Link href="/app" aria-label="Bento — visão geral" className="block">
            <Logo tone="light" assinatura={assinatura} />
          </Link>
        </div>
        <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const I = ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                      active ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-500" />}
                    <I aria-hidden className={cx("h-[18px] w-[18px]", active ? "text-accent-500" : "text-white/55 group-hover:text-white/80")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-brand-950 tabular" aria-label={`${item.badge} pendentes`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="m-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500 font-display text-sm font-bold text-brand-950">
              {initials(user.nome)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{user.nome}</p>
              <p className="truncate text-[11px] text-white/55">{user.papel}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-white/55">
            <span className="truncate">{orgNome}</span>
            <Link href="/redefinir-senha" className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-white/10 hover:text-white" title="Trocar senha">
              <KeyRound aria-hidden className="h-3.5 w-3.5" />
              <span className="sr-only">Trocar senha</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ---------------- conteúdo ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
            <Link href="/app" className="shrink-0 lg:hidden" aria-label="Bento — início">
              <BentoMark className="h-9 w-9" />
            </Link>
            <form action="/app/busca" role="search" className="relative max-w-xl flex-1">
              <label htmlFor="busca-global" className="sr-only">
                Buscar por título, código, tema ou pessoa
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="busca-global"
                name="q"
                type="search"
                placeholder="Buscar título, código, tema ou pessoa…"
                className="h-10 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm shadow-soft transition-colors placeholder:text-muted/70 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
              />
            </form>
            <div className="ml-auto flex items-center gap-1.5">
              <Link
                href="/app/notificacoes"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface shadow-soft transition-colors hover:border-brand-500/40"
                aria-label={`Notificações${unread ? `: ${unread} não lidas` : ""}`}
              >
                <Bell className="h-[18px] w-[18px] text-brand-800" aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-accent-500 px-1 text-center text-[10px] font-bold leading-[18px] text-brand-950 ring-2 ring-background">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div className="hidden items-center gap-2.5 pl-2 sm:flex lg:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 font-display text-sm font-bold text-white">{initials(user.nome)}</span>
              </div>
              <form action="/auth/sair" method="post">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger-100 hover:text-danger-600"
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      {/* ---------------- barra inferior (celular e tablet) ---------------- */}
      <nav aria-label="Navegação principal" className="no-print fixed inset-x-0 bottom-0 z-40 px-3 pb-safe lg:hidden">
        <ul className="mx-auto mb-2 flex max-w-xl items-stretch justify-between gap-1 rounded-[22px] border border-border/70 bg-surface/90 p-1.5 shadow-float backdrop-blur-xl">
          {primary.map((item) => {
            const I = ICONS[item.icon];
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-all",
                    active ? "bg-brand-800 text-white shadow-[0_6px_16px_-6px_rgb(15_74_46/0.6)]" : "text-muted hover:bg-brand-50 hover:text-brand-900",
                  )}
                >
                  <I aria-hidden className={cx("h-5 w-5", active && "text-accent-500")} />
                  {SHORT[item.href] ?? item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-haspopup="dialog"
              className={cx(
                "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-all",
                moreActive ? "bg-brand-800 text-white" : "text-muted hover:bg-brand-50 hover:text-brand-900",
              )}
            >
              <MoreHorizontal aria-hidden className={cx("h-5 w-5", moreActive && "text-accent-500")} />
              Mais
              {moreBadge > 0 && (
                <span className="absolute right-3 top-1.5 min-w-4 rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-4 text-brand-950" aria-label={`${moreBadge} pendentes`}>
                  {moreBadge}
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm animate-bento-fade" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-surface px-4 pb-safe pt-3 shadow-float animate-bento-pop">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border-strong" aria-hidden />
            <div className="mb-4 flex items-center justify-between">
              <Logo size="sm" assinatura={false} />
              <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface-muted" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {more.map((item) => {
                const I = ICONS[item.icon];
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-[12px] font-semibold leading-tight transition-all",
                        active ? "border-brand-700 bg-brand-800 text-white" : "border-border bg-surface-muted/60 text-foreground hover:border-brand-500/40 hover:bg-brand-50",
                      )}
                    >
                      <I aria-hidden className={cx("h-5 w-5", active ? "text-accent-500" : "text-brand-700")} />
                      {item.label}
                      {item.badge ? (
                        <span className="absolute right-2 top-2 rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-brand-950">{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-muted/50 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-800 font-display text-sm font-bold text-white">{initials(user.nome)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.nome}</p>
                <p className="truncate text-xs text-muted">
                  {user.papel} · {orgNome}
                </p>
              </div>
              <Link href="/redefinir-senha" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface" aria-label="Trocar senha">
                <KeyRound className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
