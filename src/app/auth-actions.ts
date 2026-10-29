"use server";

import { z } from "zod";
import { hashToken } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { run, UserError, type ActionResult } from "@/lib/actions";

const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(200);

function safeNext(next: unknown): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/app") && !n.startsWith("//") ? n : "/app";
}

export async function loginAction(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const email = emailSchema.parse(fd.get("email"));
    const password = z.string().min(1, "Informe a senha.").max(200).parse(fd.get("password"));
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // mensagem genérica: não revela se o e-mail existe
    if (error) throw new UserError("E-mail ou senha inválidos, ou conta sem acesso.");
    return { ok: true, message: "Acesso liberado.", redirectTo: safeNext(fd.get("next")) };
  });
}

export async function magicLinkAction(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const email = emailSchema.parse(fd.get("email"));
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/callback?next=/app` },
    });
    return { ok: true, message: "Se o e-mail tiver acesso ao Bento, enviaremos um link de entrada em instantes." };
  });
}

export async function recoverAction(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const email = emailSchema.parse(fd.get("email"));
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha` });
    return { ok: true, message: "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação." };
  });
}

const passwordSchema = z
  .string()
  .min(10, "A senha deve ter ao menos 10 caracteres.")
  .max(200)
  .regex(/[A-Za-z]/, "Inclua letras.")
  .regex(/[0-9]/, "Inclua números.");

export async function updatePasswordAction(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const password = passwordSchema.parse(fd.get("password"));
    if (password !== fd.get("confirm")) return { ok: false, message: "As senhas não conferem.", fieldErrors: { confirm: "As senhas não conferem." } };
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new UserError("Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
    return { ok: true, message: "Senha atualizada.", redirectTo: "/app" };
  });
}

/** Aceite de convite por usuário já autenticado. */
export async function acceptInviteLoggedAction(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const token = z.string().min(20).max(200).parse(fd.get("token"));
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) throw new UserError(error.message);
    return { ok: true, message: "Convite aceito.", redirectTo: "/app?ok=" + encodeURIComponent("Bem-vindo(a) ao Bento!") };
  });
}

/** Aceite de convite criando a conta (cadastro público está desativado; só por convite válido). */
export async function acceptInviteNewAction(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const token = z.string().min(20).max(200).parse(fd.get("token"));
    const nome = z.string().trim().min(2, "Informe seu nome.").max(200).parse(fd.get("nome"));
    const password = passwordSchema.parse(fd.get("password"));
    if (password !== fd.get("confirm")) return { ok: false, message: "As senhas não conferem.", fieldErrors: { confirm: "As senhas não conferem." } };

    const admin = createAdminClient();
    if (!admin) throw new UserError("Criação de conta indisponível: chave de servidor não configurada. Contate a administração.");

    const { data: inv } = await admin
      .from("invitations")
      .select("id, email, expires_at, accepted_at, revoked_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (!inv || inv.accepted_at || inv.revoked_at || new Date(inv.expires_at) < new Date()) {
      throw new UserError("Convite inválido, expirado ou já utilizado.");
    }
    const { error: createErr } = await admin.auth.admin.createUser({
      email: inv.email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (createErr) {
      throw new UserError("Já existe uma conta para este e-mail. Entre com sua senha e abra o link do convite novamente.");
    }
    const supabase = await createClient();
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email: inv.email, password });
    if (loginErr) throw new UserError("Conta criada, mas não foi possível entrar automaticamente. Faça login.");
    const { error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) throw new UserError(error.message);
    return { ok: true, message: "Conta criada.", redirectTo: "/app?ok=" + encodeURIComponent("Conta criada. Bem-vindo(a) ao Bento!") };
  });
}
