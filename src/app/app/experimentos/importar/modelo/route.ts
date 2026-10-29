import { getContext } from "@/lib/auth";
import { templateHeaders } from "@/lib/import";
import { csvCell } from "@/lib/text";
import { errorResponse } from "@/lib/pdf/respond";

// Modelo oficial de planilha para importação de experimentos (somente cabeçalhos, separador ";").
export async function GET() {
  const ctx = await getContext();
  if (!ctx?.orgId) return errorResponse("Não autenticado.", 401);
  const csv = "﻿" + templateHeaders().map(csvCell).join(";") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bento-modelo-importacao-experimentos.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
