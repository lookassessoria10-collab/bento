/**
 * Cria (ou promove) o primeiro administrador da organização — uso único, por quem administra o Supabase.
 * Uso: npm run bootstrap:admin -- --email pessoa@instituicao.br --nome "Nome Completo" [--project-ref <ref>]
 * A senha é gerada aleatoriamente e exibida UMA vez; a pessoa deve trocá-la em "Esqueci minha senha".
 */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
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
// Com --project-ref, as chaves são obtidas pela CLI já logada (supabase login), sem exibir a chave secreta.
const ref = arg("project-ref");
let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (ref) {
  if (!/^[a-z0-9]{20}$/.test(ref)) throw new Error("--project-ref inválido.");
  // --reveal: sem ele a CLI devolve a chave secreta truncada. O valor nunca é impresso.
  const cliArgs = ["projects", "api-keys", "--project-ref", ref, "--reveal", "-o", "json"];
  const out =
    process.platform === "win32"
      ? execFileSync("cmd.exe", ["/d", "/s", "/c", "node_modules\\.bin\\supabase.cmd", ...cliArgs], { encoding: "utf8" })
      : execFileSync("node_modules/.bin/supabase", cliArgs, { encoding: "utf8" });
  const keys = JSON.parse(out) as { name: string; type?: string; api_key: string }[];
  url = `https://${ref}.supabase.co`;
  secret = (keys.find((k) => k.type === "secret") ?? keys.find((k) => k.name === "service_role"))?.api_key;
}

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
