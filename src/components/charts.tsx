import { cx } from "@/components/ui";

/** Barras horizontais acessíveis: o gráfico é decorativo e a tabela equivalente fica disponível. */
export function BarList({ data, caption, total }: { data: { label: string; value: number }[]; caption: string; total?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const sum = total ?? data.reduce((a, b) => a + b.value, 0);
  if (!data.length) return <p className="text-sm text-muted">Sem dados no período.</p>;
  return (
    <figure>
      <ul aria-hidden className="space-y-2">
        {data.slice(0, 8).map((d) => (
          <li key={d.label} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{d.label}</span>
              <span className="tabular text-muted">{d.value}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-surface-muted">
              <div className="h-2 rounded bg-brand-500" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">Ver tabela</summary>
        <table className="mt-1 w-full">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Categoria
              </th>
              <th scope="col" className="text-right">
                Quantidade
              </th>
              <th scope="col" className="text-right">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="text-right tabular">{d.value}</td>
                <td className="text-right tabular">{sum ? Math.round((d.value / sum) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: number | string; hint?: string; tone?: "default" | "warning" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold tabular", tone === "warning" && "text-warning-600", tone === "danger" && "text-danger-600", tone === "default" && "text-brand-900")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
