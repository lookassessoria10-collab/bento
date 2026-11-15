// Gráficos dos painéis (SVG/HTML estáticos, sem dependência externa e sem JavaScript no cliente).
// Cada gráfico tem rótulos com valores, legenda textual e uma tabela equivalente em "Ver valores".
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

export const FASE_COLORS: Record<string, string> = {
  planejado: "#9fb3a6",
  implantacao: "#5b8fb0",
  andamento: "#2a8150",
  concluido: "#0f4a2e",
  interrompido: "#c2410c",
};

function ValuesTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-xs text-muted">
      <summary className="cursor-pointer">Ver valores</summary>
      <table className="mt-1 w-full">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={i ? "text-right" : "text-left"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[0])}>
              {r.map((c, i) => (
                <td key={i} className={i ? "text-right tabular" : ""}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cx("inline-block h-2.5 w-2.5 rounded-sm", i.dashed && "border-2 border-dashed bg-transparent")} style={i.dashed ? { borderColor: i.color } : { background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Barras horizontais clicáveis (filtram a página pelo valor). */
export function ClickableBars({ data, hrefFor, caption, active }: { data: { label: string; value: number; key: string }[]; hrefFor: (key: string) => string; caption: string; active?: string }) {
  if (!data.length) return <p className="text-sm text-muted">Sem registros na seleção.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.key}>
            <Link
              href={hrefFor(d.key)}
              aria-current={active === d.key ? "true" : undefined}
              title={`${d.label}: ${d.value} — clique para filtrar`}
              className={cx("block rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-brand-50 focus-visible:outline-2", active === d.key && "bg-brand-50 ring-1 ring-brand-500/40")}
            >
              <span className="flex justify-between gap-2">
                <span className="truncate">{d.label}</span>
                <span className="tabular font-semibold">{d.value}</span>
              </span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-muted">
                <span className="block h-2 rounded-full bg-gradient-to-r from-brand-600 to-accent-500" style={{ width: `${(d.value / max) * 100}%` }} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ValuesTable caption={caption} head={["Categoria", "Quantidade"]} rows={data.map((d) => [d.label, d.value])} />
    </figure>
  );
}

/** Barras empilhadas horizontais (ex.: situação dos ensaios por cultura). */
export function StackedBars({
  rows,
  series,
  caption,
}: {
  rows: { label: string; counts: Record<string, number>; total: number }[];
  series: { key: string; label: string; color: string }[];
  caption: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted">Sem registros na seleção.</p>;
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <figure>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{r.label}</span>
              <span className="tabular text-muted">{r.total}</span>
            </div>
            <div className="mt-1 flex h-3.5 overflow-hidden rounded-md bg-surface-muted" style={{ width: `${Math.max(12, (r.total / max) * 100)}%` }}>
              {series
                .filter((s) => r.counts[s.key])
                .map((s) => (
                  <span key={s.key} className="block h-full" style={{ flexGrow: r.counts[s.key], background: s.color }} title={`${r.label} · ${s.label}: ${r.counts[s.key]}`} />
                ))}
            </div>
          </li>
        ))}
      </ul>
      <Legend items={series} />
      <ValuesTable caption={caption} head={["Categoria", ...series.map((s) => s.label), "Total"]} rows={rows.map((r) => [r.label, ...series.map((s) => r.counts[s.key] ?? 0), r.total])} />
    </figure>
  );
}

/** Série mensal com duas colunas por mês: realizadas (cheia) × agendadas (tracejada). */
export function MonthlyPairs({ data, caption, refMonth, fmt }: { data: { mes: string; realizadas: number; agendadas: number }[]; caption: string; refMonth?: string; fmt: (mes: string) => string }) {
  if (!data.length) return <p className="text-sm text-muted">Sem visitas registradas ou agendadas.</p>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.realizadas, d.agendadas)));
  const W = Math.max(320, data.length * 34 + 30);
  const H = 160;
  const pad = { l: 26, b: 28, t: 14 };
  const bw = 11;
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.b - pad.t);
  return (
    <figure className="min-w-0">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto min-w-[320px] w-full" role="img" aria-label={`${caption}: ${data.length} meses`}>
          {[...new Set([0, Math.round(max / 2), max])].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - 4} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="2 3" />
              <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" className="fill-muted text-[9px]">
                {v}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.l + 8 + i * 34;
            const isRef = refMonth === d.mes;
            return (
              <g key={d.mes}>
                {isRef && <rect x={x - 4} y={pad.t - 6} width={bw * 2 + 10} height={H - pad.b - pad.t + 6} className="fill-accent-100" rx={4} />}
                <rect x={x} y={y(d.realizadas)} width={bw} height={H - pad.b - y(d.realizadas)} className="fill-brand-700" rx={2}>
                  <title>{`${fmt(d.mes)} · realizadas: ${d.realizadas}`}</title>
                </rect>
                <rect x={x + bw + 2} y={y(d.agendadas)} width={bw} height={H - pad.b - y(d.agendadas)} className="fill-transparent stroke-info-600" strokeDasharray="3 2" strokeWidth={1.5} rx={2}>
                  <title>{`${fmt(d.mes)} · agendadas (não realizadas): ${d.agendadas}`}</title>
                </rect>
                {d.realizadas > 0 && (
                  <text x={x + bw / 2} y={y(d.realizadas) - 3} textAnchor="middle" className="fill-foreground text-[8px]">
                    {d.realizadas}
                  </text>
                )}
                {d.agendadas > 0 && (
                  <text x={x + bw * 1.5 + 2} y={y(d.agendadas) - 3} textAnchor="middle" className="fill-info-600 text-[8px]">
                    {d.agendadas}
                  </text>
                )}
                <text x={x + bw} y={H - 10} textAnchor="middle" className="fill-muted text-[8.5px]">
                  {`${d.mes.slice(5, 7)}/${d.mes.slice(2, 4)}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Legend
        items={[
          { label: "Realizadas", color: "#1b6b43" },
          { label: "Agendadas (planejadas, confirmadas ou reagendadas)", color: "#1f5f8b", dashed: true },
          ...(refMonth ? [{ label: "Mês de referência", color: "#eef7df" }] : []),
        ]}
      />
      <ValuesTable caption={caption} head={["Mês", "Realizadas", "Agendadas"]} rows={data.map((d) => [fmt(d.mes), d.realizadas, d.agendadas])} />
    </figure>
  );
}

/** Mapa de calor semanal (contagens reais, período explícito). */
export function WeekHeatmap({ data, caption }: { data: { semana: string; n: number }[]; caption: string }) {
  if (!data.length) return <p className="text-sm text-muted">Sem visitas realizadas.</p>;
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <figure>
      <ul className="flex flex-wrap gap-1" aria-hidden>
        {data.map((d) => (
          <li
            key={d.semana}
            className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-semibold"
            style={{ background: `rgb(42 129 80 / ${0.15 + (d.n / max) * 0.85})`, color: d.n / max > 0.5 ? "#fff" : "#14211a" }}
            title={`Semana de ${d.semana.slice(8, 10)}/${d.semana.slice(5, 7)}/${d.semana.slice(0, 4)}: ${d.n} visita(s)`}
          >
            {d.n}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted">
        Semanas com visita realizada, de {data[0].semana.split("-").reverse().join("/")} a {data[data.length - 1].semana.split("-").reverse().join("/")}. Semanas sem visita não aparecem.
      </p>
      <ValuesTable caption={caption} head={["Semana (início)", "Visitas"]} rows={data.map((d) => [d.semana.split("-").reverse().join("/"), d.n])} />
    </figure>
  );
}

/** Cronograma: barra prevista (clara) × período com visitas registradas (escura). */
export function Gantt({
  rows,
  caption,
  refDate,
}: {
  rows: { key: string; label: ReactNode; previstoInicio: string | null; previstoFim: string | null; realInicio: string | null; realFim: string | null }[];
  caption: string;
  refDate: string;
}) {
  const dates = rows.flatMap((r) => [r.previstoInicio, r.previstoFim, r.realInicio, r.realFim]).filter((d): d is string => !!d);
  if (!dates.length) return <p className="text-sm text-muted">Sem datas previstas cadastradas.</p>;
  const t = (d: string) => Date.parse(`${d}T12:00:00Z`);
  const min = Math.min(...dates.map(t), t(refDate));
  const max = Math.max(...dates.map(t), t(refDate));
  const pct = (d: string) => ((t(d) - min) / Math.max(1, max - min)) * 100;
  return (
    <figure>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[110px_1fr] items-center gap-2 text-xs sm:grid-cols-[140px_1fr]">
            <span className="truncate">{r.label}</span>
            <span className="relative block h-4 rounded bg-surface-muted">
              {r.previstoInicio && r.previstoFim && (
                <span className="absolute inset-y-0 rounded bg-brand-100" style={{ left: `${pct(r.previstoInicio)}%`, width: `${Math.max(1, pct(r.previstoFim) - pct(r.previstoInicio))}%` }} title={`Previsto: ${r.previstoInicio} a ${r.previstoFim}`} />
              )}
              {r.realInicio && r.realFim && (
                <span className="absolute inset-y-1 rounded bg-brand-700" style={{ left: `${pct(r.realInicio)}%`, width: `${Math.max(0.8, pct(r.realFim) - pct(r.realInicio))}%` }} title={`Visitas registradas: ${r.realInicio} a ${r.realFim}`} />
              )}
              <span aria-hidden className="absolute inset-y-[-3px] w-px bg-warning-600" style={{ left: `${pct(refDate)}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <Legend
        items={[
          { label: "Período previsto (início → término previsto)", color: "#cfe5d4" },
          { label: "Primeira → última visita registrada", color: "#1b6b43" },
          { label: "Data de referência", color: "#b45309" },
        ]}
      />
      <ValuesTable
        caption={caption}
        head={["Ensaio", "Previsto", "Registrado"]}
        rows={rows.map((r) => [r.key, `${r.previstoInicio ?? "—"} a ${r.previstoFim ?? "—"}`, r.realInicio ? `${r.realInicio} a ${r.realFim}` : "sem visitas"])}
      />
    </figure>
  );
}

/** Gráfico de pontos por grupo (ex.: leitura por tratamento; cada ponto é uma repetição). Sem média, sem teste. */
export function DotPlot({ groups, unidade, caption }: { groups: { label: string; values: { v: number; tag: string }[] }[]; unidade: string; caption: string }) {
  const all = groups.flatMap((g) => g.values.map((x) => x.v));
  if (!all.length) return <p className="text-sm text-muted">Sem leituras para comparar.</p>;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const W = 340;
  const rowH = 26;
  const H = groups.length * rowH + 24;
  const x = (v: number) => 120 + ((v - lo) / span) * (W - 135);
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${caption}: ${all.length} leituras em ${groups.length} grupos`}>
        {groups.map((g, i) => (
          <g key={g.label}>
            <text x={4} y={i * rowH + 17} className="fill-foreground text-[9px]">
              {g.label.length > 22 ? `${g.label.slice(0, 21)}…` : g.label}
            </text>
            <line x1={120} x2={W - 15} y1={i * rowH + 14} y2={i * rowH + 14} className="stroke-border" />
            {g.values.map((p) => (
              <circle key={p.tag} cx={x(p.v)} cy={i * rowH + 14} r={4} className="fill-brand-600/70 stroke-brand-800">
                <title>{`${g.label} · ${p.tag}: ${p.v} ${unidade}`}</title>
              </circle>
            ))}
          </g>
        ))}
        <text x={120} y={H - 4} className="fill-muted text-[9px]">
          {lo} {unidade}
        </text>
        <text x={W - 15} y={H - 4} textAnchor="end" className="fill-muted text-[9px]">
          {hi} {unidade}
        </text>
      </svg>
      <ValuesTable caption={caption} head={["Grupo", "Leituras"]} rows={groups.map((g) => [g.label, g.values.map((x) => `${x.tag}: ${x.v}`).join(" · ")])} />
    </figure>
  );
}

/** Funil de etapas (barras decrescentes com contagem por etapa). */
export function Funnel({ steps, caption }: { steps: { label: string; value: number }[]; caption: string }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <figure>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className="grid grid-cols-[150px_1fr_32px] items-center gap-2 text-sm">
            <span className="truncate text-xs">
              {i + 1}. {s.label}
            </span>
            <span className="block h-3 rounded bg-surface-muted">
              <span className="block h-3 rounded bg-brand-600" style={{ width: `${(s.value / max) * 100}%` }} />
            </span>
            <span className="tabular text-right font-semibold">{s.value}</span>
          </li>
        ))}
      </ol>
      <ValuesTable caption={caption} head={["Etapa", "Itens"]} rows={steps.map((s) => [s.label, s.value])} />
    </figure>
  );
}
