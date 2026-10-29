"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { siteUrl } from "@/lib/env";
import { newInviteToken } from "@/lib/tokens";
import { optDate, optText, optUuid, reqText, uuid } from "@/lib/validation";

const ROLE = z.enum(["admin", "coordenacao", "pesquisador", "estudante", "editor", "leitor"]);
const INVITE_DAYS = 7;

export async function inviteMember(fd: FormData): Promise<ActionResult & { link?: string }> {
  let link: string | undefined;
  const r = await run(async () => {
    const ctx = await requireContext();
    const input = z.object({ email: z.string().trim().toLowerCase().email("E-mail inválido."), role: ROLE }).parse(formToObject(fd));
    const { token, hash } = newInviteToken();
    assertOk(
      await ctx.supabase.from("invitations").insert({
        organization_id: ctx.orgId,
        email: input.email,
        role: input.role,
        token_hash: hash,
        expires_at: new Date(Date.now() + INVITE_DAYS * 864e5).toISOString(),
        invited_by: ctx.userId,
      }),
    );
    link = `${siteUrl()}/convite/aceitar?token=${token}`;
    revalidatePath("/app/equipe");
    return {
      ok: true,
      message: `Convite criado (válido por ${INVITE_DAYS} dias). Copie o link abaixo e envie por canal institucional. O link não será exibido novamente.`,
    };
  });
  return { ...r, link };
}

export async function resendInvite(fd: FormData): Promise<ActionResult & { link?: string }> {
  let link: string | undefined;
  const r = await run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const { data: cur } = await ctx.supabase.from("invitations").select("reenvios").eq("id", id).single();
    const { token, hash } = newInviteToken();
    const res = await ctx.supabase
      .from("invitations")
      .update({ token_hash: hash, expires_at: new Date(Date.now() + INVITE_DAYS * 864e5).toISOString(), reenvios: (cur?.reenvios ?? 0) + 1 })
      .eq("id", id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .select("id");
    if (!assertOk(res).length) throw new UserError("Convite não pode ser renovado (aceito, revogado ou sem permissão).");
    link = `${siteUrl()}/convite/aceitar?token=${token}`;
    return { ok: true, message: "Novo link gerado; o anterior deixou de valer." };
  });
  return { ...r, link };
}

export async function revokeInvite(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const res = await ctx.supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", uuid.parse(fd.get("id"))).select("id");
    if (!assertOk(res).length) throw new UserError("Sem permissão.");
    revalidatePath("/app/equipe");
  }, "Convite revogado.");
}

export async function setMembershipStatus(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ id: uuid, status: z.enum(["ativo", "suspenso", "removido"]) }).parse(formToObject(fd));
    const res = await ctx.supabase
      .from("memberships")
      .update({ status: input.status, fim: input.status === "ativo" ? null : new Date().toISOString().slice(0, 10) })
      .eq("id", input.id)
      .select("id");
    if (!assertOk(res).length) throw new UserError("Somente administradores alteram acessos — e não o próprio.");
    revalidatePath("/app/equipe");
    return { ok: true, message: input.status === "ativo" ? "Acesso reativado." : "Acesso suspenso. A autoria histórica é preservada." };
  });
}

export async function setDelegation(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ id: uuid, delegacao: z.enum(["true", "false"]) }).parse(formToObject(fd));
    const res = await ctx.supabase.from("memberships").update({ delegacao_revisao_final: input.delegacao === "true" }).eq("id", input.id).select("id");
    if (!assertOk(res).length) throw new UserError("Sem permissão.");
  }, "Delegação atualizada.");
}

export async function addRole(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ user_id: uuid, role: ROLE }).parse(formToObject(fd));
    assertOk(await ctx.supabase.from("memberships").insert({ organization_id: ctx.orgId, user_id: input.user_id, role: input.role, invited_by: ctx.userId }));
    revalidatePath("/app/equipe");
  }, "Papel adicional atribuído.");
}

export async function savePerson(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: optUuid,
        nome: reqText(2, 200, "Informe o nome."),
        tipo: z.enum(["pesquisador", "orientador", "estudante", "tecnico", "contato_externo", "outro"]),
        instituicao: optText(200),
        situacao: z.enum(["pendente_confirmacao", "confirmado", "inativo"]),
        user_id: optUuid,
        observacoes: optText(2000),
        email: optText(200),
        telefone: optText(40),
      })
      .parse(formToObject(fd));
    const { id, email, telefone, ...row } = input;
    let personId = id;
    if (id) {
      const res = await ctx.supabase.from("people").update(row).eq("id", id).select("id");
      if (!assertOk(res).length) throw new UserError("Sem permissão.");
    } else {
      personId = assertOk(await ctx.supabase.from("people").insert({ ...row, organization_id: ctx.orgId }).select("id").single()).id;
    }
    if (email || telefone) {
      assertOk(await ctx.supabase.from("people_contacts").upsert({ person_id: personId!, organization_id: ctx.orgId, email, telefone }));
    }
    revalidatePath("/app/equipe");
  }, "Pessoa salva. Contatos ficam restritos à equipe e nunca vão ao portal.");
}

export async function addWorkFront(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ frente: z.enum(["articulacao", "registros", "comunicacao"]), person_id: uuid, inicio: optDate, fim: optDate, observacao: optText(500) })
      .parse(formToObject(fd));
    if (!input.inicio) throw new UserError("Informe o início do período.");
    assertOk(await ctx.supabase.from("work_fronts").insert({ ...input, inicio: input.inicio, organization_id: ctx.orgId }));
    revalidatePath("/app/equipe");
  }, "Período de exercício registrado.");
}

export async function closeWorkFront(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const res = await ctx.supabase.from("work_fronts").update({ fim: new Date().toISOString().slice(0, 10) }).eq("id", uuid.parse(fd.get("id"))).select("id");
    if (!assertOk(res).length) throw new UserError("Sem permissão.");
  }, "Período encerrado (histórico preservado).");
}
