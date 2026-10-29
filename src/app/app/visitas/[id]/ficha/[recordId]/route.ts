import { renderToBuffer } from "@react-pdf/renderer";
import { getContext } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { RECORD_STATUS_LABELS } from "@/lib/labels";
import { listMembers } from "@/lib/data/lookups";
import { VisitRecordPdf } from "@/lib/pdf/documents";
import { errorResponse, pdfResponse } from "@/lib/pdf/respond";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: RouteContext<"/app/visitas/[id]/ficha/[recordId]">) {
  const { id, recordId } = await params;
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const { data: r } = await ctx.supabase
    .from("visit_records")
    .select(
      "*, visit_schedules(titulo, data_hora, local, status, interlocutores, visit_participants(people:people!visit_participants_person_id_organization_id_fkey(nome))), experiments(codigo, codigo_institucional, titulo, is_demo, people:people!experiments_pesquisador_principal_id_organization_id_fkey(nome)), informante:people!visit_records_informante_person_id_organization_id_fkey(nome), visit_checklist_items(item, resposta, observacao, ordem)",
    )
    .eq("id", recordId)
    .eq("visit_id", id)
    .maybeSingle();
  if (!r) return errorResponse("Ficha não encontrada ou sem acesso.", 404);
  const members = await listMembers(ctx);
  const name = (uid: string | null) => (uid ? members.find((m) => m.id === uid)?.nome ?? null : null);
  const v = r.visit_schedules as unknown as {
    titulo: string;
    data_hora: string;
    local: string | null;
    status: string;
    interlocutores: string | null;
    visit_participants: { people: { nome: string } | null }[];
  };
  const e = r.experiments as unknown as { codigo: string; codigo_institucional: string | null; titulo: string; is_demo: boolean; people: { nome: string } | null };
  const buf = await renderToBuffer(
    VisitRecordPdf({
      data: {
        visita: v,
        experimento: { codigo: e.codigo, codigo_institucional: e.codigo_institucional, titulo: e.titulo, responsavel: e.people?.nome ?? null },
        participantes: v.visit_participants.map((p) => p.people?.nome).filter((x): x is string => !!x),
        r: {
          objetivo: r.objetivo,
          etapa_atual: r.etapa_atual,
          atividades_desde_ultima: r.atividades_desde_ultima,
          avaliacoes_previstas: r.avaliacoes_previstas,
          avaliacoes_realizadas: r.avaliacoes_realizadas,
          ocorrencias_relatadas: r.ocorrencias_relatadas,
          informante: (r.informante as unknown as { nome: string } | null)?.nome ?? r.informante_descricao,
          observacoes_diretas: r.observacoes_diretas,
          resultados_disponibilizados: r.resultados_disponibilizados,
          situacao_analise: r.situacao_analise,
          fontes: r.fontes,
          conteudo_potencial: r.conteudo_potencial,
          proxima_acao: r.proxima_acao,
          proxima_acao_responsavel: name(r.proxima_acao_responsavel),
          proxima_acao_prazo: r.proxima_acao_prazo,
          status_label: RECORD_STATUS_LABELS[r.status],
          conferido_por: name(r.conferido_por),
          conferido_em: r.conferido_em ? fmtDateTime(r.conferido_em) : null,
          comentario_conferencia: r.comentario_conferencia,
        },
        checklist: (r.visit_checklist_items as unknown as { item: string; resposta: string; observacao: string | null; ordem: number }[]).sort((a, b) => a.ordem - b.ordem),
      },
      meta: {
        titulo: `Ficha de visita ${e.codigo}`,
        identificador: `Ficha ${e.codigo} · ${RECORD_STATUS_LABELS[r.status]}`,
        geradoPor: ctx.nome,
        geradoEm: new Date().toISOString(),
        rascunho: r.status !== "finalizada",
        demo: e.is_demo,
        assinatura: ctx.settings?.assinatura,
      },
    }),
  );
  return pdfResponse(buf, `${e.codigo}-ficha-visita.pdf`);
}
