import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Circle, CircleDot, Clock, Info, Lock, Sprout, XCircle } from "lucide-react";

export const cx = clsx;

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-700 to-brand-800 text-white border border-brand-800 shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_6px_16px_-6px_rgb(15_74_46/0.55)] hover:from-brand-800 hover:to-brand-900",
  secondary: "bg-surface text-foreground border border-border-strong shadow-soft hover:border-brand-500/50 hover:bg-brand-50/60",
  ghost: "bg-transparent text-foreground border border-transparent hover:bg-brand-50",
  danger: "bg-danger-600 text-white border border-danger-600 shadow-soft hover:opacity-90",
  accent: "bg-accent-500 text-brand-950 border border-accent-500 shadow-[0_6px_16px_-6px_rgb(124_180_70/0.7)] hover:bg-accent-400",
};
const sizes = { sm: "h-8 px-3 text-[13px] rounded-lg", md: "h-10 px-4 text-sm rounded-xl", lg: "h-12 px-6 text-[15px] rounded-xl" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-2xl border border-border/80 bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-display text-[15.5px] font-semibold text-brand-950">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("px-5 py-4", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { href?: string; label: string }[];
}) {
  return (
    <header className="mb-7">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Trilha de navegação" className="mb-2.5 text-[13px] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-border-strong">
                    /
                  </span>
                )}
                {b.href ? (
                  <Link href={b.href} className="transition-colors hover:text-brand-700">
                    {b.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="max-w-[40ch] truncate font-medium text-foreground">
                    {b.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-brand-950 sm:text-[30px]">{title}</h1>
          {description && <div className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100">
        <Sprout aria-hidden className="h-6 w-6 text-brand-600" />
      </span>
      <p className="font-display text-[15px] font-semibold text-brand-950">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const map = {
    info: { c: "bg-info-100/70 border-info-600/20", i: "text-info-600", I: Info },
    warning: { c: "bg-warning-100/80 border-warning-600/20", i: "text-warning-600", I: AlertTriangle },
    danger: { c: "bg-danger-100/80 border-danger-600/20", i: "text-danger-600", I: XCircle },
    success: { c: "bg-brand-50 border-brand-500/25", i: "text-brand-600", I: CheckCircle2 },
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", map.c)}>
      <map.I aria-hidden className={cx("mt-0.5 h-4 w-4 shrink-0", map.i)} />
      <div className="text-foreground">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && "mt-0.5", "leading-relaxed text-foreground/80")}>{children}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Situações (texto + ícone, nunca apenas cor)
// ---------------------------------------------------------------------------
type Tone = "neutral" | "brand" | "accent" | "warning" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-muted text-foreground/80 ring-border",
  brand: "bg-brand-50 text-brand-800 ring-brand-100",
  accent: "bg-accent-100 text-accent-600 ring-accent-400/40",
  warning: "bg-warning-100 text-warning-600 ring-warning-600/15",
  danger: "bg-danger-100 text-danger-600 ring-danger-600/15",
  info: "bg-info-100 text-info-600 ring-info-600/15",
};
const toneIcon: Record<Tone, typeof Circle> = {
  neutral: Circle,
  brand: CheckCircle2,
  accent: CircleDot,
  warning: Clock,
  danger: XCircle,
  info: Info,
};

export function Badge({ tone = "neutral", children, icon = true }: { tone?: Tone; children: ReactNode; icon?: boolean }) {
  const I = toneIcon[tone];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", toneClass[tone])}>
      {icon && <I aria-hidden className="h-3 w-3" />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  rascunho: "neutral",
  em_conferencia: "info",
  aguardando_validacao: "warning",
  aguardando_revisao_final: "warning",
  devolvido: "danger",
  devolvida: "danger",
  validado: "brand",
  liberado: "brand",
  publicado: "brand",
  revogado: "danger",
  implantacao: "info",
  andamento: "brand",
  concluido: "neutral",
  interrompido: "danger",
  planejada: "info",
  confirmada: "brand",
  realizada: "brand",
  adiada: "warning",
  cancelada: "neutral",
  preenchida: "warning",
  conferida: "brand",
  finalizada: "brand",
  a_fazer: "neutral",
  em_andamento: "info",
  aguardando_terceiro: "warning",
  concluida: "brand",
  pendente: "warning",
  conferido: "brand",
  nao_validado: "neutral",
  em_alinhamento: "warning",
  autorizado: "brand",
  negado: "danger",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label}</Badge>;
}

export function DemoBadge() {
  return (
    <span
      title="Registro fictício criado apenas para demonstração"
      className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2.5 py-0.5 text-xs font-semibold text-warning-600 ring-1 ring-inset ring-warning-600/25"
    >
      <AlertTriangle aria-hidden className="h-3 w-3" /> Dados ilustrativos
    </span>
  );
}

export function PrivateBadge({ children = "Restrito" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
      <Lock aria-hidden className="h-3 w-3" /> {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------
const inputBase =
  "block w-full rounded-xl border border-border-strong bg-surface px-3.5 text-sm text-foreground shadow-soft transition-colors placeholder:text-muted/60 hover:border-brand-500/40 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-surface-muted disabled:text-muted aria-[invalid=true]:border-danger-600 aria-[invalid=true]:ring-danger-600/15";

export function Field({
  label,
  name,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {/* rótulo envolve o controle: associação implícita mesmo com ids personalizados */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-foreground/90">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-600" aria-hidden>
              *
            </span>
          )}
          {required && <span className="sr-only"> (obrigatório)</span>}
        </span>
        {children}
      </label>
      {hint && !error && (
        <p id={`${name}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-xs font-medium text-danger-600" data-field-error={name}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input id={props.id ?? props.name} className={cx(inputBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea id={props.id ?? props.name} rows={rows} className={cx(inputBase, "py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select id={props.id ?? props.name} className={cx(inputBase, "h-11 pr-9", className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  const id = props.id ?? `${props.name}-${String(props.value ?? "on")}`;
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input id={id} type="checkbox" className="h-[18px] w-[18px] rounded-md border-border-strong accent-brand-700" {...props} />
      {label}
    </label>
  );
}

export function optionsFrom(map: Record<string, string>) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

// ---------------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------------
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-brand-50/50">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cx("border-b border-border bg-surface-muted/60 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cx("border-b border-border/70 px-4 py-3 align-top", className)} {...props} />;
}

export function Tabs({ tabs, current }: { tabs: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <nav aria-label="Seções" className="-mx-1 mb-6 overflow-x-auto px-1 pb-1">
      <ul className="inline-flex min-w-max gap-1 rounded-2xl border border-border/80 bg-surface p-1 shadow-soft">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.key === current ? "page" : undefined}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all",
                t.key === current ? "bg-brand-800 text-white shadow-[0_4px_12px_-4px_rgb(15_74_46/0.5)]" : "text-muted hover:bg-brand-50 hover:text-brand-900",
              )}
            >
              {t.label}
              {t.count != null && (
                <span className={cx("rounded-full px-1.5 text-[11px] tabular", t.key === current ? "bg-white/20" : "bg-surface-muted")}>{t.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{i.label}</dt>
          <dd className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
            {i.value === null || i.value === undefined || i.value === "" ? <span className="text-muted/80">Não informado</span> : i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceLine({ fonte, data, autor }: { fonte?: string | null; data?: string | null; autor?: string | null }) {
  return (
    <p className="text-xs text-muted">
      Fonte: {fonte || "Não informada"} · Referência: {data || "Não informada"}
      {autor ? ` · Registrado por ${autor}` : ""}
    </p>
  );
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} registro(s)</p>;
  return (
    <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">
        Página {page} de {pages} · {total} registro(s)
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <LinkButton size="sm" href={hrefFor(page - 1)}>
            Anterior
          </LinkButton>
        )}
        {page < pages && (
          <LinkButton size="sm" href={hrefFor(page + 1)}>
            Próxima
          </LinkButton>
        )}
      </div>
    </nav>
  );
}
