import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/labels";
import { INCIDENT_STATUS_LABELS, SEVERITY_LABELS, fmtMinutes, timeEconomy, type GData, type GExperiment, type GFilters, type GIncident, type TimeItem } from "@/lib/gestao";
import { Badge, Input, Select, Table, Td, Th, buttonClass, cx } from "@/components/ui";

export const DEMO_LABEL = "Ambiente de demonstração · Dados simulados";

/** Selo inequívoco dos dados simulados (aparece em telas, relatório e impressão). */
export function DemoSeal({ className }: { className?: string }) {
  return (
    <p role="note" className={cx("rounded-xl border border-warning-600/30 bg-warning-100/70 px-3 py-2 text-xs font-semibold text-warning-600", className)}>
      DADOS SIMULADOS — ensaios, pessoas, ocorrências, revisões e indicadores fictícios, criados para demonstração. Não são resultados agronômicos reais, recomendações ou aprovações científicas.
    </p>
  );
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export function FilterForm({ all, f, action, hidden }: { all: GData; f: GFilters; action: string; hidden?: Record<string, string> }) {
  const E = all.experiments;
  const people = uniq(E.filter((e) => e.responsavel_id).map((e) => `${e.responsavel_id}|${e.responsavel}`)).map((s) => s.split("|"));
  const setores = uniq(E.filter((e) => e.setor_id).map((e) => `${e.setor_id}|${e.setor}`))
    .map((s) => s.split("|"))
    .sort((a, b) => a[1].localeCompare(b[1]));
  return (
    <form action={action} role="search" aria-label="Filtrar painel" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="col-span-1 flex flex-col gap-1 text-xs font-semibold text-muted">
        De
        <Input type="date" name="de" defaultValue={f.de} />
      </label>
      <label className="col-span-1 flex flex-col gap-1 text-xs font-semibold text-muted">
        Até
        <Input type="date" name="ate" defaultValue={f.ate} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Cultura
        <Select name="cultura" defaultValue={f.cultura} placeholder="Todas" options={uniq(E.flatMap((e) => e.culturas)).sort().map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Tema / área
        <Select name="area" defaultValue={f.area} placeholder="Todas" options={uniq(E.map((e) => e.area_tematica).filter((a): a is string => !!a)).sort().map((a) => ({ value: a, label: a }))} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Status
        <Select name="fase" defaultValue={f.fase} placeholder="Todos" options={Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label }))} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Responsável
        <Select name="responsavel" defaultValue={f.responsavel} placeholder="Todos" options={people.map(([value, label]) => ({ value, label }))} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Setor
        <Select name="setor" defaultValue={f.setor} placeholder="Todos" options={setores.map(([value, label]) => ({ value, label }))} />
      </label>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-1">
        <button className={buttonClass("primary", "md", "flex-1")}>Aplicar</button>
        <Link href={action} className={buttonClass("ghost", "md")}>
          Limpar
        </Link>
      </div>
    </form>
  );
}

export const SEVERITY_TONE = { critica: "danger", alta: "danger", media: "warning", baixa: "info" } as const;

export function ExperimentLink({ e, aba }: { e: GExperiment; aba?: string }) {
  return (
    <Link href={`/app/experimentos/${e.id}${aba ? `?aba=${aba}` : ""}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
      {e.codigo}
    </Link>
  );
}

export function IncidentCard({
  i,
  e,
  dias,
  proxima,
}: {
  i: GIncident;
  e: GExperiment;
  dias?: number;
  proxima: string | null;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SEVERITY_TONE[i.gravidade]}>Gravidade {SEVERITY_LABELS[i.gravidade].toLowerCase()}</Badge>
        <Badge tone={i.status === "aberta" ? "warning" : "brand"}>{INCIDENT_STATUS_LABELS[i.status]}</Badge>
        {dias !== undefined && <span className="text-xs text-muted">{dias} dia(s) desde a detecção</span>}
      </div>
      <h3 className="mt-2 font-display text-[15px] font-semibold text-brand-950">{i.titulo}</h3>
      <p className="mt-0.5 text-xs text-muted">
        <ExperimentLink e={e} aba="acompanhamento" /> · {e.titulo} · detectada em {fmtDate(i.detectada_em)}
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">O que aconteceu</dt>
          <dd>{i.descricao ?? "Não informado"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Impacto no registro</dt>
          <dd>{i.consequencia ?? "Não informado"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Providência registrada</dt>
          <dd>{i.providencia ?? "Não informada"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Responsável · próxima verificação</dt>
          <dd>
            {i.responsavel_descricao ?? (
              <>
                <span className="text-muted">Não informado na ocorrência</span> (responsável pelo ensaio: {e.responsavel ?? "não informado"})
              </>
            )}
            {" · "}
            {i.proxima_verificacao ? fmtDate(i.proxima_verificacao) : proxima ? `próxima visita do ensaio em ${fmtDate(proxima)}` : <span className="text-muted">não agendada</span>}
          </dd>
        </div>
      </dl>
      <Link href={`/app/experimentos/${e.id}?aba=acompanhamento`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <FlaskConical aria-hidden className="h-4 w-4" /> Abrir ficha e histórico completo
      </Link>
    </article>
  );
}

/** Tabela da estimativa (SIMULAÇÃO). Recalculada a partir das premissas armazenadas. */
export function TimeEconomyTable({ items }: { items: TimeItem[] }) {
  const t = timeEconomy(items);
  return (
    <>
      <Table caption="Estimativa simulada de tempo administrativo por atividade">
        <thead>
          <tr>
            <Th>Atividade</Th>
            <Th className="text-right">Vezes/mês</Th>
            <Th className="text-right">Antes (min/vez)</Th>
            <Th className="text-right">Com Bento (min/vez)</Th>
            <Th className="text-right">Antes/mês</Th>
            <Th className="text-right">Com Bento/mês</Th>
            <Th className="text-right">Diferença</Th>
          </tr>
        </thead>
        <tbody>
          {t.linhas.map((l) => (
            <tr key={l.atividade}>
              <Td>{l.atividade}</Td>
              <Td className="text-right tabular">{l.eventos_mes}</Td>
              <Td className="text-right tabular">{l.minutos_antes}</Td>
              <Td className="text-right tabular">{l.minutos_bento}</Td>
              <Td className="text-right tabular">{l.antesMes} min</Td>
              <Td className="text-right tabular">{l.bentoMes} min</Td>
              <Td className="text-right tabular">{l.economiaMes} min</Td>
            </tr>
          ))}
          <tr className="font-semibold">
            <Td>Total mensal</Td>
            <Td />
            <Td />
            <Td />
            <Td className="text-right tabular">{t.antes} min</Td>
            <Td className="text-right tabular">{t.bento} min</Td>
            <Td className="text-right tabular">
              {t.economia} min ({fmtMinutes(t.economia)})
            </Td>
          </tr>
        </tbody>
      </Table>
      <p className="mt-3 text-sm">
        Redução estimada de tempo administrativo: <strong className="tabular">{t.percentual === null ? "—" : `${t.percentual.toLocaleString("pt-BR")}%`}</strong> sobre o tempo de referência deste exercício.
      </p>
      <p className="mt-1 text-xs text-muted">
        Fórmula: para cada atividade, vezes por mês × minutos por vez, antes e com o Bento. Diferença = antes − com Bento; redução = diferença ÷ antes × 100. Valor financeiro não é calculado.
      </p>
    </>
  );
}
