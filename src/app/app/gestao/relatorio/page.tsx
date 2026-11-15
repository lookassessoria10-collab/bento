import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission, has } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PHASE_LABELS, RECORD_STATUS_LABELS } from "@/lib/labels";
import { loadGestao } from "@/lib/data/gestao";
import { FASE_ORDER, INCIDENT_STATUS_LABELS, SEVERITY_LABELS, applyFilters, completeness, filtersQuery, parseFilters, portfolio, seriesOf } from "@/lib/gestao";
import { LineChart } from "@/components/charts";
import { PrintButton } from "@/components/client";
import { Card, PageHeader, Table, Td, Th, buttonClass } from "@/components/ui";
import { FilterForm, TimeEconomyTable } from "../componentes";

export const metadata: Metadata = { title: "Relatório gerencial" };

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-8 break-after-avoid font-display text-lg font-semibold text-brand-950">
      {n}. {children}
    </h2>
  );
}

/** Relatório gerencial: gerado no momento da consulta a partir do banco, com os filtros aplicados. Imprimível em PDF pelo navegador. */
export default async function RelatorioGestao({ searchParams }: PageProps<"/app/gestao/relatorio">) {
  const ctx = await requirePermission("gestao.painel");
  const f = parseFilters(await searchParams);
  const load = await loadGestao(ctx);
  const { ref, demo } = load;
  const d = applyFilters(load.data, f);
  const p = portfolio(d.experiments);
  const comp = completeness(d.visits, d.measurements);
  const byId = new Map(load.data.experiments.map((e) => [e.id, e]));
  const q = filtersQuery(f);
  const geradoEm = new Date().toISOString();
  const periodo = f.de || f.ate ? `${f.de ? fmtDate(f.de) : "início"} a ${f.ate ? fmtDate(f.ate) : fmtDate(ref)}` : "todo o histórico registrado";
  const unidade = ctx.settings?.nome_projeto ?? ctx.orgNome;
  const lastVisit = (id: string) => d.visits.filter((v) => v.experiment_id === id).reduce<string | null>((m, v) => (!m || v.data > m ? v.data : m), null);
  const withSeries = d.experiments.map((e) => ({ e, series: seriesOf(d.measurements, e.id) })).filter((x) => x.series.length);
  const incomplete = d.visits.filter((v) => !v.etapa_atual || !v.observacoes_diretas || !v.proxima_acao || !v.fontes || !v.avaliacoes_realizadas);
  const ausentes = d.measurements.filter((m) => m.valor === null);
  const aguardando = d.visits.filter((v) => v.status === "preenchida" || v.status === "rascunho");
  const fonteTxt = demo ? "Fonte: dados sintéticos do pacote de demonstração (DADOS SIMULADOS)." : "Fonte: registros do Bento.";

  return (
    <article className="mx-auto max-w-5xl print:max-w-none">
      <div className="no-print">
        <PageHeader
          breadcrumbs={[{ href: "/app/gestao", label: "Painel do gestor" }, { label: "Relatório gerencial" }]}
          title="Relatório gerencial"
          description="Gerado agora, a partir do banco e dos filtros escolhidos. Use “Imprimir” para salvar em PDF."
          actions={
            <>
              <PrintButton>Imprimir ou salvar PDF</PrintButton>
              {has(ctx, "relatorios.exportar_interno") && (
                <>
                  <a className={buttonClass("secondary", "sm")} href={`/app/gestao/exportar?tipo=experimentos${q ? `&${q}` : ""}`}>
                    CSV ensaios
                  </a>
                  <a className={buttonClass("secondary", "sm")} href={`/app/gestao/exportar?tipo=ocorrencias${q ? `&${q}` : ""}`}>
                    CSV ocorrências
                  </a>
                  <a className={buttonClass("secondary", "sm")} href={`/app/gestao/exportar?tipo=medicoes${q ? `&${q}` : ""}`}>
                    CSV medições
                  </a>
                </>
              )}
            </>
          }
        />
        <Card className="mb-6 p-4">
          <FilterForm all={load.data} f={f} action="/app/gestao/relatorio" />
        </Card>
      </div>

      {/* 1. Cabeçalho */}
      <header className="rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0">
        {demo && <p className="mb-3 rounded-lg border-2 border-warning-600 bg-warning-100 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-warning-600">Relatório demonstrativo. Dados simulados.</p>}
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">Relatório gerencial de fazenda experimental</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-brand-950">{unidade}</h1>
        <p className="mt-1 text-sm text-muted">
          Período: {periodo} · Data de referência: {fmtDate(ref)} · Gerado em {fmtDateTime(geradoEm)} por {ctx.nome}
        </p>
        {q && <p className="mt-1 text-xs text-muted">Filtros: {[f.cultura && `cultura ${f.cultura}`, f.area && `área ${f.area}`, f.fase && `status ${PHASE_LABELS[f.fase as keyof typeof PHASE_LABELS]}`, f.setor && "setor selecionado", f.responsavel && "responsável selecionado"].filter(Boolean).join(" · ")}</p>}
      </header>

      {/* 2. Resumo executivo */}
      <H2 n={2}>Resumo executivo do portfólio</H2>
      <p className="text-sm leading-relaxed">
        {p.total} ensaio(s) na seleção: {FASE_ORDER.filter((x) => p.porFase[x]).map((x) => `${p.porFase[x]} ${PHASE_LABELS[x].toLowerCase()}`).join(", ")}. Principais culturas:{" "}
        {p.culturas.slice(0, 4).map((c) => `${c.label} (${c.value})`).join(", ")}. {d.visits.length} visita(s) e {d.measurements.length} medição(ões) registradas no período; {d.incidents.filter((i) => i.status === "aberta").length} ocorrência(s) aberta(s). Última gravação: {p.ultimaAtualizacao ? fmtDateTime(p.ultimaAtualizacao) : "—"}.
      </p>

      {/* 3. Quadro por experimento */}
      <H2 n={3}>Quadro por experimento</H2>
      <Table caption="Ensaios da seleção">
        <thead>
          <tr>
            <Th>Código</Th>
            <Th>Título</Th>
            <Th>Área</Th>
            <Th>Responsável</Th>
            <Th>Estado</Th>
            <Th>Acompanhamento</Th>
          </tr>
        </thead>
        <tbody>
          {d.experiments.map((e) => {
            const lv = lastVisit(e.id);
            return (
              <tr key={e.id} className="break-inside-avoid">
                <Td className="whitespace-nowrap font-mono text-xs">
                  <Link href={`/app/experimentos/${e.id}?aba=acompanhamento`} className="text-brand-700 hover:underline">
                    {e.codigo}
                  </Link>
                </Td>
                <Td>{e.titulo}</Td>
                <Td>{e.area_tematica ?? "—"}</Td>
                <Td>{e.responsavel ?? "Não informado"}</Td>
                <Td>{PHASE_LABELS[e.fase]}</Td>
                <Td className="text-xs">{lv ? `última visita ${fmtDate(lv)}` : e.fase === "planejado" ? `início previsto ${fmtDate(e.data_inicio)}` : "sem visitas no período"}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* 4. Linha do tempo */}
      <H2 n={4}>Atividades realizadas e próximas etapas</H2>
      <div className="space-y-3 text-sm">
        {d.experiments.map((e) => {
          const vs = d.visits.filter((v) => v.experiment_id === e.id).sort((a, b) => a.data.localeCompare(b.data));
          const last = vs[vs.length - 1];
          const proxima = load.proximas[e.id];
          return (
            <div key={e.id} className="break-inside-avoid rounded-xl border border-border p-3">
              <p className="font-semibold">
                {e.codigo} · {e.titulo}
              </p>
              {vs.length ? (
                <p className="text-muted">
                  Realizado: {vs.length} visita(s), de {fmtDate(vs[0].data)} a {fmtDate(last.data)}; último estádio registrado: {last.etapa_atual ?? "não informado"}.
                </p>
              ) : (
                <p className="text-muted">Nenhuma visita realizada no período.</p>
              )}
              <p>
                Próxima etapa registrada:{" "}
                {e.fase === "concluido" || e.fase === "interrompido" ? (
                  <span className="text-muted">nenhuma ({PHASE_LABELS[e.fase].toLowerCase()})</span>
                ) : (
                  <>
                    {last?.proxima_acao ?? (e.fase === "planejado" ? `início previsto em ${fmtDate(e.data_inicio)}` : "não informada")}
                    {proxima ? ` · visita agendada para ${fmtDate(proxima)}` : ""} <span className="text-muted">(previsto, ainda não realizado)</span>
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* 5. Ocorrências */}
      <H2 n={5}>Ocorrências relevantes</H2>
      {d.incidents.length ? (
        <Table caption="Ocorrências registradas">
          <thead>
            <tr>
              <Th>Ensaio</Th>
              <Th>Data</Th>
              <Th>O que foi observado</Th>
              <Th>Consequência</Th>
              <Th>Ação registrada</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {d.incidents.map((i) => (
              <tr key={i.id} className="break-inside-avoid">
                <Td className="whitespace-nowrap font-mono text-xs">{byId.get(i.experiment_id)?.codigo}</Td>
                <Td className="whitespace-nowrap">{fmtDate(i.detectada_em)}</Td>
                <Td>
                  <strong>{i.titulo}</strong> ({SEVERITY_LABELS[i.gravidade].toLowerCase()}). {i.descricao}
                </Td>
                <Td>{i.consequencia}</Td>
                <Td>{i.providencia}</Td>
                <Td>
                  {INCIDENT_STATUS_LABELS[i.status]}
                  {i.resolvida_em ? ` em ${fmtDate(i.resolvida_em)}` : " — pendente"}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-muted">Nenhuma ocorrência no período.</p>
      )}

      {/* 6. Gráficos */}
      <H2 n={6}>Evolução das métricas</H2>
      <p className="mb-3 text-xs text-muted">Apenas séries com valores registrados. {fonteTxt} Variações não indicam causa, eficácia nem superioridade de tratamento.</p>
      {withSeries.length ? (
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {withSeries.map(({ e, series }) =>
            series.map((s) => (
              <div key={`${e.id}-${s.variavel}`} className="break-inside-avoid rounded-xl border border-border p-3">
                <p className="mb-1 font-mono text-xs font-semibold text-brand-700">{e.codigo}</p>
                <LineChart
                  title={s.variavel}
                  unidade={s.unidade}
                  pontos={s.pontos}
                  marcos={d.incidents.filter((i) => i.experiment_id === e.id).map((i) => ({ data: i.detectada_em, label: i.titulo }))}
                  fonte={demo ? "Dados sintéticos." : undefined}
                />
              </div>
            )),
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Nenhuma série de medições na seleção.</p>
      )}

      {/* 7. Indicadores administrativos */}
      <H2 n={7}>Indicadores administrativos</H2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>
          Fichas de visita: {d.visits.length} ({d.visits.filter((v) => v.status === "conferida" || v.status === "finalizada").length} conferidas{demo ? ", conferência simulada" : ""})
        </li>
        <li>
          Preenchimento de registros essenciais: {comp.percentual === null ? "—" : `${comp.percentual.toLocaleString("pt-BR")}%`} ({comp.numerador}/{comp.denominador} campos)
        </li>
        <li>
          Pendências: {d.tasks.filter((t) => t.status === "concluida").length} resolvidas, {d.tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada").length} em aberto
        </li>
        <li>Relatórios/arquivos preparados: {d.files.filter((x) => x.tipo === "relatorio").length} relatórios, {d.files.length} arquivos no total</li>
      </ul>
      {demo && load.timeItems.length > 0 ? (
        <div className="mt-4 break-inside-avoid rounded-xl border border-warning-600/40 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-warning-600">Comparação ilustrativa de tempo — SIMULAÇÃO. Tempos hipotéticos. Não medidos em operação real.</p>
          <TimeEconomyTable items={load.timeItems} />
          <p className="mt-2 text-xs text-muted">Premissas: {load.timeItems[0]?.premissa ?? "hipóteses fictícias"}. Não equivale a ganho de produtividade agrícola nem a valor financeiro.</p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Estimativa de tempo não aplicada: recurso exclusivo do ambiente de demonstração.</p>
      )}

      {/* 8. Pendências de registro */}
      <H2 n={8}>Registros incompletos, interrupções e revisões pendentes</H2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>
          Ensaios interrompidos:{" "}
          {d.experiments.filter((e) => e.fase === "interrompido").map((e) => e.codigo).join(", ") || "nenhum"}
          {d.experiments.some((e) => e.fase === "interrompido") && " — sem conclusão final; dados ausentes mantidos como ausentes."}
        </li>
        <li>
          Medições ausentes (mantidas sem preenchimento): {ausentes.length}
          {ausentes.length > 0 && ` — ${ausentes.map((m) => `${byId.get(m.experiment_id)?.codigo} ${fmtDate(m.data_medicao)} ${m.variavel}: ${m.motivo_ausencia ?? "sem motivo"}`).join("; ")}`}
        </li>
        <li>Fichas com campo essencial vazio: {incomplete.length}</li>
        <li>
          Fichas aguardando conferência: {aguardando.length}
          {aguardando.length > 0 && ` (${[...new Set(aguardando.map((v) => byId.get(v.experiment_id)?.codigo))].join(", ")})`} — situação: {RECORD_STATUS_LABELS.preenchida.toLowerCase()}
        </li>
        <li>Conteúdos editoriais aguardando revisão (toda a organização): {load.editorial.filter((x) => x.status !== "publicado" && x.status !== "liberado").length}</li>
      </ul>

      {/* 9. Fonte */}
      <H2 n={9}>Fonte e data de extração</H2>
      <p className="text-sm">
        Extraído do Bento em {fmtDateTime(geradoEm)}, com as permissões de {ctx.nome} na organização “{ctx.orgNome}”. Data de referência dos registros: {fmtDate(ref)}.
      </p>
      {demo ? (
        <p className="mt-3 rounded-lg border-2 border-warning-600 bg-warning-100 p-3 text-sm font-semibold text-warning-600">
          RELATÓRIO DEMONSTRATIVO. DADOS SIMULADOS. Unidade, pessoas, ensaios, ocorrências, revisões e indicadores são fictícios. Não há autorização institucional, validação científica real nem conclusão agronômica aproveitável fora do cenário de demonstração.
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">Conteúdo interno. A divulgação de qualquer informação segue o fluxo de revisão e autorização do Bento.</p>
      )}
    </article>
  );
}
