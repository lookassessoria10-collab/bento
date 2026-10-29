"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { assertOk, run, UserError, type ActionResult } from "@/lib/actions";
import { prepareImport, sameName, type ImportRowResult } from "@/lib/import";
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
    // pesquisador principal: vínculo somente com pessoa já cadastrada (nome igual, sem acento/maiúsculas)
    const { data: people } = await ctx.supabase.from("people").select("id, nome").eq("organization_id", ctx.orgId);
    let ok = 0;
    for (const v of valid) {
      const dados = { ...(v.dados as { titulo: string; fonte_cadastro?: string; data_informacao?: string; observacoes_escopo?: string }) };
      let pesquisadorId: string | null = null;
      if (v.pesquisador) {
        pesquisadorId = (people ?? []).find((pp) => sameName(pp.nome, v.pesquisador!))?.id ?? null;
        if (!pesquisadorId) {
          const nota = `Pesquisador principal informado (não cadastrado em Pessoas): ${v.pesquisador}`;
          dados.observacoes_escopo = dados.observacoes_escopo ? `${dados.observacoes_escopo}\n${nota}` : nota;
        }
      }
      const res = await ctx.supabase
        .from("experiments")
        .insert({
          ...dados,
          organization_id: ctx.orgId,
          codigo: "",
          codigo_seq: 0,
          import_batch_id: batch.id,
          pesquisador_principal_id: pesquisadorId,
          fonte_cadastro: dados.fonte_cadastro ?? `Importação: ${p.arquivo}`,
          disponibilidade: "pendente_conferencia",
          data_informacao: dados.data_informacao ?? new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (res.error || !res.data) continue;
      ok++;
      if (v.tratamentos?.length) {
        await ctx.supabase.from("experiment_treatments").insert(
          v.tratamentos.map((t, ordem) => ({
            organization_id: ctx.orgId,
            experiment_id: res.data.id,
            codigo: t.codigo,
            descricao: t.descricao,
            fonte: dados.fonte_cadastro ?? `Importação: ${p.arquivo}`,
            ordem,
          })),
        );
      }
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
