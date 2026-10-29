import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Circle, CircleDot, Clock, FlaskConical, Info, Lock, XCircle } from "lucide-react";

export const cx = clsx;

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 border border-brand-700",
  secondary: "bg-surface text-foreground hover:bg-surface-muted border border-border-strong",
  ghost: "bg-transparent text-foreground hover:bg-surface-muted border border-transparent",
  danger: "bg-danger-600 text-white hover:opacity-90 border border-danger-600",
  accent: "bg-accent-500 text-white hover:bg-accent-600 border border-accent-500",
};
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
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
  return <section className={cx("rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(20,54,40,0.04)]", className)} {...props} />;
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
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
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Trilha de navegação" className="mb-2 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>/</span>}
                {b.href ? (
                  <Link href={b.href} className="hover:text-brand-700 hover:underline">
                    {b.label}
                  </Link>
                ) : (
                  <span aria-current="page">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-10 text-center">
      <FlaskConical aria-hidden className="mb-3 h-8 w-8 text-brand-500" />
      <p className="font-medium text-foreground">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
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
    info: { c: "bg-info-100 border-info-600/30 text-info-600", I: Info },
    warning: { c: "bg-warning-100 border-warning-600/30 text-warning-600", I: AlertTriangle },
    danger: { c: "bg-danger-100 border-danger-600/30 text-danger-600", I: XCircle },
    success: { c: "bg-brand-50 border-brand-600/30 text-brand-700", I: CheckCircle2 },
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-lg border px-4 py-3 text-sm", map.c)}>
      <map.I aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-foreground">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx(title && "mt-0.5", "text-foreground/80")}>{children}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Situações (texto + ícone, nunca apenas cor)
// ---------------------------------------------------------------------------
type Tone = "neutral" | "brand" | "accent" | "warning" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-muted text-foreground border-border",
  brand: "bg-brand-50 text-brand-800 border-brand-100",
  accent: "bg-accent-100 text-accent-600 border-accent-100",
  warning: "bg-warning-100 text-warning-600 border-warning-100",
  danger: "bg-danger-100 text-danger-600 border-danger-100",
  info: "bg-info-100 text-info-600 border-info-100",
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
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", toneClass[tone])}>
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
      className="inline-flex items-center gap-1 rounded-full border border-accent-500 bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-600"
    >
      <AlertTriangle aria-hidden className="h-3 w-3" /> Dados ilustrativos
    </span>
  );
}

export function PrivateBadge({ children = "Restrito" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Lock aria-hidden className="h-3 w-3" /> {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------
const inputBase =
  "block w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-surface-muted aria-[invalid=true]:border-danger-600";

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
    <div className={cx("flex flex-col gap-1", className)}>
      {/* rótulo envolve o controle: associação implícita mesmo com ids personalizados */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">
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
        <p id={`${name}-hint`} className="text-xs text-muted">
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
  return <input id={props.id ?? props.name} className={cx(inputBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea id={props.id ?? props.name} rows={rows} className={cx(inputBase, "py-2", className)} {...props} />;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select id={props.id ?? props.name} className={cx(inputBase, "h-10 pr-8", className)} {...props}>
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
    <label htmlFor={id} className="inline-flex items-center gap-2 text-sm">
      <input id={id} type="checkbox" className="h-4 w-4 rounded border-border-strong accent-brand-700" {...props} />
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
      <table className="w-full min-w-[640px] border-collapse text-sm">
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
      className={cx("border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cx("border-b border-border px-3 py-2.5 align-top", className)} {...props} />;
}

export function Tabs({ tabs, current }: { tabs: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <nav aria-label="Seções" className="-mx-1 mb-5 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.key === current ? "page" : undefined}
              className={cx(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium",
                t.key === current ? "border-brand-700 text-brand-800" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {t.label}
              {t.count != null && <span className="rounded-full bg-surface-muted px-1.5 text-xs tabular">{t.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground">
            {i.value === null || i.value === undefined || i.value === "" ? <span className="text-muted">Não informado</span> : i.value}
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
        {page > 1 && <LinkButton size="sm" href={hrefFor(page - 1)}>Anterior</LinkButton>}
        {page < pages && <LinkButton size="sm" href={hrefFor(page + 1)}>Próxima</LinkButton>}
      </div>
    </nav>
  );
}
