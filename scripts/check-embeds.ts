/**
 * Verificação de desenvolvimento: executa cada .from(...).select("...") com relacionamentos do código
 * contra o Supabase LOCAL (limit 0) e falha se algum embed for inválido ou ambíguo.
 * Uso: npx tsx scripts/check-embeds.ts
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("Use apenas com Supabase local.");

const found: [string, string, string][] = [];
function walk(d: string) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f) && !p.includes("database.types")) {
      const s = fs.readFileSync(p, "utf8");
      const re = /\.from\("([a-z_]+)"\)\s*\.select\(\s*"([^"]*\([^"]*)"/g;
      let m;
      while ((m = re.exec(s))) found.push([p, m[1], m[2]]);
    }
  }
}
walk("src");

async function main() {
  const sb = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword({ email: "coordenacao@bento.local", password: "bento-local-123" });
  let bad = 0;
  for (const [file, table, sel] of found) {
    const { error } = await sb.from(table).select(sel).limit(0);
    if (error) {
      bad++;
      console.log(`✗ ${file} [${table}] ${error.code}: ${error.message}`);
    }
  }
  console.log(`${found.length} consultas com relacionamentos verificadas; ${bad} com erro.`);
  process.exit(bad ? 1 : 0);
}
main();
