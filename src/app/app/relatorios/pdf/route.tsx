import type { NextRequest } from "next/server";
import { renderToBuffer, Text, View } from "@react-pdf/renderer";
import { getContext } from "@/lib/auth";
import { fmtDate, fmtMonth } from "@/lib/format";
import { loadReport, reportPeriod } from "@/lib/data/reports";
import { BentoPage, DocRoot, s } from "@/lib/pdf/components";
import { errorResponse, pdfResponse } from "@/lib/pdf/respond";

export const runtime = "nodejs";

function Row({ l, v }: { l: string; v: string | number }) {
  return (
    <View style={s.tableRow}>
      <Text style={{ flex: 3 }}>{l}</Text>
      <Text style={{ flex: 1, textAlign: "right" }}>{String(v)}</Text>
    </View>
  );
}

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const p = reportPeriod(Object.fromEntries(req.nextUrl.searchParams.entries()), ctx.settings?.piloto_inicio ?? null);
  const d = await loadReport(ctx, p);
  const meta = { titulo: "Indicadores do piloto", identificador: `Indicadores ${fmtDate(p.de)}–${fmtDate(p.ate)}`, geradoPor: ctx.nome, geradoEm: new Date().toISOString(), rascunho: false, assinatura: ctx.settings?.assinatura };
  const buf = await renderToBuffer(
    <DocRoot title="Indicadores do piloto">
      <BentoPage meta={meta}>
        <Text style={s.h1}>Indicadores do piloto</Text>
        <Text style={s.small}>
          Período: {fmtDate(p.de)} a {fmtDate(p.ate)}. Valores calculados a partir dos registros do Bento; uso interno.
        </Text>
        <Text style={s.h2}>Experimentos e visitas</Text>
        <Row l="Experimentos cadastrados" v={d.experimentos.cadastrados} />
        <Row l="Experimentos ativos" v={d.experimentos.ativos} />
        <Row l="Experimentos acompanhados no período" v={d.experimentos.acompanhados} />
        <Row l="Visitas planejadas" v={d.visitas.planejadas} />
        <Row l="Visitas realizadas" v={d.visitas.realizadas} />
        <Row l="Fichas conferidas ou finalizadas" v={d.visitas.fichasValidadas} />
        <Text style={s.h2}>Registros devidos atualizados no mês</Text>
        {d.taxas.map((t) => (
          <Row key={t.mes} l={`${fmtMonth(t.mes)} (${t.numerador}/${t.denominador})`} v={t.percentual === null ? "sem elegíveis" : `${t.percentual}%`} />
        ))}
        {d.taxas[0]?.regras.map((r) => (
          <Text key={r} style={s.small}>
            • {r}
          </Text>
        ))}
        <Text style={s.h2}>Pendências</Text>
        <Row l="Abertas" v={d.pendencias.abertas} />
        <Row l="Resolvidas no período" v={d.pendencias.resolvidas} />
        <Row l="Vencidas" v={d.pendencias.vencidas} />
        <Text style={s.h2}>Conteúdos e publicações</Text>
        <Row l="Produzidos" v={d.conteudos.produzidos} />
        <Row l="Conferidos" v={d.conteudos.conferidos} />
        <Row l="Validados cientificamente" v={d.conteudos.validados} />
        <Row l="Liberados" v={d.conteudos.liberados} />
        <Row l="Publicados" v={d.conteudos.publicados} />
        <Row l={`Boletins publicados (meta ${d.boletins.meta})`} v={d.boletins.publicados} />
        <Row l="Dossiês emitidos" v={d.dossies.emitidos} />
        <Text style={s.h2}>Alcance e retorno do público</Text>
        <Row l="Publicações com métricas registradas" v={d.alcance.publicacoesComMetricas} />
        <Row l="Alcance (registrado manualmente)" v={d.alcance.alcance} />
        <Row l="Respostas de feedback" v={d.feedback.respostas} />
        <Row l="Clareza média (1–5)" v={d.feedback.clareza ?? "—"} />
        <Row l="Utilidade média (1–5)" v={d.feedback.utilidade ?? "—"} />
      </BentoPage>
    </DocRoot>,
  );
  return pdfResponse(buf, `indicadores-${p.de}_${p.ate}.pdf`);
}
