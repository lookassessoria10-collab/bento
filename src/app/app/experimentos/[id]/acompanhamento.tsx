import Link from "next/link";
import { AlertTriangle, CalendarCheck, CalendarClock, CircleCheck, FileText, Flag, Ruler } from "lucide-react";
import type { AppContext } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import { fmtDate, localDate } from "@/lib/format";
import { PHASE_LABELS, RECORD_STATUS_LABELS } from "@/lib/labels";
import { INCIDENT_STATUS_LABELS, SEVERITY_LABELS, daysBetween, seriesOf, type GIncident } from "@/lib/gestao";
import { LineChart } from "@/components/charts";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, KeyValue, Table, Td, Th, cx } from "@/components/ui";
import { DemoSeal, SEVERITY_TONE } from "@/app/app/gestao/componentes";

type ExpRow = Database["public"]["Tables"]["experiments"]["Row"];
interface DemoMeta {
  asOfDate?: string;
  currentStage?: string;
  researchTeam?: string[];
  resultSummary?: string;
  scientificReview?: { status: string; reviewer?: string; reviewedAt?: string | null; disclaimer?: string };
}
const PERIOD_DAYS: Record<string, number | null> = { quinzenal: 15, mensal: 30, bimestral: 60, trimestral: 90, sob_demanda: null };

type Event =
  | { kind: "visita"; data: string; rec: Rec; medidas: Meas[] }
  | { kind: "ocorrencia"; data: string; inc: GIncident }
  | { kind: "resolucao"; data: string; inc: GIncident }
  | { kind: "previsto"; data: string; titulo: string };
interface Rec {
  id: string;
  data: string;
  status: Database["public"]["Enums"]["record_status"];
  etapa_atual: string | null;
  avaliacoes_realizadas: string | null;
  observacoes_diretas: string | null;
  ocorrencias_relatadas: string | null;
  fontes: string | null;
  proxima_acao: string | null;
}
interface Meas {
  visit_record_id: string | null;
  data_medicao: string;
  variavel: string;
  valor: number | null;
  unidade: string | null;
  motivo_ausencia: string | null;
}

const fmtV = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Aba "Evolução e ocorrências": linha do tempo, séries medidas, problemas e estado de revisão — só com o que foi registrado. */
export async function Acompanhamento({ ctx, e }: { ctx: AppContext; e: ExpRow }) {
  const s = ctx.supabase;
  const [recs, meas, incs, plots, treatments, planned, files] = await Promise.all([
    s
      .from("visit_records")
      .select("id, status, etapa_atual, avaliacoes_realizadas, observacoes_diretas, ocorrencias_relatadas, fontes, proxima_acao, visit_schedules!inner(data_hora)")
      .eq("experiment_id", e.id),
    s.from("experiment_measurements").select("visit_record_id, data_medicao, variavel, valor, unidade, motivo_ausencia, ordem").eq("experiment_id", e.id).order("data_medicao").order("ordem"),
    s.from("experiment_incidents").select("*").eq("experiment_id", e.id).order("detectada_em"),
    s.from("experiment_plot_readings").select("parcela, tratamento, bloco, variavel, valor, unidade, data_leitura, natureza").eq("experiment_id", e.id).order("parcela"),
    s.from("experiment_treatments").select("codigo, descricao").eq("experiment_id", e.id).order("ordem"),
    s.from("visit_schedule_experiments").select("visit_schedules!inner(data_hora, status, titulo)").eq("experiment_id", e.id).in("visit_schedules.status", ["planejada", "confirmada"]),
    s.from("files").select("id, nome_amigavel, data_arquivo, origem, revisao_status, tipo").eq("experiment_id", e.id).is("deleted_at", null).order("data_arquivo"),
  ]);
  const meta = (e.demo_meta ?? null) as DemoMeta | null;
  const ref = e.is_demo && meta?.asOfDate ? meta.asOfDate : localDate();
  const visits: Rec[] = (recs.data ?? [])
    .map((r) => ({ ...r, data: localDate((r.visit_schedules as unknown as { data_hora: string }).data_hora) }))
    .sort((a, b) => a.data.localeCompare(b.data));
  const medidas: Meas[] = (meas.data ?? []).map((m) => ({ ...m, valor: m.valor === null ? null : Number(m.valor) }));
  const incidents = (incs.data ?? []) as GIncident[];
  const series = seriesOf(
    medidas.map((m) => ({ ...m, experiment_id: e.id })),
    e.id,
  );
  const ausentes = medidas.filter((m) => m.valor === null);
  const proximas = (planned.data ?? [])
    .map((p) => p.visit_schedules as unknown as { data_hora: string; titulo: string })
    .map((v) => ({ data: localDate(v.data_hora), titulo: v.titulo }))
    .filter((v) => v.data >= ref)
    .sort((a, b) => a.data.localeCompare(b.data));

  const last = visits.length ? visits[visits.length - 1] : null;
  const limite = PERIOD_DAYS[e.periodicidade_acompanhamento] ?? null;
  const desde = last ? daysBetween(last.data, ref) : null;
  const devida = e.fase === "andamento" && limite !== null && desde !== null && desde > limite;
  const fonte = e.is_demo ? "Fonte: medição sintética (DADOS SIMULADOS)." : "Fonte: medições registradas nas fichas de visita.";

  const events: Event[] = [
    ...visits.map((v) => ({ kind: "visita" as const, data: v.data, rec: v, medidas: medidas.filter((m) => m.visit_record_id === v.id) })),
    ...incidents.map((i) => ({ kind: "ocorrencia" as const, data: i.detectada_em, inc: i })),
    ...incidents.filter((i) => i.resolvida_em).map((i) => ({ kind: "resolucao" as const, data: i.resolvida_em!, inc: i })),
    ...proximas.map((p) => ({ kind: "previsto" as const, data: p.data, titulo: `Visita agendada: ${p.titulo}` })),
    ...(e.fase === "planejado" && e.data_inicio && e.data_inicio > ref ? [{ kind: "previsto" as const, data: e.data_inicio, titulo: "Início previsto do ensaio" }] : []),
    ...((e.fase === "andamento" || e.fase === "planejado") && e.data_termino_prevista && e.data_termino_prevista > ref ? [{ kind: "previsto" as const, data: e.data_termino_prevista, titulo: "Término previsto (ainda não ocorrido)" }] : []),
  ].sort((a, b) => a.data.localeCompare(b.data) || a.kind.localeCompare(b.kind));

  // leituras finais: tabela por tratamento × bloco, sem médias nem comparação estatística
  const plotRows = plots.data ?? [];
  const plotVars = [...new Set(plotRows.map((p) => `${p.variavel}|${p.unidade ?? ""}`))];
  const blocos = [...new Set(plotRows.map((p) => p.bloco ?? 0))].sort((a, b) => a - b);
  const tratamentos = [...new Set(plotRows.map((p) => p.tratamento ?? "—"))];

  return (
    <div className="space-y-6">
      {e.is_demo && <DemoSeal />}

      {e.fase === "interrompido" && (
        <Alert tone="danger" title="Ensaio interrompido — não há conclusão final">
          {e.motivo_interrupcao} Os valores que não foram coletados aparecem como ausentes; nada foi preenchido ou estimado depois da interrupção.
        </Alert>
      )}
      {e.fase === "andamento" && (
        <Alert tone="info" title="Ensaio em andamento">
          Histórico parcial até {fmtDate(ref)}. Não há colheita, resultado final ou relatório de encerramento registrado.
        </Alert>
      )}
      {e.fase === "planejado" && (
        <Alert tone="info" title="Ensaio planejado">
          Início previsto em {fmtDate(e.data_inicio)}. Nenhuma visita ou medição foi registrada ainda.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Objetivo e método, em linguagem simples" />
          <CardBody className="space-y-4">
            <KeyValue
              items={[
                { label: "O que o ensaio quer acompanhar", value: e.objetivo_geral },
                { label: "Como está organizado", value: e.resumo_metodologico },
                { label: "Repetições", value: e.num_repeticoes ? `${e.num_repeticoes} repetições${e.unidades_experimentais ? ` · ${e.unidades_experimentais}` : ""}` : null },
                { label: "Situação", value: `${PHASE_LABELS[e.fase]}${meta?.currentStage ? ` · estádio atual: ${meta.currentStage}` : last?.etapa_atual ? ` · último estádio registrado: ${last.etapa_atual}` : ""}` },
              ]}
            />
            {(treatments.data ?? []).length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Tratamentos comparados</p>
                <ul className="mt-1 flex flex-wrap gap-1.5 text-sm">
                  {(treatments.data ?? []).map((t) => (
                    <li key={t.codigo ?? t.descricao} className="rounded-lg bg-surface-muted px-2 py-0.5">
                      {t.codigo ? <strong>{t.codigo}</strong> : null} {t.descricao}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">A lista descreve o desenho do ensaio. Não há análise estatística concluída nem indicação de tratamento superior.</p>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Atualização do acompanhamento" />
          <CardBody className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CalendarCheck aria-hidden className="h-4 w-4 text-brand-600" /> Última visita: <strong>{last ? fmtDate(last.data) : "nenhuma"}</strong>
              {desde !== null && <span className="text-muted">({desde} dias)</span>}
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock aria-hidden className={cx("h-4 w-4", devida ? "text-warning-600" : "text-brand-600")} />
              {e.fase !== "andamento" ? (
                <span className="text-muted">Sem visitas devidas ({PHASE_LABELS[e.fase].toLowerCase()})</span>
              ) : devida ? (
                <strong className="text-warning-600">Visita devida: passou da periodicidade {e.periodicidade_acompanhamento}</strong>
              ) : (
                <span>Dentro da periodicidade {e.periodicidade_acompanhamento}</span>
              )}
            </p>
            <p className="flex items-center gap-2">
              <Flag aria-hidden className="h-4 w-4 text-brand-600" /> Próxima visita agendada: {proximas[0] ? <strong>{fmtDate(proximas[0].data)}</strong> : <span className="text-muted">nenhuma no calendário</span>}
            </p>
            <p className="flex items-center gap-2">
              <Ruler aria-hidden className="h-4 w-4 text-brand-600" /> {medidas.length} medição(ões), {ausentes.length} ausente(s) com justificativa
            </p>
            <p className="text-xs text-muted">Referência: {fmtDate(ref)}</p>
          </CardBody>
        </Card>
      </div>

      <section aria-labelledby="evolucao">
        <h2 id="evolucao" className="mb-3 font-display text-lg font-semibold text-brand-950">
          Evolução das variáveis medidas
        </h2>
        {series.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {series.map((sr) => (
              <Card key={sr.variavel}>
                <CardBody>
                  <LineChart title={sr.variavel} unidade={sr.unidade} pontos={sr.pontos} marcos={incidents.map((i) => ({ data: i.detectada_em, label: i.titulo }))} fonte={fonte} />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma medição registrada.">Gráficos só aparecem quando existem valores gravados nas fichas.</EmptyState>
        )}
        {incidents.length > 0 && series.length > 0 && <p className="mt-2 text-xs text-muted">Linha tracejada com “!”: data em que uma ocorrência foi registrada. Variações observadas não autorizam inferência de causa.</p>}
      </section>

      <section aria-labelledby="ocorrencias">
        <h2 id="ocorrencias" className="mb-3 font-display text-lg font-semibold text-brand-950">
          Problemas registrados
        </h2>
        {incidents.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {incidents.map((i) => (
              <article key={i.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={SEVERITY_TONE[i.gravidade]}>Gravidade {SEVERITY_LABELS[i.gravidade].toLowerCase()}</Badge>
                  <Badge tone={i.status === "aberta" ? "warning" : "brand"}>{INCIDENT_STATUS_LABELS[i.status]}</Badge>
                </div>
                <h3 className="mt-2 font-display text-[15px] font-semibold text-brand-950">{i.titulo}</h3>
                <p className="text-xs text-muted">
                  Detectada em {fmtDate(i.detectada_em)}
                  {i.resolvida_em ? ` · resolvida em ${fmtDate(i.resolvida_em)}` : ` · aberta há ${daysBetween(i.detectada_em, ref)} dias`}
                </p>
                <KeyValue
                  items={[
                    { label: "O que aconteceu", value: i.descricao },
                    { label: "Consequência para o ensaio", value: i.consequencia },
                    { label: "Providência registrada", value: i.providencia },
                    { label: "Responsável", value: i.responsavel_descricao ?? (e.is_demo ? "Não informado na ocorrência" : null) },
                  ]}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhuma ocorrência registrada neste ensaio.</p>
        )}
      </section>

      <section aria-labelledby="linha">
        <h2 id="linha" className="mb-3 font-display text-lg font-semibold text-brand-950">
          Linha do tempo
        </h2>
        {events.length ? (
          <ol className="relative space-y-4 border-l-2 border-border pl-6">
            {events.map((ev, n) => (
              <li key={`${ev.kind}-${ev.data}-${n}`} className="relative">
                <span
                  aria-hidden
                  className={cx(
                    "absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background",
                    ev.kind === "visita" && "bg-brand-600",
                    ev.kind === "ocorrencia" && "bg-warning-600",
                    ev.kind === "resolucao" && "bg-brand-400",
                    ev.kind === "previsto" && "border-2 border-dashed border-border-strong bg-surface",
                  )}
                />
                <p className="text-xs font-semibold text-muted">
                  {fmtDate(ev.data)}
                  {ev.kind === "previsto" && " · previsto (ainda não realizado)"}
                </p>
                {ev.kind === "visita" && (
                  <div className="mt-1 rounded-xl border border-border bg-surface p-3 text-sm">
                    <p className="font-semibold">
                      Visita · {ev.rec.etapa_atual ?? "estádio não informado"} <Badge tone={ev.rec.status === "conferida" ? "brand" : "warning"}>{RECORD_STATUS_LABELS[ev.rec.status]}{e.is_demo && ev.rec.status === "conferida" ? " (simulada)" : ""}</Badge>
                    </p>
                    {ev.rec.avaliacoes_realizadas && <p className="mt-1">{ev.rec.avaliacoes_realizadas}</p>}
                    {ev.medidas.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {ev.medidas.map((m) => (
                          <li key={m.variavel} className={cx("rounded-lg px-2 py-0.5 text-xs", m.valor === null ? "bg-danger-100 text-danger-600" : "bg-brand-50 text-brand-800")}>
                            {m.variavel}: {m.valor === null ? `ausente — ${m.motivo_ausencia}` : `${fmtV(m.valor)} ${m.unidade ?? ""}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {ev.rec.observacoes_diretas && <p className="mt-1.5 text-muted">Observação direta: {ev.rec.observacoes_diretas}</p>}
                    {ev.rec.ocorrencias_relatadas && <p className="text-muted">Relato do pesquisador: {ev.rec.ocorrencias_relatadas}</p>}
                    {ev.rec.fontes && <p className="text-xs text-muted">Origem: {ev.rec.fontes}</p>}
                    {ev.rec.proxima_acao && <p className="mt-1 text-xs font-medium">Próximo passo registrado: {ev.rec.proxima_acao}</p>}
                  </div>
                )}
                {ev.kind === "ocorrencia" && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm">
                    <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
                    <span>
                      <strong>Ocorrência ({SEVERITY_LABELS[ev.inc.gravidade].toLowerCase()}):</strong> {ev.inc.titulo}. {ev.inc.providencia}
                    </span>
                  </p>
                )}
                {ev.kind === "resolucao" && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm">
                    <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <span>Ocorrência encerrada: {ev.inc.titulo}</span>
                  </p>
                )}
                {ev.kind === "previsto" && <p className="mt-1 text-sm text-muted">{ev.titulo}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Nenhum evento registrado.</p>
        )}
      </section>

      <section aria-labelledby="parcelas">
        <h2 id="parcelas" className="mb-1 font-display text-lg font-semibold text-brand-950">
          Leituras finais por parcela
        </h2>
        {plotRows.length ? (
          <>
            <p className="mb-3 text-xs text-muted">
              Valores por parcela para rastreabilidade{plotRows.some((p) => p.natureza === "sintetico_sem_teste_estatistico") ? " — sintéticos, sem teste estatístico" : ""}. Não indicam efeito de tratamento, significância ou recomendação.
            </p>
            {plotVars.map((pv) => {
              const [variavel, unidade] = pv.split("|");
              const rows = plotRows.filter((p) => p.variavel === variavel);
              return (
                <Table key={pv} caption={`${variavel} por parcela`}>
                  <thead>
                    <tr>
                      <Th>
                        {variavel} ({unidade || "—"})
                      </Th>
                      {blocos.map((b) => (
                        <Th key={b} className="text-right">
                          Bloco {b}
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tratamentos.map((t) => (
                      <tr key={t}>
                        <Td>{t}</Td>
                        {blocos.map((b) => {
                          const r = rows.find((x) => (x.tratamento ?? "—") === t && (x.bloco ?? 0) === b);
                          return (
                            <Td key={b} className="text-right tabular">
                              {r?.valor == null ? <span className="text-muted">—</span> : fmtV(Number(r.valor))}
                            </Td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              );
            })}
          </>
        ) : (
          <p className="text-sm text-muted">
            {e.fase === "interrompido"
              ? "Sem leituras finais: o ensaio foi interrompido antes do encerramento."
              : e.fase === "concluido"
                ? "Nenhuma leitura final registrada."
                : "Leituras finais só existem após o encerramento do ensaio."}
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Documentos" />
          <CardBody>
            {(files.data ?? []).length ? (
              <ul className="space-y-2 text-sm">
                {(files.data ?? []).map((f) => (
                  <li key={f.id} className="flex items-start gap-2">
                    <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <span>
                      <span className="font-medium">{f.nome_amigavel}</span>
                      <span className="block text-xs text-muted">
                        {fmtDate(f.data_arquivo)} · {f.origem ?? "origem não informada"} · conferência: {f.revisao_status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum documento vinculado.</p>
            )}
            <Link href={`/app/experimentos/${e.id}?aba=arquivos`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
              Abrir arquivos e baixar
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Revisão do conteúdo" />
          <CardBody className="space-y-2 text-sm">
            <p>
              Fichas conferidas: {visits.filter((v) => v.status === "conferida" || v.status === "finalizada").length} de {visits.length}
              {e.is_demo && " (conferência simulada)"}
            </p>
            {meta?.scientificReview ? (
              <>
                <p>
                  Revisão científica <strong>simulada</strong>: {meta.scientificReview.status === "revisado_demo" ? "revisado_demo" : "não liberado"}
                  {meta.scientificReview.reviewer ? ` · ${meta.scientificReview.reviewer} (fictício)` : ""}
                  {meta.scientificReview.reviewedAt ? ` · ${fmtDate(meta.scientificReview.reviewedAt)}` : ""}
                </p>
                <p className="text-xs text-warning-600">{meta.scientificReview.disclaimer} Não habilita publicação.</p>
              </>
            ) : (
              <p className="text-muted">A validação científica real acontece no fluxo de Revisões e aprovações.</p>
            )}
            {meta?.resultSummary && <p className="rounded-lg bg-surface-muted p-2 text-xs">{meta.resultSummary}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
