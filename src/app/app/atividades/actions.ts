"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { localDate } from "@/lib/format";
import { reqText, taskSchema, uuid } from "@/lib/validation";

export async function createTask(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = taskSchema.parse(formToObject(fd));
    const row = assertOk(await ctx.supabase.from("tasks").insert({ ...input, organization_id: ctx.orgId }).select("id").single());
    revalidatePath("/app/atividades");
    return { ok: true, message: "Atividade criada.", redirectTo: `/app/atividades/${row.id}?ok=${encodeURIComponent("Atividade criada.")}` };
  });
}

export async function updateTask(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const input = taskSchema.parse(formToObject(fd));
    const res = await ctx.supabase.from("tasks").update(input).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para editar esta atividade.");
    revalidatePath("/app/atividades");
  }, "Atividade atualizada.");
}

/** Movimento no quadro Kanban: persiste situação e ordem, respeitando a RLS. */
export async function moveTask(id: string, status: string, ordem: number, motivo?: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        status: z.enum(["a_fazer", "em_andamento", "aguardando_terceiro", "concluida", "cancelada"]),
        ordem: z.number().finite(),
        motivo: z.string().trim().max(1000).optional(),
      })
      .parse({ id, status, ordem, motivo });
    const patch: { status: typeof input.status; ordem: number; motivo_bloqueio?: string } = { status: input.status, ordem: input.ordem };
    if (input.status === "aguardando_terceiro") {
      if (!input.motivo) throw new UserError("Informe o que está pendente com terceiros.");
      patch.motivo_bloqueio = input.motivo;
    }
    const res = await ctx.supabase.from("tasks").update(patch).eq("id", input.id).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para mover esta atividade.");
    revalidatePath("/app/atividades");
  }, "Atividade movida.");
}

export async function addTaskComment(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ task_id: uuid, texto: reqText(1, 4000, "Escreva o comentário.") }).parse(formToObject(fd));
    assertOk(await ctx.supabase.from("task_comments").insert({ ...input, organization_id: ctx.orgId }));
  }, "Comentário adicionado.");
}

export async function addChecklistItem(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ task_id: uuid, texto: reqText(1, 300, "Descreva o item.") }).parse(formToObject(fd));
    assertOk(await ctx.supabase.from("task_checklist_items").insert({ ...input, organization_id: ctx.orgId }));
  }, "Item adicionado.");
}

export async function toggleChecklistItem(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    assertOk(await ctx.supabase.from("task_checklist_items").update({ feito: fd.get("feito") === "true" }).eq("id", id));
  }, "Item atualizado.");
}

export async function generateRoutines(): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const mes = `${localDate().slice(0, 7)}-01`;
    const n = assertOk(await ctx.supabase.rpc("generate_recurring_tasks", { p_org: ctx.orgId, p_mes: mes }));
    revalidatePath("/app/atividades");
    return { ok: true, message: n ? `${n} atividade(s) de rotina criada(s) para este mês.` : "As rotinas deste mês já estavam criadas (nenhuma duplicata)." };
  });
}
