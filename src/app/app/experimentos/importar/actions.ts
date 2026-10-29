"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { assertOk, run, UserError, type ActionResult } from "@/lib/actions";
import { prepareImport, type ImportRowResult } from "@/lib/import";
import type { Json } from "@/lib/supabase/database.types";

const input = z.object({
  arquivo: z.string().max(200),
  rows: z.array(z.record(z.string(), z.unknown())).max(2000),
  mapping: z.record(z.string(), z.string()),
  confirmar: z.boolean(),
});

async function existingCodes(ctx: Awaited<ReturnType<typeof requirePermission>>) {
  const { data } = await ctx.supabase.from("experiments").select("codigo_institucional").eq("organization_id", ctx.orgId).not("codigo_institucional", "is", null);
  return new Set((data ?? []).map((d) => String(d.codigo_institucional).trim().toLowerCase()));
}

/** Pré-validação no servidor (não grava nada). */
export async function previewImport(payload: unknown): Promise<ActionResult & { results?: ImportRowResult[] }> {
  let results: ImportRowResult[] | undefined;
  const r = await run(async () => {
    const ctx = await requirePermission("experimentos.importar");
    const p = input.parse(payload);
    results = prepareImport(p.rows, p.mapping, await existingCodes(ctx));
    return { ok: true, message: "Prévia gerada." };
  });
  return { ...r, results };
}

/** Importa somente linhas válidas, registra o lote e o relatório completo. */
export async function runImport(payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("experimentos.importar");
    const p = input.parse(payload);
    if (!p.confirmar) throw new UserError("Confirme a importação.");
    const results = prepareImport(p.rows, p.mapping, await existingCodes(ctx));
    const valid = results.filter((x) => x.status === "valida");
    const batch = assertOk(
      await ctx.supabase
        .from("import_batches")
        .insert({
          organization_id: ctx.orgId,
          arquivo_nome: p.arquivo,
          total_linhas: results.length,
          importadas: 0,
          invalidas: results.filter((x) => x.status === "invalida").length,
          duplicadas: results.filter((x) => x.status === "duplicada").length,
          relatorio: results.map(({ linha, status, erros }) => ({ linha, status, erros })) as unknown as NonNullable<Json>,
          criado_por: ctx.userId,
        })
        .select("id")
        .single(),
    );
    let ok = 0;
    for (const v of valid) {
      const res = await ctx.supabase.from("experiments").insert({
        ...(v.dados as { titulo: string }),
        organization_id: ctx.orgId,
        codigo: "",
        codigo_seq: 0,
        import_batch_id: batch.id,
        fonte_cadastro: `Importação: ${p.arquivo}`,
        disponibilidade: "pendente_conferencia",
        data_informacao: new Date().toISOString().slice(0, 10),
      });
      if (!res.error) ok++;
    }
    revalidatePath("/app/experimentos");
    return {
      ok: true,
      message: `${ok} experimento(s) importado(s); ${results.length - valid.length} linha(s) não importada(s) (veja o relatório do lote).`,
      redirectTo: "/app/experimentos/importar?ok=" + encodeURIComponent(`Lote registrado: ${ok} importado(s).`),
    };
  });
}

export async function undoImport(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("experimentos.importar");
    const id = z.string().uuid().parse(fd.get("id"));
    const n = assertOk(await ctx.supabase.rpc("undo_import", { p_batch: id }));
    revalidatePath("/app/experimentos/importar");
    return { ok: true, message: `Lote desfeito: ${n} experimento(s) arquivado(s).` };
  });
}
