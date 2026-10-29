"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { experimentSchema, optDate, optText, optUuid, reqText, uuid } from "@/lib/validation";

export async function createExperiment(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = experimentSchema.parse(formToObject(fd));
    const row = assertOk(
      await ctx.supabase
        .from("experiments")
        .insert({ ...input, organization_id: ctx.orgId, codigo: "", codigo_seq: 0 })
        .select("id, codigo")
        .single(),
    );
    revalidatePath("/app/experimentos");
    return {
      ok: true,
      message: `Experimento ${row.codigo} cadastrado.`,
      redirectTo: `/app/experimentos/${row.id}?ok=${encodeURIComponent(`Experimento ${row.codigo} cadastrado.`)}`,
    };
  });
}

export async function updateExperiment(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const input = experimentSchema.parse(formToObject(fd));
    const res = await ctx.supabase.from("experiments").update(input).eq("id", id).eq("organization_id", ctx.orgId).select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para editar este experimento.");
    revalidatePath(`/app/experimentos/${id}`);
    return { ok: true, message: "Alterações salvas.", redirectTo: `/app/experimentos/${id}?ok=${encodeURIComponent("Alterações salvas.")}` };
  });
}

export async function archiveExperiment(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const archive = fd.get("acao") !== "restaurar";
    const res = await ctx.supabase
      .from("experiments")
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("organization_id", ctx.orgId)
      .select("id");
    if (!assertOk(res).length) throw new UserError("Você não tem permissão para arquivar este experimento.");
    revalidatePath("/app/experimentos");
    return { ok: true, message: archive ? "Experimento arquivado (histórico preservado)." : "Experimento restaurado." };
  });
}

/** Clona apenas a estrutura de campos (sem dados científicos, pessoas, contatos ou publicações). */
export async function cloneExperimentTemplate(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const src = assertOk(
      await ctx.supabase
        .from("experiments")
        .select("titulo, area_tematica, linhas_pesquisa, culturas, periodicidade_acompanhamento, farm_id, nivel_acesso, observacoes_escopo")
        .eq("id", id)
        .single(),
    );
    const row = assertOk(
      await ctx.supabase
        .from("experiments")
        .insert({
          organization_id: ctx.orgId,
          codigo: "",
          codigo_seq: 0,
          titulo: `Novo experimento (modelo de ${src.titulo.slice(0, 60)})`,
          area_tematica: src.area_tematica,
          linhas_pesquisa: src.linhas_pesquisa,
          culturas: src.culturas,
          periodicidade_acompanhamento: src.periodicidade_acompanhamento,
          farm_id: src.farm_id,
          nivel_acesso: src.nivel_acesso,
          observacoes_escopo: src.observacoes_escopo,
          disponibilidade: "nao_informado",
        })
        .select("id, codigo")
        .single(),
    );
    return { ok: true, message: `Rascunho ${row.codigo} criado a partir do modelo.`, redirectTo: `/app/experimentos/${row.id}/editar` };
  });
}

export async function addExperimentMember(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        experiment_id: uuid,
        user_id: optUuid,
        person_id: optUuid,
        acesso: z.enum(["proprietario", "colaborador", "revisor", "visualizador"]),
        funcao: z.enum(["pesquisador_principal", "colaborador", "equipe_tecnica", "estudante", "orientador", "outro"]),
      })
      .refine((d) => d.user_id || d.person_id, { message: "Selecione uma pessoa ou um usuário.", path: ["user_id"] })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("experiment_members").insert({ ...input, organization_id: ctx.orgId }));
    revalidatePath(`/app/experimentos/${input.experiment_id}`);
  }, "Participante vinculado.");
}

export async function updateExperimentMember(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const ativo = fd.get("ativo") === "true";
    const acesso = z.enum(["proprietario", "colaborador", "revisor", "visualizador"]).parse(fd.get("acesso"));
    const res = await ctx.supabase.from("experiment_members").update({ ativo, acesso }).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Somente a gestão pode alterar vínculos (e não o próprio).");
  }, "Vínculo atualizado.");
}

export async function addTreatment(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ experiment_id: uuid, codigo: optText(40), descricao: reqText(1, 1000, "Descreva o tratamento."), fonte: optText(300) })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("experiment_treatments").insert({ ...input, organization_id: ctx.orgId }));
  }, "Tratamento registrado conforme descrito pelo responsável.");
}

export async function deleteTreatment(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    assertOk(await ctx.supabase.from("experiment_treatments").delete().eq("id", uuid.parse(fd.get("id"))));
  }, "Tratamento removido.");
}

export async function addMilestone(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        experiment_id: uuid,
        titulo: reqText(2, 200, "Informe o marco."),
        tipo: z.enum(["etapa", "avaliacao", "marco"]),
        data_prevista: optDate,
        observacao: optText(1000),
      })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("experiment_milestones").insert({ ...input, organization_id: ctx.orgId }));
  }, "Etapa adicionada.");
}

export async function updateMilestone(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const status = z.enum(["prevista", "realizada", "adiada", "cancelada"]).parse(fd.get("status"));
    assertOk(
      await ctx.supabase
        .from("experiment_milestones")
        .update({ status, data_realizada: status === "realizada" ? new Date().toISOString().slice(0, 10) : null })
        .eq("id", id),
    );
  }, "Etapa atualizada.");
}
