import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { USE_AUTH_LABELS } from "@/lib/labels";
import { loadPainel } from "@/lib/data/painel";
import { parseFilters } from "@/lib/gestao";
import { approvalStats, docFunnel } from "@/lib/painel";
import { BarList } from "@/components/charts";
import { Funnel } from "@/components/charts-extra";
import { Alert, Card, CardBody, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { DemoSeal } from "../../gestao/componentes";
import { Kpi, MetricInfo, ModeTabs } from "../componentes";

export const metadata: Metadata = { title: "Documentos e aprovações" };

export default async function PainelDocumentos({ searchParams }: PageProps<"/app/painel/documentos">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const load = await loadPainel(ctx);
  const { demo, ref } = load;
  const funnel = docFunnel(load.docs);
  const stats = approvalStats(load.requests, load.decisions, f.de, f.ate);
  const files = load.filesByAuth;
  const authCounts = (Object.keys(USE_AUTH_LABELS) as (keyof typeof USE_AUTH_LABELS)[]).map((k) => ({ label: USE_AUTH_LABELS[k], value: files.filter((x) => x.autorizacao_uso === k).length }));
  const periodo = f.de || f.ate ? `${f.de ? fmtDate(f.de) : "início"} a ${f.ate ? fmtDate(f.ate) : fmtDate(ref)}` : "todo o histórico";

  return (
    <>
      <PageHeader title="Documentos e aprovações" description={`Etapas do processo editorial, decisões registradas e situação dos arquivos. Período: ${periodo}.`} />
      <ModeTabs current="documentos" f={f} canGestor={has(ctx, "gestao.painel")} />
      {demo && <DemoSeal className="mb-4" />}
      {demo && (
        <Alert tone="warning" title="Revisões da demonstração são simuladas">
          “Revisado” não significa “liberado para divulgação”. Nenhum conteúdo da demonstração tem autorização institucional real.
        </Alert>
      )}
      <div className="mt-4 space-y-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores de aprovação">
          <Kpi label="Submetidos à conferência" value={stats.submetidos} hint="solicitações abertas no período" href="/app/aprovacoes" />
          <Kpi label="Liberados (revisão final)" value={stats.liberados} hint="decisões ‘aprovado’ na revisão final" />
          <Kpi label="Taxa de aprovação" value={stats.taxa === null ? "Dados insuficientes" : `${stats.taxa}%`} hint={stats.taxa === null ? "nenhuma submissão no período" : `${stats.liberados} ÷ ${stats.submetidos}`} metric="taxa_aprovacao" />
          <Kpi
            label="Tempo até a decisão"
            value={stats.tempo.mediana === null ? "Dados insuficientes" : `${stats.tempo.mediana} dia(s)`}
            hint={`mediana · n = ${stats.tempo.n} solicitação(ões) concluída(s)`}
            metric="tempo_decisao"
          />
        </section>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Em que etapa estão os conteúdos?" description="Situação atual de cada item editorial (não arquivado)." />
            <CardBody>
              <Funnel steps={funnel} caption="Conteúdos por etapa" />
              <LinkButton size="sm" className="mt-3" href="/app/editorial">
                Abrir publicações
              </LinkButton>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Arquivos por autorização de uso" description="Somente “divulgação autorizada” pode sair da plataforma." />
            <CardBody>
              <BarList data={authCounts} caption="Arquivos por autorização" total={files.length} />
              <p className="mt-2 text-sm">
                Pendentes de conferência: <strong>{files.filter((x) => x.revisao_status === "pendente").length}</strong> · conferidos: <strong>{files.filter((x) => x.revisao_status === "conferido").length}</strong>
              </p>
              <Link href="/app/biblioteca" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
                Abrir arquivos
              </Link>
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title="Como os indicadores são calculados" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Taxa de aprovação</p>
              <MetricInfo k="taxa_aprovacao" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tempo entre submissão e decisão</p>
              <MetricInfo k="tempo_decisao" />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
