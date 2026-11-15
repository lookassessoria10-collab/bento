import { cx } from "@/components/ui";

/** Barras horizontais acessíveis: o gráfico é decorativo e a tabela equivalente fica disponível. */
export function BarList({ data, caption, total, limit = 8 }: { data: { label: string; value: number }[]; caption: string; total?: number; limit?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const sum = total ?? data.reduce((a, b) => a + b.value, 0);
  if (!data.length) return <p className="text-sm text-muted">Sem dados no período.</p>;
  return (
    <figure>
      <ul aria-hidden className="space-y-2">
        {data.slice(0, limit).map((d) => (
          <li key={d.label} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{d.label}</span>
              <span className="tabular text-muted">{d.value}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-accent-500" style={{ width: `${(d.value / max) * 100}%` }} />
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
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-card transition-shadow hover:shadow-float sm:p-5">
      <span
        aria-hidden
        className={cx(
          "absolute inset-x-0 top-0 h-1",
          tone === "warning" ? "bg-warning-600/70" : tone === "danger" ? "bg-danger-600/70" : "bg-gradient-to-r from-brand-600 to-accent-500",
        )}
      />
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p
        className={cx(
          "mt-2 font-display text-[28px] font-semibold leading-none tabular",
          tone === "warning" && "text-warning-600",
          tone === "danger" && "text-danger-600",
          tone === "default" && "text-brand-950",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

const fmtShort = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const fmtVal = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));

/**
 * Evolução de uma variável no tempo (SVG estático, sem JavaScript). Só desenha valores existentes:
 * ausências viram lacuna na linha e um "×" marcado, nunca zero nem interpolação. Ocorrências aparecem como marcos.
 */
export function LineChart({
  title,
  unidade,
  pontos,
  marcos = [],
  fonte,
}: {
  title: string;
  unidade: string | null;
  pontos: { data: string; valor: number | null; motivo?: string | null }[];
  marcos?: { data: string; label: string }[];
  fonte?: string;
}) {
  const valid = pontos.filter((p): p is { data: string; valor: number; motivo?: string | null } => p.valor !== null);
  if (valid.length === 0) return <p className="text-sm text-muted">Sem valores registrados para {title.toLowerCase()}.</p>;
  const W = 340;
  const H = 150;
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  const t = (d: string) => Date.parse(`${d}T12:00:00Z`);
  const xs = pontos.map((p) => t(p.data));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs, x0 + 86_400_000);
  const vmax = Math.max(...valid.map((p) => p.valor));
  const vmin = Math.min(0, ...valid.map((p) => p.valor));
  const top = vmax === vmin ? vmax + 1 : vmax + (vmax - vmin) * 0.1;
  const X = (d: string) => pad.l + ((t(d) - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - ((v - vmin) / (top - vmin)) * (H - pad.t - pad.b);
  // segmentos contínuos entre ausências
  const segs: string[] = [];
  let cur: string[] = [];
  for (const p of pontos) {
    if (p.valor === null) {
      if (cur.length) segs.push(cur.join(" "));
      cur = [];
    } else cur.push(`${X(p.data).toFixed(1)},${Y(p.valor).toFixed(1)}`);
  }
  if (cur.length) segs.push(cur.join(" "));
  const ticks = [vmin, (vmin + top) / 2, top].map((v) => Math.round(v * 10) / 10);
  const missing = pontos.filter((p) => p.valor === null);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted">{unidade ?? "sem unidade"}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title} (${unidade ?? "sem unidade"}): ${valid.length} valores entre ${fmtShort(pontos[0].data)} e ${fmtShort(pontos[pontos.length - 1].data)}${missing.length ? `, ${missing.length} ausente(s)` : ""}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} className="stroke-border" strokeDasharray="2 3" />
            <text x={pad.l - 4} y={Y(v) + 3} textAnchor="end" className="fill-muted text-[9px]">
              {fmtVal(v)}
            </text>
          </g>
        ))}
        {marcos.map((m) => (
          <g key={m.data + m.label}>
            <line x1={X(m.data)} x2={X(m.data)} y1={pad.t} y2={H - pad.b} className="stroke-warning-600" strokeDasharray="3 3" />
            <text x={X(m.data)} y={pad.t - 2} textAnchor="middle" className="fill-warning-600 text-[9px] font-bold">
              !<title>{`${fmtShort(m.data)} · ${m.label}`}</title>
            </text>
          </g>
        ))}
        {segs.map((pts) => (
          <polyline key={pts} points={pts} fill="none" className="stroke-brand-600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {valid.map((p) => (
          <circle key={p.data} cx={X(p.data)} cy={Y(p.valor)} r={3} className="fill-surface stroke-brand-700" strokeWidth={1.5}>
            <title>{`${fmtShort(p.data)}: ${fmtVal(p.valor)} ${unidade ?? ""}`}</title>
          </circle>
        ))}
        {missing.map((p) => (
          <text key={p.data} x={X(p.data)} y={H - pad.b - 4} textAnchor="middle" className="fill-danger-600 text-[12px] font-bold">
            ×<title>{`${fmtShort(p.data)}: valor ausente — ${p.motivo ?? "motivo não informado"}`}</title>
          </text>
        ))}
        <text x={pad.l} y={H - 8} className="fill-muted text-[9px]">
          {fmtShort(pontos[0].data)}
        </text>
        <text x={W - pad.r} y={H - 8} textAnchor="end" className="fill-muted text-[9px]">
          {fmtShort(pontos[pontos.length - 1].data)}
        </text>
      </svg>
      {(missing.length > 0 || fonte) && (
        <p className="mt-1 text-[11px] leading-snug text-muted">
          {missing.length > 0 && <span className="text-danger-600">× {missing.length} valor(es) ausente(s), mantido(s) sem preenchimento. </span>}
          {fonte}
        </p>
      )}
      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer">Ver valores</summary>
        <table className="mt-1 w-full">
          <caption className="sr-only">
            {title} por data
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Data
              </th>
              <th scope="col" className="text-right">
                Valor ({unidade ?? "—"})
              </th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={p.data}>
                <td>{fmtShort(p.data)}</td>
                <td className="text-right tabular">{p.valor === null ? `ausente (${p.motivo ?? "sem motivo"})` : fmtVal(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
