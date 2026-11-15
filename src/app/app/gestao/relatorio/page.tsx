import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission, has } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PHASE_LABELS, RECORD_STATUS_LABELS } from "@/lib/labels";
import { loadPainel } from "@/lib/data/painel";
import { FASE_ORDER, INCIDENT_STATUS_LABELS, SEVERITY_LABELS, applyFilters, completeness, filtersQuery, parseFilters, portfolio, seriesOf } from "@/lib/gestao";
import { LineChart } from "@/components/charts";
import { Funnel } from "@/components/charts-extra";
import { ENTRY_STATUS_LABELS, ENTRY_TIPO_LABELS, approvalStats, docFunnel, isOpenTask, isOverdueTask, visitCompliance } from "@/lib/painel";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { entriesFor } from "../../painel/componentes";
import { PrintButton } from "@/components/client";
import { Card, PageHeader, Table, Tabs, Td, Th, buttonClass } from "@/components/ui";
import { FilterForm, TimeEconomyTable } from "../componentes";

export const metadata: Metadata = { title: "Relatório gerencial" };

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-8 break-after-avoid font-display text-lg font-semibold text-brand-950">
      {n > 0 && `${n}. `}
      {children}
    </h2>
  );
}

const TIPOS = {
  executivo: "Executivo",
  operacional: "Operacional",
  documental: "Revisões e documentos",
  comercial: "Demonstrativo comercial",
} as const;
type Tipo = keyof typeof TIPOS;
// seções de cada tipo de relatório (números = seções do executivo; letras = seções específicas)
const SECOES: Record<Tipo, (number | string)[]> = {
  executivo: [2, 3, 4, 5, 6, 7, 8, 9],
  operacional: [3, 4, "op", 5, 8, 9],
  documental: ["doc", 8, 9],
  comercial: ["apres", 2, 3, 5, 6, 7, 9],
};

/** Relatório gerencial: gerado no momento da consulta a partir do banco, com os filtros aplicados. Imprimível em PDF pelo navegador. */
export default async function RelatorioGestao({ searchParams }: PageProps<"/app/gestao/relatorio">) {
  const ctx = await requirePermission("gestao.painel");
  const sp = await searchParams;
  const f = parseFilters(sp);
  const load = await loadPainel(ctx);
  const tipoReq = typeof sp.tipo === "string" && sp.tipo in TIPOS ? (sp.tipo as Tipo) : "executivo";
  // o demonstrativo comercial só existe na organização de demonstração
  const tipo: Tipo = tipoReq === "comercial" && !load.demo ? "executivo" : tipoReq;
  const show = (k: number | string) => SECOES[tipo].includes(k);
  const num = (k: number) => (tipo === "executivo" ? k : 0);
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
  const entries = entriesFor(load.schedules, load.events, d, load.data);
  const ids = new Set(d.experiments.map((e) => e.id));
  const tasks = load.tasksFull.filter((t) => !t.experiment_id || ids.has(t.experiment_id));
  const inP = (x: string) => (!f.de || x >= f.de) && (!f.ate || x <= f.ate);
  const visitas = entries.filter((e) => e.tipo === "visita" && inP(e.data));
  const compliance = visitCompliance(visitas, ref);
  const stats = approvalStats(load.requests, load.decisions, f.de, f.ate);
  const fonteTxt = demo ? "Fonte: dados sintéticos do pacote de demonstração (DADOS SIMULADOS)." : "Fonte: registros do Bento.";

  return (
    <article className="mx-auto max-w-5xl print:max-w-none">
      <div className="no-print">
        <PageHeader
          breadcrumbs={[{ href: "/app/relatorios", label: "Relatórios" }, { label: `Relatório ${TIPOS[tipo].toLowerCase()}` }]}
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
        <Tabs
          current={tipo}
          tabs={(Object.keys(TIPOS) as Tipo[])
            .filter((t) => t !== "comercial" || demo)
            .map((t) => ({ key: t, label: TIPOS[t], href: `/app/gestao/relatorio?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(q)), tipo: t })}` }))}
        />
        <Card className="mb-6 p-4">
          <FilterForm all={load.data} f={f} action="/app/gestao/relatorio" hidden={{ tipo }} />
        </Card>
      </div>

      {/* 1. Cabeçalho */}
      <header className="rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0">
        {demo && <p className="mb-3 rounded-lg border-2 border-warning-600 bg-warning-100 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-warning-600">Relatório demonstrativo. Dados simulados.</p>}
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">Relatório {TIPOS[tipo].toLowerCase()} · fazenda experimental</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-brand-950">{unidade}</h1>
        <p className="mt-1 text-sm text-muted">
          Período: {periodo} · Data de referência: {fmtDate(ref)} · Gerado em {fmtDateTime(geradoEm)} por {ctx.nome}
        </p>
        {q && <p className="mt-1 text-xs text-muted">Filtros: {[f.cultura && `cultura ${f.cultura}`, f.area && `área ${f.area}`, f.fase && `status ${PHASE_LABELS[f.fase as keyof typeof PHASE_LABELS]}`, f.setor && "setor selecionado", f.responsavel && "responsável selecionado"].filter(Boolean).join(" · ")}</p>}
      </header>

      {show("apres") && (
        <section className="mt-6 rounded-2xl border border-border p-5">
          <h2 className="font-display text-lg font-semibold text-brand-950">Como o Bento organiza uma fazenda experimental</h2>
          <ol className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <li>1. Cada ensaio tem código, objetivo, método, responsável e histórico de visitas com fonte e data.</li>
            <li>2. O calendário separa o que está previsto do que foi realizado.</li>
            <li>3. Ocorrências registram gravidade, consequência e providência, sem diagnóstico automático.</li>
            <li>4. Painéis, relatórios e links externos saem dos mesmos registros, com avisos sobre a natureza dos dados.</li>
          </ol>
          <p className="mt-2 text-xs font-semibold text-warning-600">Todos os números deste demonstrativo são fictícios (DADOS SIMULADOS).</p>
        </section>
      )}
      {show("doc") && (
        <>
          <H2 n={0}>Etapas dos conteúdos e decisões de revisão</H2>
          <Funnel steps={docFunnel(load.docs)} caption="Conteúdos por etapa" />
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>Submetidos à conferência no período: {stats.submetidos}</li>
            <li>Liberados na revisão final no período: {stats.liberados}</li>
            <li>Taxa de aprovação: {stats.taxa === null ? "Dados insuficientes (nenhuma submissão no período)" : `${stats.taxa}%`}</li>
            <li>
              Tempo entre submissão e decisão: {stats.tempo.mediana === null ? "Dados insuficientes" : `mediana de ${stats.tempo.mediana} dia(s)`} (n = {stats.tempo.n})
            </li>
            <li>
              Arquivos: {load.filesByAuth.length} · pendentes de conferência: {load.filesByAuth.filter((x) => x.revisao_status === "pendente").length} · com divulgação autorizada:{" "}
              {load.filesByAuth.filter((x) => x.autorizacao_uso === "divulgacao_autorizada").length}
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">“Revisado” não equivale a “liberado para divulgação”. Contagens de toda a organização.</p>
        </>
      )}
      {show(2) && (
        <>
      {/* 2. Resumo executivo */}
      <H2 n={num(2)}>Resumo executivo do portfólio</H2>
      <p className="text-sm leading-relaxed">
        {p.total} ensaio(s) na seleção: {FASE_ORDER.filter((x) => p.porFase[x]).map((x) => `${p.porFase[x]} ${PHASE_LABELS[x].toLowerCase()}`).join(", ")}. Principais culturas:{" "}
        {p.culturas.slice(0, 4).map((c) => `${c.label} (${c.value})`).join(", ")}. {d.visits.length} visita(s) e {d.measurements.length} medição(ões) registradas no período; {d.incidents.filter((i) => i.status === "aberta").length} ocorrência(s) aberta(s). Última gravação: {p.ultimaAtualizacao ? fmtDateTime(p.ultimaAtualizacao) : "—"}.
      </p>

        </>
      )}
      {show(3) && (
        <>
      {/* 3. Quadro por experimento */}
      <H2 n={num(3)}>Quadro por experimento</H2>
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

        </>
      )}
      {show(4) && (
        <>
      {/* 4. Linha do tempo */}
      <H2 n={num(4)}>Atividades realizadas e próximas etapas</H2>
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

        </>
      )}
      {show("op") && (
        <>
          <H2 n={0}>Pendências, prazos e visitas previstas × realizadas</H2>
          <p className="text-sm">
            Visitas no período: {visitas.filter((v) => v.status === "realizado").length} realizadas · {visitas.filter((v) => ["planejado", "confirmado", "reagendado"].includes(v.status)).length} previstas (não
            realizadas) · {visitas.filter((v) => v.status === "cancelado").length} canceladas. Cumprimento:{" "}
            {compliance.percentual === null ? "Dados insuficientes" : `${compliance.percentual}% (${compliance.numerador}/${compliance.denominador})`}.
          </p>
          <Table caption="Pendências abertas">
            <thead>
              <tr>
                <Th>Ensaio</Th>
                <Th>Pendência</Th>
                <Th>Responsável</Th>
                <Th>Prioridade</Th>
                <Th>Prazo</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {tasks.filter(isOpenTask).map((t) => (
                <tr key={t.id} className="break-inside-avoid">
                  <Td className="font-mono text-xs">{t.experiment_id ? byId.get(t.experiment_id)?.codigo : "—"}</Td>
                  <Td>{t.titulo}</Td>
                  <Td className="text-xs">{t.responsavel ?? "Não informado"}</Td>
                  <Td className="text-xs">{PRIORITY_LABELS[t.prioridade]}</Td>
                  <Td className={isOverdueTask(t, ref) ? "whitespace-nowrap text-xs font-semibold text-danger-600" : "whitespace-nowrap text-xs"}>{t.prazo ? fmtDate(t.prazo) : "sem prazo"}{isOverdueTask(t, ref) ? " (vencida)" : ""}</Td>
                  <Td className="text-xs">{TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-3 text-sm font-semibold">Compromissos previstos (não realizados)</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {entries
              .filter((e) => ["planejado", "confirmado", "reagendado"].includes(e.status))
              .slice(0, 30)
              .map((e) => (
                <li key={e.key}>
                  {fmtDate(e.data)} · {ENTRY_TIPO_LABELS[e.tipo]} · {e.titulo} · {ENTRY_STATUS_LABELS[e.status]}
                  {e.data < ref ? " · vencido" : " · previsto"}
                </li>
              ))}
          </ul>
        </>
      )}
      {show(5) && (
        <>
      {/* 5. Ocorrências */}
      <H2 n={num(5)}>Ocorrências relevantes</H2>
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

        </>
      )}
      {show(6) && (
        <>
      {/* 6. Gráficos */}
      <H2 n={num(6)}>Evolução das métricas</H2>
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

        </>
      )}
      {show(7) && (
        <>
      {/* 7. Indicadores administrativos */}
      <H2 n={num(7)}>Indicadores administrativos</H2>
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

        </>
      )}
      {show(8) && (
        <>
      {/* 8. Pendências de registro */}
      <H2 n={num(8)}>Registros incompletos, interrupções e revisões pendentes</H2>
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

        </>
      )}
      {show(9) && (
        <>
      {/* 9. Fonte */}
      <H2 n={num(9)}>Fonte e data de extração</H2>
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
        </>
      )}
    </article>
  );
}
