import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Em desenvolvimento, registra erros de consulta (código e mensagem, sem dados) para detectar falhas silenciosas.
const devLoggingFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (res.status >= 400 && url.includes("/rest/v1/")) {
    const body = await res.clone().text();
    const path = new URL(url).pathname.replace("/rest/v1/", "");
    console.warn(`[bento:db] ${res.status} ${path} ${body.slice(0, 300)}`);
  }
  return res;
};

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = publicEnv();
  return createServerClient<Database>(url, key, {
    global: process.env.NODE_ENV === "production" ? undefined : { fetch: devLoggingFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado a partir de Server Component: o proxy renova a sessão
        }
      },
    },
  });
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;
