import "server-only";
import type { AppContext } from "@/lib/auth";
import { has } from "@/lib/auth";
import { fmtDate, fmtDateTime, monthBoundsUtc } from "@/lib/format";
import { ANALYSIS_LABELS, FILE_KIND_LABELS, INFO_STATUS_LABELS, PHASE_LABELS, RECORD_STATUS_LABELS, TASK_STATUS_LABELS, USE_AUTH_LABELS, VISIT_STATUS_LABELS } from "@/lib/labels";
import { toCsv } from "@/lib/text";
import { loadReport } from "./reports";
import { queryExperiments, type ExperimentFilters } from "./experiments";

type Col = { key: string; label: string };

/** Monta CSVs a partir de consultas sob RLS: só sai o que o usuário pode ver. */
export async function buildCsv(ctx: AppContext, tipo: string, p: { de: string; ate: string }, expFilters?: ExperimentFilters): Promise<{ name: string; csv: string } | null> {
  const internal = has(ctx, "relatorios.exportar_interno");
  const r = monthBoundsUtc(p.de, p.ate);
  const s = ctx.supabase;

  if (tipo === "experimentos") {
    const q = expFilters ? queryExperiments(ctx, expFilters) : queryExperiments(ctx, { q: "", fase: "", cultura: "", area: "", responsavel: "", arquivados: false, ordem: "codigo", page: 1 });
    const { data } = await q.limit(5000);
    const cols: Col[] = [
      { key: "codigo", label: "Código" },
      { key: "codigo_institucional", label: "Código institucional" },
      { key: "titulo", label: "Título" },
      { key: "area_tematica", label: "Área temática" },
      { key: "culturas", label: "Culturas" },
      { key: "organismos", label: "Organismos" },
      { key: "responsavel", label: "Pesquisador principal" },
      { key: "fazenda", label: "Fazenda" },
      { key: "fase", label: "Fase" },
      { key: "disponibilidade", label: "Disponibilidade das informações" },
      { key: "data_inicio", label: "Início" },
      { key: "data_termino_prevista", label: "Término previsto" },
      { key: "fonte_cadastro", label: "Fonte do cadastro" },
      { key: "data_informacao", label: "Data da informação" },
      { key: "ilustrativo", label: "Dado ilustrativo" },
      { key: "atualizado", label: "Última atualização" },
    ];
    const rows = (data ?? []).map((e) => ({
      ...e,
      responsavel: (e.people as unknown as { nome: string } | null)?.nome,
      fazenda: (e.farms as unknown as { nome: string } | null)?.nome,
      fase: PHASE_LABELS[e.fase],
      disponibilidade: INFO_STATUS_LABELS[e.disponibilidade],
      data_inicio: e.data_inicio && fmtDate(e.data_inicio),
      data_termino_prevista: e.data_termino_prevista && fmtDate(e.data_termino_prevista),
      data_informacao: e.data_informacao && fmtDate(e.data_informacao),
      ilustrativo: e.is_demo ? "Sim" : "Não",
      atualizado: fmtDateTime(e.updated_at),
    }));
    return { name: "experimentos", csv: toCsv(cols, rows) };
  }

  if (tipo === "visitas") {
    const { data } = await s
      .from("visit_records")
      .select("status, etapa_atual, situacao_analise, proxima_acao, proxima_acao_prazo, ocorrencias_relatadas, observacoes_diretas, experiments(codigo), visit_schedules!inner(titulo, data_hora, status)")
      .eq("organization_id", ctx.orgId)
      .gte("visit_schedules.data_hora", r.from)
      .lt("visit_schedules.data_hora", r.to)
      .limit(5000);
    const cols: Col[] = [
      { key: "visita", label: "Visita" },
      { key: "data", label: "Data" },
      { key: "situacao_visita", label: "Situação da visita" },
      { key: "codigo", label: "Experimento" },
      { key: "ficha", label: "Ficha" },
      { key: "etapa_atual", label: "Etapa atual" },
      { key: "analise", label: "Situação da análise" },
      { key: "proxima_acao", label: "Próxima ação" },
      { key: "prazo", label: "Prazo" },
      ...(internal ? [{ key: "ocorrencias_relatadas", label: "Ocorrências relatadas (pesquisador)" }, { key: "observacoes_diretas", label: "Observações diretas (estudantes)" }] : []),
    ];
    const rows = (data ?? []).map((x) => {
      const v = x.visit_schedules as unknown as { titulo: string; data_hora: string; status: keyof typeof VISIT_STATUS_LABELS };
      return {
        ...x,
        visita: v.titulo,
        data: fmtDateTime(v.data_hora),
        situacao_visita: VISIT_STATUS_LABELS[v.status],
        codigo: (x.experiments as unknown as { codigo: string } | null)?.codigo,
        ficha: RECORD_STATUS_LABELS[x.status],
        analise: ANALYSIS_LABELS[x.situacao_analise],
        prazo: x.proxima_acao_prazo && fmtDate(x.proxima_acao_prazo),
      };
    });
    return { name: "visitas", csv: toCsv(cols, rows) };
  }

  if (tipo === "atividades") {
    const { data } = await s.from("tasks").select("titulo, categoria, prioridade, status, prazo, concluida_em, motivo_bloqueio, profiles:responsavel_id(nome), experiments(codigo)").eq("organization_id", ctx.orgId).limit(5000);
    const cols: Col[] = [
      { key: "titulo", label: "Atividade" },
      { key: "categoria", label: "Categoria" },
      { key: "prioridade", label: "Prioridade" },
      { key: "status", label: "Situação" },
      { key: "responsavel", label: "Responsável" },
      { key: "codigo", label: "Experimento" },
      { key: "prazo", label: "Prazo" },
      { key: "concluida", label: "Concluída em" },
      { key: "motivo_bloqueio", label: "Motivo da pendência" },
    ];
    const rows = (data ?? []).map((t) => ({
      ...t,
      status: TASK_STATUS_LABELS[t.status],
      responsavel: (t.profiles as unknown as { nome: string } | null)?.nome,
      codigo: (t.experiments as unknown as { codigo: string } | null)?.codigo,
      prazo: t.prazo && fmtDate(t.prazo),
      concluida: t.concluida_em && fmtDateTime(t.concluida_em),
    }));
    return { name: "atividades", csv: toCsv(cols, rows) };
  }

  if (tipo === "resultados") {
    const { data } = await s
      .from("result_summaries")
      .select("variavel, unidade, periodo_inicio, periodo_fim, sintese, situacao_analise, fonte_descricao, data_fornecimento, limitacoes, versao_interpretacao, conferencia_status, validacao_status, escopo_divulgacao, is_demo, experiments(codigo)")
      .eq("organization_id", ctx.orgId)
      .limit(5000);
    const cols: Col[] = [
      { key: "codigo", label: "Experimento" },
      { key: "variavel", label: "Variável" },
      { key: "unidade", label: "Unidade" },
      { key: "periodo", label: "Período" },
      { key: "sintese", label: "Síntese recebida" },
      { key: "analise", label: "Situação da análise" },
      { key: "fonte_descricao", label: "Fonte" },
      { key: "data_fornecimento", label: "Fornecido em" },
      { key: "limitacoes", label: "Limitações" },
      { key: "versao_interpretacao", label: "Versão" },
      { key: "conferencia_status", label: "Conferência" },
      { key: "validacao_status", label: "Validação científica" },
      { key: "escopo_divulgacao", label: "Escopo autorizado" },
      { key: "ilustrativo", label: "Dado ilustrativo" },
    ];
    const rows = (data ?? []).map((x) => ({
      ...x,
      codigo: (x.experiments as unknown as { codigo: string } | null)?.codigo,
      periodo: `${fmtDate(x.periodo_inicio)} a ${fmtDate(x.periodo_fim)}`,
      analise: ANALYSIS_LABELS[x.situacao_analise],
      data_fornecimento: x.data_fornecimento && fmtDate(x.data_fornecimento),
      ilustrativo: x.is_demo ? "Sim" : "Não",
    }));
    return { name: "resultados", csv: toCsv(cols, rows) };
  }

  if (tipo === "arquivos") {
    const { data } = await s
      .from("files")
      .select("nome_amigavel, nome_original, tipo, autoria, data_arquivo, legenda, licenca, autorizacao_uso, autorizacao_canais, versao, created_at, external_url, experiments(codigo)")
      .eq("organization_id", ctx.orgId)
      .is("deleted_at", null)
      .limit(5000);
    const cols: Col[] = [
      { key: "nome_amigavel", label: "Nome" },
      { key: "nome_original", label: "Nome original" },
      { key: "tipo", label: "Tipo" },
      { key: "codigo", label: "Experimento" },
      { key: "autoria", label: "Autoria" },
      { key: "data_arquivo", label: "Data" },
      { key: "legenda", label: "Legenda" },
      { key: "licenca", label: "Licença" },
      { key: "uso", label: "Autorização" },
      { key: "autorizacao_canais", label: "Canais" },
      { key: "versao", label: "Versão" },
      { key: "external_url", label: "Link externo" },
    ];
    const rows = (data ?? []).map((f) => ({
      ...f,
      tipo: FILE_KIND_LABELS[f.tipo],
      codigo: (f.experiments as unknown as { codigo: string } | null)?.codigo,
      data_arquivo: f.data_arquivo && fmtDate(f.data_arquivo),
      uso: USE_AUTH_LABELS[f.autorizacao_uso],
    }));
    return { name: "arquivos-metadados", csv: toCsv(cols, rows) };
  }

  if (tipo === "indicadores") {
    const d = await loadReport(ctx, p);
    const rows: Record<string, unknown>[] = [
      { indicador: "Experimentos cadastrados", valor: d.experimentos.cadastrados },
      { indicador: "Experimentos ativos", valor: d.experimentos.ativos },
      { indicador: "Experimentos acompanhados no período", valor: d.experimentos.acompanhados },
      { indicador: "Visitas planejadas", valor: d.visitas.planejadas },
      { indicador: "Visitas realizadas", valor: d.visitas.realizadas },
      { indicador: "Fichas conferidas/finalizadas", valor: d.visitas.fichasValidadas },
      { indicador: "Pendências abertas", valor: d.pendencias.abertas },
      { indicador: "Pendências resolvidas", valor: d.pendencias.resolvidas },
      { indicador: "Pendências vencidas", valor: d.pendencias.vencidas },
      { indicador: "Conteúdos produzidos", valor: d.conteudos.produzidos },
      { indicador: "Conteúdos conferidos", valor: d.conteudos.conferidos },
      { indicador: "Conteúdos validados", valor: d.conteudos.validados },
      { indicador: "Conteúdos liberados", valor: d.conteudos.liberados },
      { indicador: "Conteúdos publicados", valor: d.conteudos.publicados },
      { indicador: "Boletins publicados / meta", valor: `${d.boletins.publicados}/${d.boletins.meta}` },
      { indicador: "Dossiês emitidos", valor: d.dossies.emitidos },
      ...d.taxas.map((t) => ({ indicador: `Registros devidos atualizados ${t.mes}`, valor: t.percentual === null ? "sem elegíveis" : `${t.percentual}%`, detalhe: `${t.numerador}/${t.denominador}` })),
    ];
    return {
      name: "indicadores",
      csv: toCsv(
        [
          { key: "indicador", label: "Indicador" },
          { key: "valor", label: "Valor" },
          { key: "detalhe", label: "Numerador/denominador" },
        ],
        rows,
      ),
    };
  }
  return null;
}

export function csvResponse(name: string, csv: string, p?: { de: string; ate: string }) {
  const file = `bento-${name}${p ? `-${p.de}_${p.ate}` : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
