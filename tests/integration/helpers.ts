import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "../../src/lib/supabase/database.types";

// Integração contra o Supabase LOCAL (npx supabase start + db reset). Nunca apontar para produção.
config({ path: ".env.local" });
export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:55721";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error("Testes de integração só rodam contra Supabase local.");

export const PASSWORD = "bento-local-123"; // senha do seed local (supabase/seed.sql)
export type DB = SupabaseClient<Database>;

const cache = new Map<string, DB>();
export async function as(user: string): Promise<DB> {
  if (cache.has(user)) return cache.get(user)!;
  const c = createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: `${user}@bento.local`, password: PASSWORD });
  if (error) throw new Error(`login ${user}: ${error.message}`);
  cache.set(user, c);
  return c;
}

export function anon(): DB {
  return createClient<Database>(URL, KEY, { auth: { persistSession: false } });
}

export function service(): DB {
  return createClient<Database>(URL, SECRET, { auth: { persistSession: false } });
}

export async function orgId(slug = "entomo-agro-360") {
  const { data } = await service().from("organizations").select("id").eq("slug", slug).single();
  return data!.id;
}

export async function expId(codigo: string) {
  const { data } = await service().from("experiments").select("id").eq("codigo", codigo).single();
  return data!.id;
}

export const uid = (n: number) => `00000000-0000-4000-a000-00000000000${n}`;
export const tag = () => Math.random().toString(36).slice(2, 8);
