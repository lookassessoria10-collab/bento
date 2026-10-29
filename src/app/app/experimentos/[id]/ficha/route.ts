import { renderToBuffer } from "@react-pdf/renderer";
import { getContext } from "@/lib/auth";
import { ExperimentSheetPdf } from "@/lib/pdf/documents";
import { errorResponse, pdfResponse } from "@/lib/pdf/respond";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: RouteContext<"/app/experimentos/[id]/ficha">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const { data: e } = await ctx.supabase
    .from("experiments")
    .select("*, people:people!experiments_pesquisador_principal_id_organization_id_fkey(nome), farms:farms!experiments_farm_id_organization_id_fkey(nome), farm_areas:farm_areas!experiments_farm_area_id_organization_id_fkey(nome)")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  if (!e) return errorResponse("Experimento não encontrado ou sem acesso.", 404);
  const [{ data: treatments }, { data: milestones }] = await Promise.all([
    ctx.supabase.from("experiment_treatments").select("codigo, descricao, fonte").eq("experiment_id", id).order("ordem"),
    ctx.supabase.from("experiment_milestones").select("titulo, data_prevista, status").eq("experiment_id", id).order("data_prevista"),
  ]);
  const buf = await renderToBuffer(
    ExperimentSheetPdf({
      data: {
        e: {
          ...e,
          pesquisador: (e.people as unknown as { nome: string } | null)?.nome ?? null,
          fazenda: (e.farms as unknown as { nome: string } | null)?.nome ?? null,
          area: (e.farm_areas as unknown as { nome: string } | null)?.nome ?? null,
        },
        treatments: treatments ?? [],
        milestones: milestones ?? [],
      },
      meta: {
        titulo: `Ficha ${e.codigo}`,
        identificador: `Ficha do experimento ${e.codigo}`,
        geradoPor: ctx.nome,
        geradoEm: new Date().toISOString(),
        rascunho: true,
        demo: e.is_demo,
        assinatura: ctx.settings?.assinatura,
      },
    }),
  );
  return pdfResponse(buf, `${e.codigo}-ficha.pdf`);
}
