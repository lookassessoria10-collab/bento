import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/labels";
import { loadPainel } from "@/lib/data/painel";
import { applyFilters, completeness, parseFilters, seriesOf } from "@/lib/gestao";
import { LineChart } from "@/components/charts";
import { DotPlot } from "@/components/charts-extra";
import { Alert, Card, CardBody, CardHeader, EmptyState, KeyValue, PageHeader, Select, buttonClass } from "@/components/ui";
import { DemoSeal } from "../../gestao/componentes";
import { ModeTabs } from "../componentes";

export const metadata: Metadata = { title: "Painel técnico-científico" };

/**
 * Uma variável de UM ensaio por vez, com unidade, período e metodologia do próprio ensaio.
 * Nunca soma grandezas de ensaios diferentes; leituras por parcela aparecem sem média nem teste estatístico.
 */
export default async function PainelTecnico({ searchParams }: PageProps<"/app/painel/tecnico">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const load = await loadPainel(ctx);
  const { ref, demo } = load;
  const d = applyFilters(load.data, f);
  const withSeries = d.experiments.filter((e) => seriesOf(d.measurements, e.id).length > 0);
  const ensaioId = typeof sp.ensaio === "string" && withSeries.some((e) => e.id === sp.ensaio) ? sp.ensaio : withSeries[0]?.id;
  const e = withSeries.find((x) => x.id === ensaioId);
  const series = e ? seriesOf(d.measurements, e.id) : [];
  const variavel = typeof sp.variavel === "string" && series.some((s) => s.variavel === sp.variavel) ? sp.variavel : series[0]?.variavel;
  const s = series.find((x) => x.variavel === variavel);
  const incidents = e ? d.incidents.filter((i) => i.experiment_id === e.id) : [];
  const meas = e ? d.measurements.filter((m) => m.experiment_id === e.id) : [];
  const comp = e ? completeness(d.visits.filter((v) => v.experiment_id === e.id), meas) : null;

  const [{ data: plots }, { data: exp }] = e
    ? await Promise.all([
        ctx.supabase.from("experiment_plot_readings").select("parcela, tratamento, bloco, variavel, valor, unidade, natureza, data_leitura").eq("experiment_id", e.id).order("parcela"),
        ctx.supabase.from("experiments").select("delineamento, num_repeticoes, resumo_metodologico, unidades_experimentais").eq("id", e.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];
  const plotVars = [...new Set((plots ?? []).map((p) => `${p.variavel}|${p.unidade ?? ""}`))];
  const synthetic = demo || (plots ?? []).some((p) => p.natureza === "sintetico_sem_teste_estatistico");

  return (
    <>
      <PageHeader title="Visão técnico-científica" description="Evolução de uma variável por ensaio, comparação descritiva por tratamento e qualidade dos registros." />
      <ModeTabs current="tecnico" f={f} canGestor={has(ctx, "gestao.painel")} />
      {demo && <DemoSeal className="mb-4" />}
      {synthetic && (
        <Alert tone="warning" title="Resultado sintético não validado cientificamente">
          Os valores desta organização são fictícios. Não indicam efeito de tratamento, significância estatística nem recomendação de manejo.
        </Alert>
      )}

      {!withSeries.length ? (
        <EmptyState title="Nenhum ensaio com medições registradas na seleção.">Os gráficos aparecem quando há valores gravados nas fichas de visita.</EmptyState>
      ) : (
        <div className="mt-4 space-y-6">
          <form className="no-print grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3" aria-label="Escolher ensaio e variável">
            {Object.entries(f)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Ensaio
              <Select name="ensaio" defaultValue={e?.id} options={withSeries.map((x) => ({ value: x.id, label: `${x.codigo} · ${x.titulo}` }))} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Variável (do mesmo ensaio)
              <Select name="variavel" defaultValue={variavel} options={series.map((x) => ({ value: x.variavel, label: `${x.variavel} (${x.unidade ?? "sem unidade"})` }))} />
            </label>
            <div className="flex items-end">
              <button className={buttonClass("primary")}>Mostrar</button>
            </div>
          </form>

          {e && (
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader title={`${e.codigo} · ${s?.variavel ?? ""}`} description={`${e.titulo} · ${PHASE_LABELS[e.fase]}`} />
                <CardBody>
                  {s ? (
                    <LineChart
                      title={s.variavel}
                      unidade={s.unidade}
                      pontos={s.pontos}
                      marcos={incidents.map((i) => ({ data: i.detectada_em, label: i.titulo }))}
                      fonte={synthetic ? "Fonte: medição sintética (DADOS SIMULADOS)." : "Fonte: medições registradas nas fichas."}
                    />
                  ) : (
                    <p className="text-sm text-muted">Selecione uma variável.</p>
                  )}
                  {s && (
                    <p className="mt-2 text-xs text-muted">
                      Período: {fmtDate(s.pontos[0].data)} a {fmtDate(s.pontos[s.pontos.length - 1].data)} · {s.pontos.filter((p) => p.valor !== null).length} valor(es) · unidade {s.unidade ?? "não informada"}
                    </p>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Metodologia e contexto" />
                <CardBody className="space-y-3">
                  <KeyValue
                    items={[
                      { label: "Objetivo", value: e.objetivo_geral },
                      { label: "Delineamento", value: exp?.delineamento ?? null },
                      { label: "Repetições", value: exp?.num_repeticoes ? `${exp.num_repeticoes}${exp.unidades_experimentais ? ` · ${exp.unidades_experimentais}` : ""}` : null },
                      { label: "Responsável", value: e.responsavel },
                    ]}
                  />
                  <Link href={`/app/experimentos/${e.id}?aba=acompanhamento`} className="text-sm font-semibold text-brand-700 hover:underline">
                    Abrir a ficha completa
                  </Link>
                </CardBody>
              </Card>
            </div>
          )}

          {e && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Leituras por tratamento" description="Cada ponto é uma repetição (bloco). Sem média, sem teste estatístico." />
                <CardBody className="space-y-4">
                  {plotVars.length ? (
                    plotVars.map((pv) => {
                      const [vname, unidade] = pv.split("|");
                      const rows = (plots ?? []).filter((p) => p.variavel === vname && p.valor !== null);
                      const trts = [...new Set(rows.map((p) => p.tratamento ?? "—"))];
                      return (
                        <div key={pv}>
                          <p className="mb-1 text-sm font-semibold">
                            {vname} ({unidade || "sem unidade"})
                          </p>
                          <DotPlot
                            caption={`${vname} por tratamento`}
                            unidade={unidade}
                            groups={trts.map((t) => ({ label: t, values: rows.filter((p) => (p.tratamento ?? "—") === t).map((p) => ({ v: Number(p.valor), tag: `bloco ${p.bloco ?? "?"}` })) }))}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted">
                      {e.fase === "interrompido" ? "Sem leituras finais: ensaio interrompido antes do encerramento." : e.fase === "concluido" ? "Nenhuma leitura por parcela registrada." : "Leituras finais só existem após o encerramento."}
                    </p>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Qualidade dos registros" />
                <CardBody className="space-y-1.5 text-sm">
                  <p>
                    Preenchimento dos campos essenciais: <strong>{comp?.percentual === null ? "Dados insuficientes" : `${comp?.percentual}%`}</strong> ({comp?.numerador}/{comp?.denominador})
                  </p>
                  <p>
                    Medições: {comp?.comValor} com valor · {comp?.ausentesJustificadas} ausente(s) com justificativa · {comp?.ausentesSemMotivo} sem justificativa
                  </p>
                  {meas
                    .filter((m) => m.valor === null)
                    .map((m) => (
                      <p key={m.data_medicao + m.variavel} className="rounded-lg bg-danger-100/60 px-2 py-1 text-xs text-danger-600">
                        {fmtDate(m.data_medicao)} · {m.variavel}: ausente — {m.motivo_ausencia ?? "sem motivo"}
                      </p>
                    ))}
                  <p>Ocorrências registradas: {incidents.length}</p>
                  <p className="text-xs text-muted">Referência: {fmtDate(ref)}. Valores ausentes nunca são tratados como zero.</p>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
}
