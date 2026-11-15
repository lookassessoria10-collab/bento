import { getContext, has } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { PHASE_LABELS } from "@/lib/labels";
import { loadGestao } from "@/lib/data/gestao";
import { INCIDENT_STATUS_LABELS, SEVERITY_LABELS, applyFilters, parseFilters } from "@/lib/gestao";
import { csvResponse } from "@/lib/data/exports";
import { toCsv } from "@/lib/text";

// CSV das tabelas do painel: mesmos filtros e mesma RLS; na demonstração cada linha carrega "DADOS SIMULADOS".
export async function GET(request: Request) {
  const ctx = await getContext();
  if (!ctx?.orgId) return new Response("Não autenticado", { status: 401 });
  if (!has(ctx, "gestao.painel") || !has(ctx, "relatorios.exportar_interno")) return new Response("Sem permissão", { status: 403 });
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "experimentos";
  const f = parseFilters(Object.fromEntries(url.searchParams));
  const load = await loadGestao(ctx);
  if (load.error) return new Response("Falha ao carregar os registros", { status: 500 });
  const d = applyFilters(load.data, f);
  const natureza = load.demo ? "DADOS SIMULADOS" : "Registro do Bento";
  const byId = new Map(load.data.experiments.map((e) => [e.id, e]));
  const prefix = load.demo ? "demo-gestao" : "gestao";

  if (tipo === "experimentos") {
    const cols = [
      { key: "natureza", label: "Natureza dos dados" },
      { key: "codigo", label: "Código" },
      { key: "titulo", label: "Título" },
      { key: "cultura", label: "Cultura" },
      { key: "area", label: "Área temática" },
      { key: "responsavel", label: "Responsável" },
      { key: "setor", label: "Setor" },
      { key: "inicio", label: "Início" },
      { key: "status", label: "Status" },
      { key: "visitas", label: "Visitas no período" },
      { key: "ocorrencias", label: "Ocorrências abertas" },
    ];
    const rows = d.experiments.map((e) => ({
      natureza,
      codigo: e.codigo,
      titulo: e.titulo,
      cultura: e.culturas.join(", "),
      area: e.area_tematica,
      responsavel: e.responsavel,
      setor: e.setor,
      inicio: fmtDate(e.data_inicio),
      status: PHASE_LABELS[e.fase],
      visitas: d.visits.filter((v) => v.experiment_id === e.id).length,
      ocorrencias: d.incidents.filter((i) => i.experiment_id === e.id && i.status === "aberta").length,
    }));
    return csvResponse(`${prefix}-ensaios`, toCsv(cols, rows));
  }
  if (tipo === "ocorrencias") {
    const cols = [
      { key: "natureza", label: "Natureza dos dados" },
      { key: "codigo", label: "Ensaio" },
      { key: "data", label: "Detectada em" },
      { key: "titulo", label: "Ocorrência" },
      { key: "gravidade", label: "Gravidade" },
      { key: "descricao", label: "Descrição" },
      { key: "consequencia", label: "Consequência" },
      { key: "providencia", label: "Providência" },
      { key: "status", label: "Status" },
      { key: "resolvida", label: "Resolvida em" },
    ];
    const rows = d.incidents.map((i) => ({
      natureza,
      codigo: byId.get(i.experiment_id)?.codigo,
      data: fmtDate(i.detectada_em),
      titulo: i.titulo,
      gravidade: SEVERITY_LABELS[i.gravidade],
      descricao: i.descricao,
      consequencia: i.consequencia,
      providencia: i.providencia,
      status: INCIDENT_STATUS_LABELS[i.status],
      resolvida: i.resolvida_em && fmtDate(i.resolvida_em),
    }));
    return csvResponse(`${prefix}-ocorrencias`, toCsv(cols, rows));
  }
  if (tipo === "medicoes") {
    const cols = [
      { key: "natureza", label: "Natureza dos dados" },
      { key: "codigo", label: "Ensaio" },
      { key: "data", label: "Data" },
      { key: "variavel", label: "Variável" },
      { key: "valor", label: "Valor" },
      { key: "unidade", label: "Unidade" },
      { key: "ausencia", label: "Motivo da ausência" },
    ];
    // valor ausente sai vazio (nunca zero), com o motivo ao lado
    const code = (id: string) => byId.get(id)?.codigo ?? "";
    const sorted = [...d.measurements].sort((a, b) => code(a.experiment_id).localeCompare(code(b.experiment_id)) || a.data_medicao.localeCompare(b.data_medicao));
    const rows = sorted.map((m) => ({
      natureza,
      codigo: byId.get(m.experiment_id)?.codigo,
      data: fmtDate(m.data_medicao),
      variavel: m.variavel,
      valor: m.valor === null ? "" : String(m.valor).replace(".", ","),
      unidade: m.unidade,
      ausencia: m.motivo_ausencia,
    }));
    return csvResponse(`${prefix}-medicoes`, toCsv(cols, rows));
  }
  return new Response("Tipo inválido", { status: 400 });
}
