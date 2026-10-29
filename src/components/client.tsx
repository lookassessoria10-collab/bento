"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import type { ActionResult } from "@/lib/actions";
import { buttonClass, cx } from "@/components/ui";

type ServerAction = (fd: FormData) => Promise<ActionResult>;

/**
 * Formulário ligado a uma Server Action. Não reinicia os campos em caso de erro,
 * mostra mensagens por campo e o resultado da operação; redireciona quando a ação pede.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  onDone,
  id,
}: {
  id?: string;
  action: ServerAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  onDone?: (r: ActionResult) => void;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll("[data-field-error-client]").forEach((n) => n.remove());
    form.querySelectorAll("[aria-invalid=true]").forEach((n) => n.removeAttribute("aria-invalid"));
    if (!result?.fieldErrors) return;
    let first: HTMLElement | null = null;
    for (const [name, msg] of Object.entries(result.fieldErrors)) {
      const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
      if (!el) continue;
      el.setAttribute("aria-invalid", "true");
      const p = document.createElement("p");
      p.textContent = msg;
      p.className = "text-xs font-medium text-danger-600";
      p.setAttribute("data-field-error-client", "");
      el.insertAdjacentElement("afterend", p);
      first ??= el;
    }
    first?.focus();
  }, [result]);

  return (
    <form
      ref={formRef}
      id={id}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        // inclui o botão acionado (ex.: name="decisao" value="aprovado")
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter?.name ? submitter : undefined);
        start(async () => {
          const r = await action(fd);
          setResult(r);
          onDone?.(r);
          if (r.ok) {
            if (resetOnSuccess) formRef.current?.reset();
            if (r.redirectTo) router.push(r.redirectTo);
            else router.refresh();
          }
        });
      }}
    >
      {/* o layout (grid, flex, space-y) fica no fieldset, que contém os campos de fato */}
      <fieldset disabled={pending} className={cx("m-0 min-w-0 border-0 p-0", className)}>
        {children}
      </fieldset>
      {result && (
        <div
          role={result.ok ? "status" : "alert"}
          className={cx(
            "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
            result.ok ? "bg-brand-50 text-brand-800" : "bg-danger-100 text-danger-600",
          )}
        >
          {result.ok ? <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4" /> : <XCircle aria-hidden className="mt-0.5 h-4 w-4" />}
          <span>{result.message}</span>
        </div>
      )}
      {pending && <span className="sr-only" aria-live="polite">Salvando…</span>}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
}) {
  return (
    <button type="submit" name={name} value={value} className={buttonClass(variant, size, className)}>
      <Loader2 aria-hidden className="hidden h-4 w-4 animate-spin [fieldset:disabled_&]:inline" />
      {children}
    </button>
  );
}

/** Mensagem passada por ?ok= ou ?erro= após redirecionamentos. */
export function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ok = params.get("ok");
  const erro = params.get("erro");
  if (!ok && !erro) return null;
  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete("ok");
    next.delete("erro");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  };
  return (
    <div
      role={erro ? "alert" : "status"}
      className={cx(
        "mb-4 flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm",
        erro ? "bg-danger-100 text-danger-600" : "bg-brand-50 text-brand-800",
      )}
    >
      <span>{erro ?? ok}</span>
      <button type="button" onClick={dismiss} aria-label="Fechar aviso" className="rounded p-0.5 hover:bg-black/5">
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Indicador de rascunho local não sincronizado (salva no navegador apenas enquanto o formulário não é enviado). */
export function DraftGuard({ formId, storageKey }: { formId: string; storageKey: string }) {
  const [state, setState] = useState<"idle" | "local" | "restored">("idle");
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const key = `bento-rascunho:${storageKey}`;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved) as Record<string, string>;
        for (const [k, v] of Object.entries(data)) {
          const el = form.elements.namedItem(k) as unknown as HTMLInputElement | null;
          if (el && "value" in el && !el.value && el.type !== "hidden") el.value = v;
        }
        requestAnimationFrame(() => setState("restored"));
      }
    } catch {
      /* armazenamento indisponível */
    }
    const onInput = () => {
      const fd = new FormData(form);
      const obj: Record<string, string> = {};
      fd.forEach((v, k) => {
        if (typeof v === "string" && v) obj[k] = v;
      });
      try {
        sessionStorage.setItem(key, JSON.stringify(obj));
        setState("local");
      } catch {
        /* ignore */
      }
    };
    const onSubmit = () => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      setState("idle");
    };
    form.addEventListener("input", onInput);
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("input", onInput);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, storageKey]);
  if (state === "idle") return null;
  return (
    <p className="text-xs text-warning-600" role="status">
      {state === "restored"
        ? "Rascunho não enviado recuperado desta aba. Revise e salve para sincronizar."
        : "Alterações ainda não salvas no servidor (rascunho temporário nesta aba)."}
    </p>
  );
}

export function PrintButton({ children = "Imprimir" }: { children?: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "sm", "no-print")}>
      {children}
    </button>
  );
}
