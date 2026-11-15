"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  CheckSquare,
  ClipboardCheck,
  FlaskConical,
  FolderOpen,
  Gauge,
  FlaskRound,
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
  gestao: Gauge,
  calendario: CalendarDays,
  compartilhamentos: Share2,
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

export const NAV_SECTIONS = {
  geral: "Visão geral",
  pesquisas: "Pesquisas",
  gestao: "Gestão",
  documentos: "Documentos e comunicação",
  admin: "Administração",
  ajuda: "Ajuda",
} as const;
export type NavSection = keyof typeof NAV_SECTIONS;

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  section: NavSection;
  badge?: number;
  /** outras rotas que pertencem a este item (ex.: modos do painel) */
  match?: string[];
}

// atalhos da barra inferior (celular/tablet); o restante fica em "Mais"
const PRIMARY = ["/app", "/app/experimentos", "/app/visitas", "/app/atividades"];
const SHORT: Record<string, string> = {
  "/app": "Painel",
  "/app/experimentos": "Ensaios",
  "/app/visitas": "Acompanh.",
  "/app/atividades": "Pendências",
};

// menu recolhido (só ícones) no desktop: preferência local do navegador, lida sem divergência de hidratação
const RAIL_KEY = "bento.nav.recolhido";
const railSubscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("bento-rail", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("bento-rail", cb);
  };
};
const railRead = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
};
const railWrite = (v: boolean) => {
  try {
    localStorage.setItem(RAIL_KEY, v ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event("bento-rail"));
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
  demo = false,
  children,
}: {
  nav: NavItem[];
  user: { nome: string; papel: string };
  orgNome: string;
  assinatura: string;
  unread: number;
  /** organização de demonstração: faixa fixa de dados simulados */
  demo?: boolean;
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

  const isActive = (item: NavItem | string) => {
    const href = typeof item === "string" ? item : item.href;
    const extra = typeof item === "string" ? [] : (item.match ?? []);
    if (extra.some((m) => pathname.startsWith(m))) return true;
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  };
  const rail = useSyncExternalStore(railSubscribe, railRead, () => false);
  const current = nav.find((n) => isActive(n));
  const activeSection = current?.section ?? "geral";
  // seções abertas: a do item ativo e "Visão geral" por padrão; o usuário alterna as demais
  const [toggled, setToggled] = useState<Set<NavSection>>(() => new Set());
  const isOpen = (sec: NavSection) => (sec === activeSection || sec === "geral" || sec === "ajuda") !== toggled.has(sec);
  const toggle = (sec: NavSection) =>
    setToggled((prev) => {
      const n = new Set(prev);
      if (n.has(sec)) n.delete(sec);
      else n.add(sec);
      return n;
    });
  const sections = (Object.keys(NAV_SECTIONS) as NavSection[]).map((sec) => ({ sec, items: nav.filter((n) => n.section === sec) })).filter((g) => g.items.length);
  const primary = nav.filter((n) => PRIMARY.includes(n.href));
  const more = nav.filter((n) => !PRIMARY.includes(n.href));
  const moreBadge = more.reduce((a, n) => a + (n.badge ?? 0), 0);
  const moreActive = more.some((n) => isActive(n));

  return (
    <div className="flex min-h-screen">
      {/* ---------------- menu lateral (desktop) ---------------- */}
      <aside
        className={cx(
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-gradient-to-b from-brand-900 via-brand-900 to-brand-950 text-white transition-[width] duration-200 lg:flex",
          rail ? "w-[76px]" : "w-[268px]",
        )}
      >
        <div className={cx("flex items-center pb-4 pt-6", rail ? "flex-col gap-3 px-2" : "gap-2 px-5")}>
          <Link href="/app" aria-label="Bento — painel geral" className="block min-w-0 flex-1">
            {rail ? <BentoMark className="mx-auto h-9 w-9" gap="#0F4A2E" /> : <Logo tone="light" assinatura={assinatura} />}
          </Link>
          <button
            type="button"
            onClick={() => railWrite(!rail)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            aria-label={rail ? "Expandir menu" : "Recolher menu"}
            title={rail ? "Expandir menu" : "Recolher menu"}
          >
            {rail ? <PanelLeftOpen aria-hidden className="h-4 w-4" /> : <PanelLeftClose aria-hidden className="h-4 w-4" />}
          </button>
        </div>
        <nav aria-label="Navegação principal" className={cx("flex-1 overflow-y-auto overscroll-contain pb-2", rail ? "px-2" : "px-3")}>
          {sections.map(({ sec, items }) => {
            const open = rail || isOpen(sec);
            const listId = `nav-${sec}`;
            return (
              <div key={sec} className={cx("mb-1", rail && sec !== "geral" && "mt-2 border-t border-white/10 pt-2")}>
                {!rail && sec !== "ajuda" && (
                  <button
                    type="button"
                    onClick={() => toggle(sec)}
                    aria-expanded={open}
                    aria-controls={listId}
                    className={cx(
                      "flex w-full items-center justify-between rounded-lg px-3 pb-1 pt-3 text-left text-[10.5px] font-bold uppercase tracking-[0.12em] transition-colors hover:text-white",
                      sec === activeSection ? "text-accent-500" : "text-white/45",
                    )}
                  >
                    {NAV_SECTIONS[sec]}
                    <ChevronDown aria-hidden className={cx("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
                  </button>
                )}
                {open && (
                  <ul id={listId} className="space-y-0.5">
                    {items.map((item) => {
                      const I = ICONS[item.icon];
                      const active = isActive(item);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            title={rail ? item.label : undefined}
                            className={cx(
                              "group relative flex items-center gap-3 rounded-xl py-2.5 text-[13.5px] font-medium transition-all focus-visible:outline-2 focus-visible:outline-accent-500",
                              rail ? "justify-center px-0" : "px-3",
                              active ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                            )}
                          >
                            {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-500" />}
                            <I aria-hidden className={cx("h-[18px] w-[18px] shrink-0", active ? "text-accent-500" : "text-white/55 group-hover:text-white/80")} />
                            {rail ? <span className="sr-only">{item.label}</span> : <span className="flex-1">{item.label}</span>}
                            {item.badge ? (
                              <span
                                className={cx("rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-brand-950 tabular", rail && "absolute right-1 top-1")}
                                aria-label={`${item.badge} pendentes`}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className={cx("m-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10", rail && "hidden")}>
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
            {current && (
              <p className="hidden shrink-0 text-xs text-muted xl:block" aria-label="Seção atual">
                {NAV_SECTIONS[current.section]} <span aria-hidden>›</span> <span className="font-semibold text-foreground">{current.label}</span>
              </p>
            )}
            <form action="/app/busca" role="search" className="relative max-w-xl flex-1">
              <label htmlFor="busca-global" className="sr-only">
                Buscar nesta organização por título, código, tema ou pessoa
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="busca-global"
                name="q"
                type="search"
                placeholder="Buscar nesta organização…"
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
          {demo && (
            <p role="note" className="border-t border-warning-600/25 bg-warning-100 px-4 py-1.5 text-center text-xs font-bold text-warning-600">
              <FlaskRound aria-hidden className="mr-1.5 inline h-3.5 w-3.5" />
              AMBIENTE DE DEMONSTRAÇÃO | DADOS SIMULADOS
            </p>
          )}
        </header>
        {demo && (
          <p className="hidden text-center text-xs font-bold print:block">AMBIENTE DE DEMONSTRAÇÃO | DADOS SIMULADOS</p>
        )}

        <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      {/* ---------------- barra inferior (celular e tablet) ---------------- */}
      <nav aria-label="Navegação principal" className="no-print fixed inset-x-0 bottom-0 z-40 px-3 pb-safe lg:hidden">
        <ul className="mx-auto mb-2 flex max-w-xl items-stretch justify-between gap-1 rounded-[22px] border border-border/70 bg-surface/90 p-1.5 shadow-float backdrop-blur-xl">
          {primary.map((item) => {
            const I = ICONS[item.icon];
            const active = isActive(item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
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
            {sections.map(({ sec, items }) => {
              const rest = items.filter((i) => more.includes(i));
              if (!rest.length) return null;
              return (
                <section key={sec} className="mb-3" aria-label={NAV_SECTIONS[sec]}>
                  <h2 className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{NAV_SECTIONS[sec]}</h2>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {rest.map((item) => {
                const I = ICONS[item.icon];
                const active = isActive(item);
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
                </section>
              );
            })}
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
