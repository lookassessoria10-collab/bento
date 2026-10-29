"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { CHANNELS, multi, optDate, optText, resultSchema, uuid } from "@/lib/validation";

export async function createResult(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = resultSchema.parse(formToObject(fd));
    const row = assertOk(await ctx.supabase.from("result_summaries").insert({ ...input, organization_id: ctx.orgId }).select("id").single());
    revalidatePath("/app/resultados");
    return { ok: true, message: "Resultado registrado.", redirectTo: `/app/resultados?resultado=${row.id}&ok=${encodeURIComponent("Resultado registrado.")}` };
  });
}

export async function updateResult(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const { experiment_id: _ignored, ...input } = resultSchema.parse(formToObject(fd));
    void _ignored;
    const res = await ctx.supabase.from("result_summaries").update(input).eq("id", id).select("id, validacao_status");
    const rows = assertOk(res);
    if (!rows.length) throw new UserError("Você não tem permissão para editar este resultado.");
    revalidatePath("/app/resultados");
    return { ok: true, message: "Resultado atualizado. Alterações na interpretação geram nova versão e exigem nova conferência/validação." };
  });
}

export async function resultTransition(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        acao: z.enum(["conferir", "devolver", "validar", "revogar"]),
        motivo: optText(2000),
        escopo: multi(CHANNELS),
      })
      .parse(formToObject(fd));
    assertOk(
      await ctx.supabase.rpc("result_transition", {
        p_result: input.id,
        p_acao: input.acao,
        p_motivo: input.motivo ?? undefined,
        p_escopo: input.escopo.length ? input.escopo : ["interno"],
      }),
    );
    revalidatePath("/app/resultados");
    const msg = { conferir: "Resultado conferido.", devolver: "Resultado devolvido.", validar: "Resultado validado pelo responsável.", revogar: "Validação revogada." };
    return { ok: true, message: msg[input.acao] };
  });
}

export async function resultExternalValidation(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        person_id: uuid,
        comprovante_id: uuid,
        metodo: z.string().trim().min(3, "Informe o método de confirmação.").max(300),
        data: optDate.refine((v) => !!v, "Informe a data."),
        escopo: multi(CHANNELS),
      })
      .parse(formToObject(fd));
    assertOk(
      await ctx.supabase.rpc("result_external_validation", {
        p_result: input.id,
        p_person: input.person_id,
        p_comprovante: input.comprovante_id,
        p_metodo: input.metodo,
        p_data: input.data!,
        p_escopo: input.escopo,
      }),
    );
    revalidatePath("/app/resultados");
  }, "Validação externa documentada registrada.");
}
