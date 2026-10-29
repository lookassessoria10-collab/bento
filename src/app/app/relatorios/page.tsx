import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileDown } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtMonth, fmtNumber } from "@/lib/format";
import { loadReport, reportPeriod } from "@/lib/data/reports";
import { Stat } from "@/components/charts";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, Input, PageHeader, Table, Td, Th, buttonClass } from "@/components/ui";
import { createEditorialItem } from "../editorial/actions";

export const metadata: Metadata = { title: "Relatórios" };

const EXPORTS = [
  ["experimentos", "Experimentos"],
  ["visitas", "Visitas e fichas"],
  ["atividades", "Atividades"],
  ["resultados", "Resultados"],
  ["arquivos", "Arquivos (metadados)"],
  ["indicadores", "Indicadores do período"],
] as const;

export default async function ReportsPage({ searchParams }: PageProps<"/app/relatorios">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const p = reportPeriod(sp, ctx.settings?.piloto_inicio ?? null);
  const [d, { data: finalReport }] = await Promise.all([
    loadReport(ctx, p),
    ctx.supabase.from("editorial_items").select("id, titulo, status").eq("organization_id", ctx.orgId).eq("tipo", "relatorio_piloto").limit(1).maybeSingle(),
  ]);
  const qs = new URLSearchParams(p).toString();

  return (
    <>
      <PageHeader
        title="Relatórios e avaliação do piloto"
        description={`Indicadores do pré-projeto calculados de dados reais, de ${fmtDate(p.de)} a ${fmtDate(p.ate)}.`}
        actions={
          <a className={buttonClass("secondary")} href={`/app/relatorios/pdf?${qs}`} target="_blank" rel="noopener">
            <FileDown aria-hidden className="h-4 w-4" /> PDF dos indicadores
          </a>
        }
      />
      <form className="mb-5 flex flex-wrap items-end gap-2" aria-label="Período do relatório">
        <label className="text-xs text-muted">
          De
          <Input name="de" type="date" defaultValue={p.de} />
        </label>
        <label className="text-xs text-muted">
          Até
          <Input name="ate" type="date" defaultValue={p.ate} />
        </label>
        <button className={buttonClass("primary")}>Atualizar</button>
      </form>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Experimentos cadastrados" value={d.experimentos.cadastrados} hint={`${d.experimentos.ativos} ativos · ${d.experimentos.acompanhados} acompanhados no período`} />
        <Stat label="Visitas planejadas" value={d.visitas.planejadas} hint={`${d.visitas.realizadas} realizadas · ${d.visitas.adiadas} adiadas · ${d.visitas.canceladas} canceladas`} />
        <Stat label="Fichas conferidas/finalizadas" value={d.visitas.fichasValidadas} hint={`${d.visitas.fichasFinalizadas} finalizadas`} />
        <Stat label="Pendências" value={d.pendencias.abertas} hint={`${d.pendencias.resolvidas} resolvidas · ${d.pendencias.vencidas} vencidas`} tone={d.pendencias.vencidas ? "warning" : "default"} />
        <Stat label="Conteúdos produzidos" value={d.conteudos.produzidos} hint={`${d.conteudos.conferidos} conferidos · ${d.conteudos.validados} validados`} />
        <Stat label="Liberados / publicados" value={`${d.conteudos.liberados} / ${d.conteudos.publicados}`} />
        <Stat label="Boletins" value={`${d.boletins.publicados}/${d.boletins.meta}`} hint={`${d.boletins.finalizados} finalizados (meta: ${d.boletins.meta})`} />
        <Stat label="Dossiês" value={d.dossies.emitidos} hint={`${d.dossies.autorizados} autorizados para divulgação`} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Registros devidos atualizados por mês" description="Atualizados no mês ÷ previstos no mês × 100." />
          <Table caption="Percentual mensal de registros atualizados">
            <thead>
              <tr>
                <Th>Mês</Th>
                <Th className="text-right">Numerador</Th>
                <Th className="text-right">Denominador</Th>
                <Th className="text-right">Percentual</Th>
              </tr>
            </thead>
            <tbody>
              {d.taxas.map((t) => (
                <tr key={t.mes}>
                  <Td>{fmtMonth(t.mes)}</Td>
                  <Td className="text-right tabular">{t.numerador}</Td>
                  <Td className="text-right tabular">{t.denominador}</Td>
                  <Td className="text-right tabular">{t.percentual === null ? "sem elegíveis" : `${t.percentual}%`}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <CardBody>
            <ul className="list-disc pl-4 text-xs text-muted">
              {d.taxas[0]?.regras.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Alcance e interação" description="Somente números registrados manualmente a partir de fonte autorizada (último registro por publicação)." />
            <CardBody>
              {d.alcance.publicacoesComMetricas === 0 ? (
                <p className="text-sm text-muted">Nenhuma métrica registrada no período.</p>
              ) : (
                <p className="text-sm">
                  {d.alcance.publicacoesComMetricas} publicação(ões) · alcance {fmtNumber(d.alcance.alcance)} · impressões {fmtNumber(d.alcance.impressoes)} · interações {fmtNumber(d.alcance.interacoes)} · referência até {fmtDate(d.alcance.referencia)}
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Retorno dos leitores" description="Formulário público com consentimento, escala 1–5 (respostas descartadas na moderação são excluídas)." />
            <CardBody className="text-sm">
              {d.feedback.respostas === 0 ? (
                <p className="text-muted">Nenhuma resposta no período.</p>
              ) : (
                <>
                  <p>
                    {d.feedback.respostas} resposta(s) · clareza média {d.feedback.clareza ?? "—"} · utilidade média {d.feedback.utilidade ?? "—"}
                  </p>
                  {d.feedback.sugestoes.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-muted">
                      {d.feedback.sugestoes.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {has(ctx, "feedback.moderar") && (
                <Link className="mt-2 inline-block text-brand-700 underline" href="/app/relatorios/feedback">
                  Moderar respostas
                </Link>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Divisão de responsabilidades" description="Visão de distribuição do trabalho — não é medida de produtividade individual." />
            <Table>
              <thead>
                <tr>
                  <Th>Responsável</Th>
                  <Th className="text-right">Abertas</Th>
                  <Th className="text-right">Concluídas no período</Th>
                </tr>
              </thead>
              <tbody>
                {d.equipe.map((e) => (
                  <tr key={e.nome}>
                    <Td>{e.nome}</Td>
                    <Td className="text-right tabular">{e.abertas}</Td>
                    <Td className="text-right tabular">{e.concluidas}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Exportações CSV" description={has(ctx, "relatorios.exportar_interno") ? "Inclui campos internos permitidos ao seu papel. Exportação não é backup completo." : "Exportação limitada aos registros visíveis para você."} />
          <CardBody className="flex flex-wrap gap-2">
            {EXPORTS.map(([k, l]) => (
              <a key={k} className={buttonClass("secondary", "sm")} href={`/app/relatorios/exportar?tipo=${k}&${qs}`}>
                <Download aria-hidden className="h-4 w-4" /> {l}
              </a>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Relatório final do piloto" description="Entregas, dificuldades, participação do público, aprendizados, limitações, recomendações, revisão e anexos — com revisão e PDF real." />
          <CardBody>
            {finalReport ? (
              <Link className={buttonClass("primary")} href={`/app/editorial/${finalReport.id}`}>
                Abrir relatório final
              </Link>
            ) : has(ctx, "editorial.criar") ? (
              <ActionForm action={createEditorialItem}>
                <input type="hidden" name="tipo" value="relatorio_piloto" />
                <input type="hidden" name="titulo" value="Relatório final do piloto Entomo Agro 360" />
                <input type="hidden" name="canais" value="interno" />
                <SubmitButton>Iniciar relatório final</SubmitButton>
              </ActionForm>
            ) : (
              <Alert tone="info">O relatório final ainda não foi iniciado.</Alert>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
