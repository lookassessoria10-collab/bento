import type { NextRequest } from "next/server";
import { getContext } from "@/lib/auth";
import { buildCsv, csvResponse } from "@/lib/data/exports";
import { experimentFilters } from "@/lib/data/experiments";
import { errorResponse } from "@/lib/pdf/respond";

// Exporta a lista de experimentos com os mesmos filtros da tela (somente registros visíveis ao usuário).
export async function GET(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const f = experimentFilters(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const out = await buildCsv(ctx, "experimentos", { de: "2000-01-01", ate: "2100-01-01" }, f);
  return csvResponse(out!.name, out!.csv);
}
