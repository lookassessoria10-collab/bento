"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { localDate, localInputToIso } from "@/lib/format";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { optDate, optText, optUuid, reqText, uuid } from "@/lib/validation";
import type { Database } from "@/lib/supabase/database.types";

const TIPOS = ["avaliacao", "reuniao_revisao", "coleta", "prazo_entrega", "marco_encerramento", "outro"] as const;
const hora = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida.").nullable());

/** Novo compromisso (visitas continuam sendo agendadas no módulo de Acompanhamentos, sem duplicação). */
export async function createCalendarEvent(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("agenda.gerenciar");
    const v = z
      .object({
        tipo: z.enum(TIPOS, { message: "Escolha o tipo." }),
        titulo: reqText(3, 200),
        experiment_id: optUuid,
        data_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data prevista."),
        hora_inicio: hora,
        hora_fim: hora,
        status: z.enum(["planejado", "confirmado"]),
        responsavel_id: optUuid,
        local_geral: optText(200),
        observacoes: optText(2000),
      })
      .superRefine((x, c) => {
        if (x.hora_fim && !x.hora_inicio) c.addIssue({ code: "custom", path: ["hora_inicio"], message: "Informe o início para usar o término." });
        if (x.hora_inicio && x.hora_fim && x.hora_fim < x.hora_inicio) c.addIssue({ code: "custom", path: ["hora_fim"], message: "O término deve ser depois do início." });
      })
      .parse(formToObject(fd));
    const diaInteiro = !v.hora_inicio;
    const res = await ctx.supabase
      .from("calendar_events")
      .insert({
        organization_id: ctx.orgId,
        tipo: v.tipo,
        titulo: v.titulo,
        experiment_id: v.experiment_id,
        data_prevista: v.data_prevista,
        dia_inteiro: diaInteiro,
        inicio: diaInteiro ? null : localInputToIso(`${v.data_prevista}T${v.hora_inicio}`),
        fim: v.hora_fim ? localInputToIso(`${v.data_prevista}T${v.hora_fim}`) : null,
        status: v.status,
        responsavel_id: v.responsavel_id,
        local_geral: v.local_geral,
        observacoes: v.observacoes,
      })
      .select("id")
      .single();
    const row = assertOk(res);
    revalidatePath("/app/calendario");
    return { ok: true, message: "Compromisso criado.", redirectTo: `/app/calendario?evento=${row.id}` };
  });
}

/** Confirmar, reagendar, concluir ou cancelar. O banco guarda o histórico (de → para, quem, quando). */
export async function updateCalendarEvent(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requirePermission("agenda.gerenciar");
    const v = z
      .object({
        id: uuid,
        acao: z.enum(["confirmar", "reagendar", "concluir", "cancelar"]),
        nova_data: optDate,
        realizado_em: optDate,
        motivo: optText(500),
      })
      .parse(formToObject(fd));
    const today = localDate();
    let patch: Database["public"]["Tables"]["calendar_events"]["Update"];
    if (v.acao === "confirmar") patch = { status: "confirmado" };
    else if (v.acao === "reagendar") {
      if (!v.nova_data) throw new UserError("Informe a nova data.");
      patch = { status: "reagendado", data_prevista: v.nova_data, motivo_status: v.motivo, inicio: null, fim: null, dia_inteiro: true };
    } else if (v.acao === "concluir") {
      const quando = v.realizado_em ?? today;
      if (quando > today) throw new UserError("Um compromisso não pode ser concluído em data futura.");
      patch = { status: "realizado", realizado_em: quando, motivo_status: v.motivo };
    } else {
      if (!v.motivo) throw new UserError("Informe o motivo do cancelamento.");
      patch = { status: "cancelado", motivo_status: v.motivo };
    }
    const { error, count } = await ctx.supabase.from("calendar_events").update(patch, { count: "exact" }).eq("id", v.id).eq("organization_id", ctx.orgId);
    if (error) throw new UserError(error.message.includes("futura") ? "Um compromisso não pode ser concluído em data futura." : "Não foi possível atualizar o compromisso.");
    if (!count) throw new UserError("Compromisso não encontrado ou sem permissão.");
    revalidatePath("/app/calendario");
    return { ok: true, message: { confirmar: "Compromisso confirmado.", reagendar: "Compromisso reagendado.", concluir: "Compromisso registrado como realizado.", cancelar: "Compromisso cancelado." }[v.acao] };
  });
}
