import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Chave privilegiada: usada SOMENTE no servidor, para operações administrativas pontuais
// (aceite de convite sem conta prévia). Nunca exportar para componentes cliente.
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createClient<Database>(publicEnv().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
