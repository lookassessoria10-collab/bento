"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireContext, ORG_COOKIE } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { bool, optDate, optInt, optText, optUuid, reqText, uuid } from "@/lib/validation";

export async function saveProjectSettings(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        nome_projeto: reqText(2, 200),
        assinatura: reqText(2, 200),
        piloto_inicio: optDate,
        piloto_meses: optInt(1, 36),
        piloto_prorrogacao_meses: optInt(0, 36),
        meta_boletins: optInt(0, 24),
        portal_publico_ativo: bool,
        feedback_publico_ativo: bool,
        exibir_marcas_institucionais: bool,
        contato_institucional: optText(500),
        politica_editorial: optText(4000),
        limite_upload_mb: optInt(1, 50),
        onboarding_concluido: bool,
      })
      .parse(formToObject(fd));
    const res = await ctx.supabase
      .from("project_settings")
      .update({
        ...input,
        piloto_meses: input.piloto_meses ?? 6,
        piloto_prorrogacao_meses: input.piloto_prorrogacao_meses ?? 0,
        meta_boletins: input.meta_boletins ?? 2,
        limite_upload_mb: input.limite_upload_mb ?? 25,
      })
      .eq("organization_id", ctx.orgId)
      .select("organization_id");
    if (!assertOk(res).length) throw new UserError("Somente administradores alteram as configurações.");
    revalidatePath("/", "layout");
  }, "Configurações salvas.");
}

export async function saveAuthorization(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: optUuid,
        tipo: z.enum(["adesao_fazenda", "uso_marca_fazenda", "uso_marca_instituicao", "credenciamento_extensao", "autorizacao_publicacao", "acesso_base_original", "outro"]),
        descricao: optText(500),
        status: z.enum(["em_alinhamento", "autorizado", "negado", "expirado"]),
        concedido_por: optText(300),
        data_decisao: optDate,
        validade: optDate,
        documento_file_id: optUuid,
        observacoes: optText(2000),
      })
      .parse(formToObject(fd));
    if (input.status === "autorizado" && (!input.documento_file_id || !input.concedido_por || !input.data_decisao)) {
      throw new UserError("Para registrar como autorizado, informe quem concedeu, a data e anexe o documento comprobatório.");
    }
    const { id, ...row } = input;
    if (id) {
      const res = await ctx.supabase.from("institutional_authorizations").update(row).eq("id", id).select("id");
      if (!assertOk(res).length) throw new UserError("Sem permissão.");
    } else {
      assertOk(await ctx.supabase.from("institutional_authorizations").insert({ ...row, organization_id: ctx.orgId }));
    }
    // situação geral derivada das autorizações registradas (nunca presumida)
    const { data: all } = await ctx.supabase.from("institutional_authorizations").select("status").eq("organization_id", ctx.orgId);
    const st = all ?? [];
    const overall = st.length && st.every((a) => a.status === "autorizado") ? "autorizado" : st.some((a) => a.status === "autorizado") ? "parcialmente_autorizado" : "em_alinhamento";
    await ctx.supabase.from("organizations").update({ status_institucional: overall }).eq("id", ctx.orgId);
    revalidatePath("/app/configuracoes");
  }, "Autorização registrada.");
}

export async function saveFarm(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ id: optUuid, nome: reqText(2, 200), municipio: optText(200), uf: z.preprocess((v) => (v ? String(v).toUpperCase() : null), z.string().regex(/^[A-Z]{2}$/).nullable()), descricao: optText(2000), adesao_formal: bool })
      .parse(formToObject(fd));
    const { id, ...row } = input;
    if (id) {
      const res = await ctx.supabase.from("farms").update(row).eq("id", id).select("id");
      if (!assertOk(res).length) throw new UserError("Sem permissão.");
    } else assertOk(await ctx.supabase.from("farms").insert({ ...row, organization_id: ctx.orgId }));
  }, "Fazenda salva.");
}

export async function saveArea(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        farm_id: uuid,
        nome: reqText(1, 200),
        tipo: z.enum(["talhao", "setor", "campo", "estufa", "laboratorio", "outro"]),
        descricao: optText(1000),
        latitude: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-90).max(90).nullable()),
        longitude: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-180).max(180).nullable()),
        coordenadas_autorizadas: bool,
      })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("farm_areas").insert({ ...input, organization_id: ctx.orgId }));
  }, "Área registrada (coordenadas privadas por padrão).");
}

export async function saveTemplate(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ id: optUuid, nome: reqText(2, 200), itens: z.string().max(8000) })
      .parse(formToObject(fd));
    const itens = input.itens.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 50);
    if (input.id) assertOk(await ctx.supabase.from("visit_checklist_templates").update({ nome: input.nome, itens }).eq("id", input.id));
    else assertOk(await ctx.supabase.from("visit_checklist_templates").insert({ organization_id: ctx.orgId, nome: input.nome, itens }));
  }, "Roteiro salvo.");
}

export async function saveRoutine(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        titulo: reqText(2, 200),
        descricao: optText(1000),
        regra: z.enum(["mensal_por_experimento", "mensal_unica"]),
        dia_prazo: optInt(1, 28),
        responsavel_id: optUuid,
      })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("recurring_routines").insert({ ...input, dia_prazo: input.dia_prazo ?? 25, organization_id: ctx.orgId }));
  }, "Rotina criada.");
}

export async function toggleRoutine(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    assertOk(await ctx.supabase.from("recurring_routines").update({ ativo: fd.get("ativo") === "true" }).eq("id", uuid.parse(fd.get("id"))));
  }, "Rotina atualizada.");
}

export async function saveMilestone(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ id: uuid, titulo: reqText(2, 200), descricao: optText(2000), status: z.enum(["previsto", "em_andamento", "concluido", "replanejado"]), observacao: optText(2000) })
      .parse(formToObject(fd));
    const { id, ...row } = input;
    const res = await ctx.supabase
      .from("pilot_milestones")
      .update({ ...row, concluido_em: row.status === "concluido" ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", id)
      .select("id");
    if (!assertOk(res).length) throw new UserError("Sem permissão.");
  }, "Marco atualizado.");
}

export async function addMilestoneMonth(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ mes: optInt(1, 36), titulo: reqText(2, 200), descricao: optText(2000) }).parse(formToObject(fd));
    if (!input.mes) throw new UserError("Informe o mês.");
    assertOk(await ctx.supabase.from("pilot_milestones").insert({ ...input, mes: input.mes, organization_id: ctx.orgId }));
  }, "Marco adicionado (prorrogação).");
}

export async function switchOrganization(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("org"));
    if (!ctx.organizations.some((o) => o.id === id)) throw new UserError("Organização indisponível.");
    (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return { ok: true, message: "Organização alterada.", redirectTo: "/app" };
  });
}

