import type { NextRequest } from "next/server";
import { getContext } from "@/lib/auth";
import { buildCsv, csvResponse } from "@/lib/data/exports";
import { reportPeriod } from "@/lib/data/reports";
import { errorResponse } from "@/lib/pdf/respond";

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const p = reportPeriod(sp, ctx.settings?.piloto_inicio ?? null);
  const out = await buildCsv(ctx, sp.tipo ?? "", p);
  if (!out) return errorResponse("Tipo de exportação inválido.", 400);
  return csvResponse(out.name, out.csv, p);
}
