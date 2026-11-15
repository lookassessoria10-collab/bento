"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { BentoMark } from "@/components/logo";
import { SharePanel } from "@/components/share-panel";
import { buttonClass } from "@/components/ui";
import type { ShareDto } from "@/lib/share-dto";

type State = { k: "carregando" } | { k: "indisponivel" } | { k: "senha"; erro: string | null } | { k: "ok"; dto: ShareDto };

// O token nunca vai para a URL do servidor nem para armazenamento persistente do navegador.
const readToken = () => window.location.hash.replace(/^#/, "").trim();

async function fetchPanel(token: string, senha?: string): Promise<State> {
  try {
    const r = await fetch("/api/compartilhado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha }),
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    const j = (await r.json()) as { estado: string; painel?: ShareDto; erro?: string | null };
    if (j.estado === "ok" && j.painel) return { k: "ok", dto: j.painel };
    if (j.estado === "senha") return { k: "senha", erro: j.erro ?? null };
    return { k: "indisponivel" };
  } catch {
    return { k: "indisponivel" };
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-float">
        <BentoMark className="mx-auto mb-4 h-12 w-12" />
        {children}
      </div>
    </main>
  );
}

export function SharedView() {
  const [state, setState] = useState<State>({ k: "carregando" });
  const [senha, setSenha] = useState("");

  useEffect(() => {
    let alive = true;
    const token = readToken();
    (token ? fetchPanel(token) : Promise.resolve<State>({ k: "indisponivel" })).then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  if (state.k === "ok") return <SharePanel dto={state.dto} />;
  if (state.k === "carregando")
    return (
      <Shell>
        <p className="text-sm text-muted" role="status">
          Carregando painel…
        </p>
      </Shell>
    );
  if (state.k === "senha")
    return (
      <Shell>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setState(await fetchPanel(readToken(), senha));
            setSenha("");
          }}
          className="space-y-3 text-left"
        >
          <p className="flex items-center justify-center gap-2 font-display text-lg font-semibold text-brand-950">
            <Lock aria-hidden className="h-4 w-4" /> Painel protegido
          </p>
          <label className="block text-sm">
            Senha de acesso
            <input
              type="password"
              autoComplete="off"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              maxLength={200}
              className="mt-1 h-11 w-full rounded-xl border border-border-strong px-3"
            />
          </label>
          {state.erro && (
            <p role="alert" className="text-sm text-danger-600">
              {state.erro}
            </p>
          )}
          <button className={buttonClass("primary", "md", "w-full")}>Abrir painel</button>
        </form>
      </Shell>
    );
  return (
    <Shell>
      <p className="font-display text-lg font-semibold text-brand-950">Este link está indisponível</p>
      <p className="mt-2 text-sm text-muted">Verifique o endereço recebido ou peça um novo link a quem o compartilhou.</p>
    </Shell>
  );
}
