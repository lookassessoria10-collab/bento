"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Search,
  Settings,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
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
  // o menu móvel fecha sozinho ao navegar: fica aberto apenas para a rota em que foi aberto
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  const sidebar = (
    <nav aria-label="Navegação principal" className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Link href="/app" aria-label="Bento — visão geral">
          <Logo assinatura={assinatura} />
        </Link>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {nav.map((item) => {
          const I = ICONS[item.icon];
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-100 text-brand-900" : "text-foreground/80 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <I aria-hidden className={cx("h-4 w-4", active ? "text-brand-700" : "text-muted")} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold text-white tabular" aria-label={`${item.badge} pendentes`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-4 py-3 text-xs text-muted">
        <p className="truncate font-medium text-foreground">{orgNome}</p>
        <p>Gestão científica | Entomo Agro 360</p>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface lg:block no-print">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/30" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <button className="absolute right-3 top-4 rounded p-1 hover:bg-surface-muted" onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-5 w-5" aria-hidden />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-5 no-print">
          <button className="rounded-lg p-2 hover:bg-surface-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <form action="/app/busca" role="search" className="relative flex-1 max-w-xl">
            <label htmlFor="busca-global" className="sr-only">
              Buscar por título, código, tema ou pessoa
            </label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="busca-global"
              name="q"
              type="search"
              placeholder="Buscar título, código, tema ou pessoa…"
              className="h-9 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-sm focus:border-brand-600 focus:bg-surface focus:outline-none"
            />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/app/notificacoes" className="relative rounded-lg p-2 hover:bg-surface-muted" aria-label={`Notificações${unread ? `: ${unread} não lidas` : ""}`}>
              <Bell className="h-5 w-5 text-muted" aria-hidden />
              {unread > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-medium">{user.nome}</p>
              <p className="max-w-[180px] truncate text-xs text-muted">{user.papel}</p>
            </div>
            <form action="/auth/sair" method="post">
              <button className="rounded-lg p-2 hover:bg-surface-muted" aria-label="Sair">
                <LogOut className="h-5 w-5 text-muted" aria-hidden />
              </button>
            </form>
          </div>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
