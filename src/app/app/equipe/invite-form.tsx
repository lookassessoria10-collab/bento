"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { buttonClass } from "@/components/ui";
import type { ActionResult } from "@/lib/actions";

type Act = (fd: FormData) => Promise<ActionResult & { link?: string }>;

/** Mostra o link do convite uma única vez (o banco guarda apenas o hash). */
export function InviteForm({ action, children, submitLabel }: { action: Act; children: React.ReactNode; submitLabel: string }) {
  const [res, setRes] = useState<(ActionResult & { link?: string }) | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        start(async () => {
          const r = await action(fd);
          setRes(r);
          setCopied(false);
          if (r.ok) {
            form.reset();
            router.refresh();
          }
        });
      }}
      className="space-y-3"
    >
      <fieldset disabled={pending} className="contents">
        {children}
        <button className={buttonClass("primary", "sm")}>{pending ? "Gerando…" : submitLabel}</button>
      </fieldset>
      {res && (
        <div role={res.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${res.ok ? "bg-brand-50" : "bg-danger-100 text-danger-600"}`}>
          <p>{res.message}</p>
          {res.link && (
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={res.link} className="h-8 flex-1 rounded border border-border bg-surface px-2 font-mono text-xs" aria-label="Link do convite" onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={async () => {
                  await navigator.clipboard.writeText(res.link!);
                  setCopied(true);
                }}
              >
                <Copy aria-hidden className="h-4 w-4" /> {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
