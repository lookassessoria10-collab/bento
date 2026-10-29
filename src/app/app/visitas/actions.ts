"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { localInputToIso } from "@/lib/format";
import { optText, uuid, visitRecordSchema, visitSchema, optDate, optUuid } from "@/lib/validation";

export async function createVisit(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = visitSchema.parse(formToObject(fd));
    const visit = assertOk(
      await ctx.supabase
        .from("visit_schedules")
        .insert({
          organization_id: ctx.orgId,
          titulo: input.titulo,
          data_hora: localInputToIso(input.data_hora),
          local: input.local,
          farm_id: input.farm_id,
          interlocutores: input.interlocutores,
          lembrete: input.lembrete,
          checklist_template_id: input.checklist_template_id,
        })
        .select("id")
        .single(),
    );
    assertOk(
      await ctx.supabase
        .from("visit_schedule_experiments")
        .insert(input.experiment_ids.map((experiment_id) => ({ visit_id: visit.id, experiment_id, organization_id: ctx.orgId }))),
    );
    // uma ficha individual por experimento
    const records = assertOk(
      await ctx.supabase
        .from("visit_records")
        .insert(input.experiment_ids.map((experiment_id) => ({ organization_id: ctx.orgId, visit_id: visit.id, experiment_id })))
        .select("id"),
    );
    if (input.checklist_template_id) {
      const tpl = assertOk(
        await ctx.supabase.from("visit_checklist_templates").select("itens").eq("id", input.checklist_template_id).single(),
      );
      const itens = (tpl.itens as string[]).slice(0, 50);
      if (itens.length) {
        assertOk(
          await ctx.supabase.from("visit_checklist_items").insert(
            records.flatMap((r) => itens.map((item, ordem) => ({ organization_id: ctx.orgId, visit_record_id: r.id, item, ordem }))),
          ),
        );
      }
    }
    const participants = z.array(uuid).catch([]).parse([fd.getAll("participantes")].flat());
    if (participants.length) {
      await ctx.supabase
        .from("visit_participants")
        .insert(participants.map((person_id) => ({ organization_id: ctx.orgId, visit_id: visit.id, person_id, papel: "estudante" as const })));
    }
    revalidatePath("/app/visitas");
    return { ok: true, message: "Visita agendada.", redirectTo: `/app/visitas/${visit.id}?ok=${encodeURIComponent("Visita agendada.")}` };
  });
}

export async function updateVisitStatus(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        status: z.enum(["planejada", "confirmada", "realizada", "adiada", "cancelada"]),
        motivo_status: optText(1000),
        nova_data: z.preprocess((v) => (v === "" ? null : v), z.string().nullable()),
      })
      .parse(formToObject(fd));
    if ((input.status === "adiada" || input.status === "cancelada") && !input.motivo_status) {
      return { ok: false, message: "Informe o motivo.", fieldErrors: { motivo_status: "Informe o motivo para adiar ou cancelar." } };
    }
    const patch: { status: typeof input.status; motivo_status: string | null; data_hora?: string } = {
      status: input.status,
      motivo_status: input.motivo_status,
    };
    if (input.status === "adiada" && input.nova_data) patch.data_hora = localInputToIso(input.nova_data);
    const res = await ctx.supabase.from("visit_schedules").update(patch).eq("id", input.id).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para alterar esta visita.");
    revalidatePath(`/app/visitas/${input.id}`);
  }, "Situação da visita atualizada.");
}

export async function saveVisitRecord(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const input = visitRecordSchema.parse(formToObject(fd));
    const res = await ctx.supabase.from("visit_records").update(input).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para editar esta ficha.");
  }, "Ficha salva no servidor.");
}

export async function visitRecordTransition(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const acao = z.enum(["enviar", "conferir", "devolver", "finalizar"]).parse(fd.get("acao"));
    const comentario = optText(2000).parse(fd.get("comentario"));
    const res = await ctx.supabase.rpc("visit_record_transition", { p_record: id, p_acao: acao, p_comentario: comentario ?? undefined });
    assertOk(res);
    const labels = { enviar: "Ficha enviada para conferência.", conferir: "Ficha conferida.", devolver: "Ficha devolvida com justificativa.", finalizar: "Ficha finalizada." };
    return { ok: true, message: labels[acao] };
  });
}

export async function saveChecklist(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const ids = fd.getAll("item_id").map((v) => uuid.parse(v));
    for (const id of ids) {
      const resposta = z.enum(["sim", "nao", "nao_se_aplica", "pendente"]).parse(fd.get(`resposta_${id}`));
      const observacao = optText(500).parse(fd.get(`obs_${id}`));
      assertOk(await ctx.supabase.from("visit_checklist_items").update({ resposta, observacao }).eq("id", id));
    }
  }, "Roteiro salvo.");
}

/** Cria tarefa a partir da pendência registrada na ficha, preservando o vínculo. */
export async function createTaskFromRecord(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ record_id: uuid, titulo: z.string().trim().min(2).max(300), responsavel_id: optUuid, prazo: optDate })
      .parse(formToObject(fd));
    const rec = assertOk(await ctx.supabase.from("visit_records").select("experiment_id").eq("id", input.record_id).single());
    assertOk(
      await ctx.supabase.from("tasks").insert({
        organization_id: ctx.orgId,
        titulo: input.titulo,
        responsavel_id: input.responsavel_id,
        prazo: input.prazo,
        experiment_id: rec.experiment_id,
        visit_record_id: input.record_id,
        origem: "pendencia_visita",
        categoria: "visita",
      }),
    );
    revalidatePath("/app/atividades");
  }, "Atividade criada a partir da pendência.");
}
