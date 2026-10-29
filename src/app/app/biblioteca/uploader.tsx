"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateUpload } from "@/lib/text";
import { buttonClass } from "@/components/ui";
import { registerUploadedFile, uploadPathFor } from "./actions";

interface Progress {
  name: string;
  pct: number;
  status: "enviando" | "ok" | "erro";
  message?: string;
}

/** Envio direto ao Storage privado com barra de progresso; metadados validados no servidor. */
export function Uploader({
  children,
  maxMb,
  previousVersionId,
}: {
  children: ReactNode;
  maxMb: number;
  previousVersionId?: string;
}) {
  const [items, setItems] = useState<Progress[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(file: File, path: string, token: string, onPct: (p: number) => void) {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/bento-privado/${path}`;
    const apikey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", apikey);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 403 ? "Sem permissão de envio." : "Falha no envio.")));
      xhr.onerror = () => reject(new Error("Falha de conexão durante o envio."));
      xhr.send(file);
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const files = (fd.getAll("arquivos") as File[]).filter((f) => f.size > 0);
    if (!files.length) {
      setItems([{ name: "—", pct: 0, status: "erro", message: "Selecione ao menos um arquivo." }]);
      return;
    }
    const meta: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      if (k === "arquivos" || k === "motivo_substituicao") continue;
      if (k in meta) meta[k] = ([] as unknown[]).concat(meta[k], v);
      else meta[k] = v;
    }
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setItems([{ name: "—", pct: 0, status: "erro", message: "Sessão expirada. Entre novamente." }]);
      return;
    }
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, pct: 0, status: "enviando" })));
    let lastRedirect: string | undefined;
    for (const [i, file] of files.entries()) {
      const set = (p: Partial<Progress>) => setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...p } : it)));
      const err = validateUpload(file.name, file.type, file.size, maxMb);
      if (err) {
        set({ status: "erro", message: err });
        continue;
      }
      try {
        const { path } = await uploadPathFor(file.name);
        await upload(file, path!, token, (pct) => set({ pct }));
        const r = await registerUploadedFile({
          meta: { ...meta, nome_amigavel: files.length > 1 ? `${String(meta.nome_amigavel || file.name)} (${i + 1})` : meta.nome_amigavel || file.name },
          storage_path: path!,
          nome_original: file.name,
          mime_type: file.type,
          tamanho_bytes: file.size,
          previous_version_id: previousVersionId ?? null,
          motivo_substituicao: (fd.get("motivo_substituicao") as string) || null,
        });
        set(r.ok ? { status: "ok", pct: 100 } : { status: "erro", message: r.message });
        if (r.ok) lastRedirect = r.redirectTo;
      } catch (ex) {
        set({ status: "erro", message: ex instanceof Error ? ex.message : "Falha no envio." });
      }
    }
    setBusy(false);
    if (files.length === 1 && lastRedirect) router.push(lastRedirect);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
      <fieldset disabled={busy} className="contents">
        {children}
        <button type="submit" className={buttonClass("primary")}>
          {busy ? "Enviando…" : previousVersionId ? "Enviar nova versão" : "Enviar arquivos"}
        </button>
      </fieldset>
      {items.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {items.map((it, i) => (
            <li key={i} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{it.name}</span>
                <span className={it.status === "erro" ? "text-danger-600" : "text-muted"}>
                  {it.status === "ok" ? "Concluído" : it.status === "erro" ? it.message : `${it.pct}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-surface-muted" role="progressbar" aria-valuenow={it.pct} aria-valuemin={0} aria-valuemax={100} aria-label={it.name}>
                <div className={`h-1.5 rounded ${it.status === "erro" ? "bg-danger-600" : "bg-brand-600"}`} style={{ width: `${it.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
