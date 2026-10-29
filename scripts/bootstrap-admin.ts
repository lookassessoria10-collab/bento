/**
 * Cria (ou promove) o primeiro administrador da organização — uso único, por quem administra o Supabase.
 * Uso: npm run bootstrap:admin -- --email pessoa@instituicao.br --nome "Nome Completo"
 * A senha é gerada aleatoriamente e exibida UMA vez; a pessoa deve trocá-la em "Esqueci minha senha".
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const email = arg("email")?.toLowerCase();
const nome = arg("nome") ?? "";
const slug = arg("org") ?? "entomo-agro-360";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Informe --email válido.");
  if (!url || !secret) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY.");
  const sb = createClient(url, secret, { auth: { persistSession: false } });
  const { data: org, error: oe } = await sb.from("organizations").select("id").eq("slug", slug).single();
  if (oe || !org) throw new Error(`Organização '${slug}' não encontrada. As migrations foram aplicadas?`);

  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === email);
  let password: string | null = null;
  if (!user) {
    password = randomBytes(12).toString("base64url");
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome } });
    if (error) throw error;
    user = data.user!;
  }
  const { error: me } = await sb.from("memberships").upsert({ organization_id: org.id, user_id: user.id, role: "admin", status: "ativo" }, { onConflict: "organization_id,user_id,role" });
  if (me) throw me;
  console.log(`Administrador(a) ${email} ativo(a) na organização ${slug}.`);
  if (password) console.log(`Senha temporária (exibida uma única vez): ${password}\nTroque-a no primeiro acesso via "Esqueci minha senha".`);
}

main().catch((e) => {
  console.error("Erro:", e instanceof Error ? e.message : e);
  process.exit(1);
});
