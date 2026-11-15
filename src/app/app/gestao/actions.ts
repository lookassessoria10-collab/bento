"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { formToObject, run, UserError, type ActionResult } from "@/lib/actions";

const num = z.coerce.number().min(0, "Use um valor maior ou igual a zero.").max(10000, "Valor muito alto.");

/** Premissas da estimativa de tempo: só na organização de demonstração (a RLS e um gatilho repetem a regra no banco). */
export async function saveTimeAssumptions(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("gestao.premissas_demo");
    if (!ctx.orgIsDemo) throw new UserError("As premissas simuladas só podem ser editadas no ambiente de demonstração.");
    const raw = formToObject(fd);
    const ids = Object.keys(raw)
      .filter((k) => k.startsWith("eventos_mes:"))
      .map((k) => k.split(":")[1]);
    if (!ids.length || ids.length > 50) throw new UserError("Nenhuma premissa enviada.");
    for (const id of ids) {
      if (!z.string().uuid().safeParse(id).success) throw new UserError("Premissa inválida.");
      const v = z.object({ eventos_mes: num, minutos_antes: num, minutos_bento: num }).parse({
        eventos_mes: raw[`eventos_mes:${id}`],
        minutos_antes: raw[`minutos_antes:${id}`],
        minutos_bento: raw[`minutos_bento:${id}`],
      });
      const { error, count } = await ctx.supabase.from("demo_time_assumptions").update(v, { count: "exact" }).eq("id", id).eq("organization_id", ctx.orgId);
      if (error) throw new UserError("Não foi possível salvar as premissas.");
      if (!count) throw new UserError("Sem permissão para alterar estas premissas.");
    }
    revalidatePath("/app/gestao");
    return { ok: true, message: "Premissas atualizadas. A estimativa foi recalculada (simulação)." };
  });
}
