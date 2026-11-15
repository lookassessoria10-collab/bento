import Link from "next/link";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { METRICAS, type MetricaKey } from "@/lib/metricas";
import { filtersQuery, type GData, type GFilters } from "@/lib/gestao";
import { calendarEntries, type Entry, type PEvent, type PSchedule } from "@/lib/painel";
import { cx } from "@/components/ui";

export const MODES = [
  { key: "geral", href: "/app", label: "Visão geral", perm: null },
  { key: "gestor", href: "/app/gestao", label: "Gestor da fazenda", perm: "gestao.painel" },
  { key: "operacional", href: "/app/painel/operacional", label: "Operacional", perm: null },
  { key: "tecnico", href: "/app/painel/tecnico", label: "Técnico-científico", perm: null },
  { key: "documentos", href: "/app/painel/documentos", label: "Documentos e aprovações", perm: null },
] as const;
export type ModeKey = (typeof MODES)[number]["key"];

/** Abas dos modos do Painel geral; os filtros acompanham a troca de modo. */
export function ModeTabs({ current, f, canGestor }: { current: ModeKey; f?: GFilters; canGestor: boolean }) {
  const q = f ? filtersQuery(f) : "";
  return (
    <nav aria-label="Modos do painel" className="no-print mb-5 overflow-x-auto">
      <ul className="flex min-w-max gap-1 rounded-2xl border border-border bg-surface p-1 shadow-soft">
        {MODES.filter((m) => m.perm === null || canGestor).map((m) => (
          <li key={m.key}>
            <Link
              href={`${m.href}${q ? `?${q}` : ""}`}
              aria-current={current === m.key ? "page" : undefined}
              className={cx(
                "block rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                current === m.key ? "bg-brand-800 text-white" : "text-muted hover:bg-brand-50 hover:text-brand-900",
              )}
            >
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Definição acessível de um indicador (catálogo de métricas). */
export function MetricInfo({ k }: { k: MetricaKey }) {
  const m = METRICAS[k];
  return (
    <details className="group relative mt-1 text-xs text-muted">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-brand-700">
        <CircleHelp aria-hidden className="h-3.5 w-3.5" /> Como é calculado
      </summary>
      <div className="mt-1 rounded-lg border border-border bg-surface p-2 text-foreground shadow-soft">
        <p>{m.definicao}</p>
        <p className="mt-1 font-mono text-[11px] text-muted">{m.formula}</p>
        <p className="mt-1 text-[11px] text-muted">
          Unidade: {m.unidade} · Fonte: {m.fonte}
        </p>
      </div>
    </details>
  );
}

/** Cartão de indicador com rótulo, valor, contexto, origem (link) e definição. */
export function Kpi({
  label,
  value,
  hint,
  href,
  metric,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  metric?: MetricaKey;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-card">
      <span aria-hidden className={cx("absolute inset-x-0 top-0 h-1", tone === "warning" ? "bg-warning-600/70" : tone === "danger" ? "bg-danger-600/70" : "bg-gradient-to-r from-brand-600 to-accent-500")} />
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className={cx("mt-2 font-display text-[28px] font-semibold leading-none tabular", tone === "warning" ? "text-warning-600" : tone === "danger" ? "text-danger-600" : "text-brand-950")}>
        {href ? (
          <Link href={href} className="hover:underline" title="Abrir os registros de origem">
            {value}
          </Link>
        ) : (
          value
        )}
      </p>
      {hint && <p className="mt-2 text-xs leading-snug text-muted">{hint}</p>}
      {metric && <MetricInfo k={metric} />}
    </div>
  );
}

/** Restringe a agenda aos ensaios da seleção (compromissos sem ensaio entram só sem filtros de ensaio). */
export function entriesFor(schedules: PSchedule[], events: PEvent[], d: GData, all: GData): Entry[] {
  const ids = new Set(d.experiments.map((e) => e.id));
  const filtered = d.experiments.length !== all.experiments.length;
  return calendarEntries(schedules, events).filter((e) => (e.experiment_ids.length ? e.experiment_ids.some((id) => ids.has(id)) : !filtered));
}

export const STATUS_TONE: Record<string, string> = {
  planejado: "bg-surface-muted text-foreground/80 ring-border",
  confirmado: "bg-info-100 text-info-600 ring-info-600/15",
  realizado: "bg-brand-50 text-brand-800 ring-brand-100",
  reagendado: "bg-warning-100 text-warning-600 ring-warning-600/15",
  cancelado: "bg-danger-100 text-danger-600 ring-danger-600/15",
};
