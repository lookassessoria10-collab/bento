"use client";

import { Eye, Printer } from "lucide-react";
import { BentoMark } from "@/components/logo";
import { LineChart } from "@/components/charts";
import { FASE_COLORS, MonthlyPairs, StackedBars } from "@/components/charts-extra";
import { cx } from "@/components/ui";
import type { ShareDto } from "@/lib/share-dto";

const FASES: [string, string][] = [
  ["planejado", "Planejado"],
  ["implantacao", "Em implantação"],
  ["andamento", "Em andamento"],
  ["concluido", "Concluído"],
  ["interrompido", "Interrompido"],
];
const TIPOS: Record<string, string> = {
  visita: "Visita de acompanhamento",
  avaliacao: "Avaliação prevista",
  reuniao_revisao: "Reunião de revisão",
  coleta: "Coleta programada",
  prazo_entrega: "Prazo de entrega",
  marco_encerramento: "Marco de encerramento",
  outro: "Outro compromisso",
};
const STATUS: Record<string, string> = { planejado: "Planejado", confirmado: "Confirmado", reagendado: "Reagendado", realizado: "Realizado", cancelado: "Cancelado" };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtD = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const fmtM = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const fmtTs = (ts: string | null) => (ts ? new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }) : "—");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function Box({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("break-inside-avoid rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5", className)}>
      <h2 className="mb-3 font-display text-[15px] font-semibold text-brand-950">{title}</h2>
      {children}
    </section>
  );
}

/** Painel externo somente leitura (mesma aparência do Bento, sem menu interno nem ações de edição). */
export function SharePanel({ dto, preview = false }: { dto: ShareDto; preview?: boolean }) {
  const ind = dto.indicadores;
  const seal = "DADOS SIMULADOS | AMBIENTE DE DEMONSTRAÇÃO";
  return (
    <div className="min-h-screen bg-background">
      {dto.demo && (
        <p role="note" className="sticky top-0 z-20 bg-warning-100 px-4 py-2 text-center text-xs font-bold tracking-wide text-warning-600 print:static">
          {seal}
        </p>
      )}
      <header className="border-b border-border bg-gradient-to-br from-brand-900 to-brand-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 sm:px-6">
          <BentoMark className="h-11 w-11 shrink-0" gap="#0F4A2E" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-500">Bento · painel compartilhado</p>
            <h1 className="font-display text-2xl font-semibold leading-tight">{dto.titulo}</h1>
            <p className="mt-0.5 text-sm text-white/70">
              {[...new Set([dto.subtitulo, dto.organizacao].filter(Boolean))].join(" · ")}
              {dto.periodo.de || dto.periodo.ate ? ` · período ${fmtD(dto.periodo.de)} a ${fmtD(dto.periodo.ate)}` : ""}
            </p>
          </div>
          {dto.secoes.includes("impressao") && (
            <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
              <Printer aria-hidden className="h-4 w-4" /> Imprimir ou salvar PDF
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
          <Eye aria-hidden className="h-4 w-4 text-brand-600" />
          Acesso de visualização. Não permite editar informações. Dados de referência: {fmtD(dto.referencia)} · última atualização: {fmtTs(dto.ultimaAtualizacao)} · consultado em {fmtTs(dto.geradoEm)}
          {preview && <strong className="text-warning-600">· pré-visualização interna</strong>}
        </p>
        {dto.demo && (
          <p className="rounded-xl border border-warning-600/30 bg-warning-100/70 px-3 py-2 text-xs font-semibold text-warning-600">
            {seal}. Ensaios, pessoas, ocorrências, revisões e indicadores são fictícios. Não há autorização institucional, validação científica real nem conclusão agronômica.
          </p>
        )}

        {dto.secoes.includes("apresentacao") && dto.demo && (
          <Box title="Como o Bento funciona">
            <ol className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Registra", "Cada ensaio tem código, objetivo, método, responsável e histórico de visitas com fonte e data."],
                ["Agenda", "Visitas, avaliações, reuniões e prazos ficam no calendário, separando o previsto do realizado."],
                ["Documenta incidentes", "Ocorrências têm gravidade, consequência e providência, sem diagnóstico automático."],
                ["Gera relatórios", "Painéis e relatórios saem dos registros, com filtros e avisos sobre a natureza dos dados."],
              ].map(([t, d], i) => (
                <li key={t} className="rounded-xl bg-surface-muted p-3">
                  <p className="font-display font-semibold text-brand-900">
                    {i + 1}. {t}
                  </p>
                  <p className="mt-1 text-muted">{d}</p>
                </li>
              ))}
            </ol>
          </Box>
        )}

        {ind && (
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Ensaios", ind.total, "no escopo compartilhado"],
              ["Em andamento", ind.porFase.andamento ?? 0, `${ind.porFase.concluido ?? 0} concluído(s)`],
              ["Visitas realizadas", ind.visitasRealizadas, "no período"],
              ...(ind.proximos30 !== null ? [["Próximos 30 dias", ind.proximos30, "compromissos previstos"]] : []),
              ...(ind.ocorrenciasAbertas !== null ? [["Ocorrências abertas", ind.ocorrenciasAbertas, "em acompanhamento"]] : []),
            ].map(([l, v, h]) => (
              <div key={String(l)} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{l}</p>
                <p className="mt-1.5 font-display text-[28px] font-semibold leading-none text-brand-950">{v}</p>
                <p className="mt-1.5 text-xs text-muted">{h}</p>
              </div>
            ))}
          </section>
        )}

        {dto.graficos && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Box title="Ensaios por cultura">
              <ul className="space-y-1.5 text-sm">
                {dto.graficos.culturas.map((c) => (
                  <li key={c.label}>
                    <span className="flex justify-between">
                      <span>{cap(c.label)}</span>
                      <span className="font-semibold">{c.value}</span>
                    </span>
                    <span className="mt-1 block h-2 rounded-full bg-surface-muted">
                      <span className="block h-2 rounded-full bg-brand-600" style={{ width: `${(c.value / Math.max(1, ...dto.graficos!.culturas.map((x) => x.value))) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </Box>
            <Box title="Situação por cultura">
              <StackedBars caption="Situação por cultura" rows={dto.graficos.statusPorCultura.map((r) => ({ ...r, label: cap(r.label) }))} series={FASES.map(([k, l]) => ({ key: k, label: l, color: FASE_COLORS[k] }))} />
            </Box>
            <Box title="Visitas por mês">
              <MonthlyPairs caption="Visitas por mês" data={dto.graficos.visitasMes} refMonth={dto.referencia.slice(0, 7)} fmt={fmtM} />
            </Box>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {dto.calendario && (
            <Box title="Próximos compromissos">
              {dto.calendario.length ? (
                <ul className="divide-y divide-border text-sm">
                  {dto.calendario.map((c, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        <span className="text-xs text-muted">{fmtD(c.data)}</span>
                        <span className="block">
                          {TIPOS[c.tipo] ?? c.tipo}
                          {c.ensaio ? ` · ${c.ensaio}` : ""}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-muted">{STATUS[c.status] ?? c.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhum compromisso previsto nos próximos 60 dias.</p>
              )}
              <p className="mt-2 text-xs text-muted">Somente data e situação. “Planejado” ainda não está confirmado.</p>
            </Box>
          )}
          {dto.ocorrencias && (
            <Box title="Ocorrências em acompanhamento">
              {dto.ocorrencias.length ? (
                <ul className="space-y-2 text-sm">
                  {dto.ocorrencias.map((o, i) => (
                    <li key={i} className="rounded-lg border border-border p-2">
                      <p className="font-medium">{o.titulo}</p>
                      <p className="text-xs text-muted">
                        {o.ensaio} · registrada em {fmtD(o.data)} · gravidade {o.gravidade}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhuma ocorrência aberta no escopo.</p>
              )}
              <p className="mt-2 text-xs text-muted">Registro descritivo; não é diagnóstico nem recomendação de manejo.</p>
            </Box>
          )}
        </div>

        {dto.resultadosDemo && dto.resultadosDemo.length > 0 && (
          <Box title="Evolução de variáveis (resultado sintético não validado cientificamente)">
            <div className="grid gap-4 md:grid-cols-2">
              {dto.resultadosDemo.map((r) => (
                <div key={r.ensaio} className="rounded-xl border border-border p-3">
                  <p className="mb-1 text-xs font-semibold text-brand-700">
                    {r.ensaio} · {r.titulo}
                  </p>
                  <LineChart title={r.variavel} unidade={r.unidade} pontos={r.pontos} fonte="Fonte: medição sintética (DADOS SIMULADOS)." />
                </div>
              ))}
            </div>
          </Box>
        )}
        {dto.resultadosReais && (
          <Box title="Resultados liberados para divulgação">
            {dto.resultadosReais.length ? (
              <ul className="space-y-2 text-sm">
                {dto.resultadosReais.map((r, i) => (
                  <li key={i} className="rounded-lg border border-border p-3">
                    <p className="font-medium">
                      {r.ensaio} · {r.variavel} {r.unidade ? `(${r.unidade})` : ""}
                    </p>
                    <p className="mt-1">{r.sintese}</p>
                    <p className="mt-1 text-xs text-muted">
                      Situação da análise: {r.situacao} · referência {fmtD(r.dataReferencia)} · fonte: {r.fonte ?? "não informada"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum resultado validado e liberado para divulgação neste escopo.</p>
            )}
          </Box>
        )}
        {dto.documentos && (
          <Box title="Documentos liberados">
            {dto.documentos.length ? (
              <ul className="space-y-1 text-sm">
                {dto.documentos.map((d, i) => (
                  <li key={i}>
                    {d.nome} <span className="text-xs text-muted">· {d.tipo} · {fmtD(d.data)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum documento liberado para divulgação neste escopo.</p>
            )}
          </Box>
        )}
        {dto.economia && (
          <Box title="Simulação de economia de tempo administrativo">
            <p className="mb-2 inline-flex rounded-full bg-warning-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning-600">Simulação. Tempos hipotéticos. Não medidos em operação real.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-1">Atividade</th>
                    <th className="text-right">Vezes/mês</th>
                    <th className="text-right">Antes (min)</th>
                    <th className="text-right">Com Bento (min)</th>
                    <th className="text-right">Diferença/mês</th>
                  </tr>
                </thead>
                <tbody>
                  {dto.economia.linhas.map((l) => (
                    <tr key={l.atividade} className="border-t border-border">
                      <td className="py-1.5">{l.atividade}</td>
                      <td className="text-right">{l.eventos_mes}</td>
                      <td className="text-right">{l.minutos_antes}</td>
                      <td className="text-right">{l.minutos_bento}</td>
                      <td className="text-right">{l.economiaMes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm">
              {dto.economia.antes} min/mês → {dto.economia.bento} min/mês · diferença de {dto.economia.economia} min ({Math.floor(dto.economia.economia / 60)}h{String(dto.economia.economia % 60).padStart(2, "0")}min) ·
              redução ilustrativa de {dto.economia.percentual?.toLocaleString("pt-BR")}%
            </p>
            <details className="mt-1 text-xs text-muted">
              <summary className="cursor-pointer">Fórmula e pressupostos</summary>
              Para cada atividade: vezes por mês × minutos por vez, antes e com o Bento. Diferença = antes − com Bento; redução = diferença ÷ antes. Premissas fictícias de uma operação-modelo. Não é
              ganho comprovado, ROI nem relação com produtividade agrícola.
            </details>
          </Box>
        )}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted sm:px-6">
        Painel gerado pelo Bento a partir dos registros autorizados para este link. {dto.demo ? seal : "Conteúdo de uso restrito ao destinatário."}
      </footer>
    </div>
  );
}
