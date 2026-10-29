"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { buttonClass, cx } from "@/components/ui";
import { REPORT_FIELDS, type DraftBlock, type InstagramDraft } from "@/lib/snapshot";
import { saveDraft } from "./actions";

const TYPES: { value: DraftBlock["tipo"]; label: string }[] = [
  { value: "paragrafo", label: "Parágrafo" },
  { value: "titulo", label: "Subtítulo" },
  { value: "citacao", label: "Citação / destaque" },
  { value: "lista", label: "Lista (um item por linha)" },
];


/** Editor estruturado em blocos de texto puro (sem HTML), com salvamento explícito no servidor. */
export function DraftEditor({
  itemId,
  initial,
  editable,
  locked,
  mode,
}: {
  itemId: string;
  initial: { blocks: DraftBlock[]; instagram?: InstagramDraft; relatorio?: Record<string, string> };
  editable: boolean;
  locked: boolean;
  mode: "padrao" | "instagram" | "relatorio";
}) {
  const [blocks, setBlocks] = useState<DraftBlock[]>(initial.blocks ?? []);
  const [ig, setIg] = useState<InstagramDraft>(initial.instagram ?? {});
  const [rep, setRep] = useState<Record<string, string>>(initial.relatorio ?? {});
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setMsg(null);
  };
  const update = (i: number, patch: Partial<DraftBlock>) => {
    setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    touch();
  };
  const move = (i: number, d: number) => {
    setBlocks((b) => {
      const n = [...b];
      const j = i + d;
      if (j < 0 || j >= n.length) return b;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    touch();
  };

  function save() {
    if (locked && !window.confirm("Este conteúdo está em revisão. Salvar alterações cancela o ciclo atual e exige nova revisão. Continuar?")) return;
    start(async () => {
      const r = await saveDraft(itemId, { blocks, instagram: mode === "instagram" ? ig : undefined, relatorio: mode === "relatorio" ? rep : undefined });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  const area = "block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none disabled:bg-surface-muted";

  return (
    <div className="space-y-4">
      {mode === "instagram" && (
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["texto_card", "Texto do card / arte", 3],
              ["legenda", "Legenda (até 2.200 caracteres)", 5],
              ["cta", "Chamada para ação (CTA)", 1],
              ["hashtags", "Hashtags", 1],
              ["referencias", "Referências científicas", 3],
              ["creditos", "Créditos (fotos, autores)", 2],
            ] as const
          ).map(([k, l, rows]) => (
            <label key={k} className={cx("flex flex-col gap-1 text-sm font-medium", k === "legenda" && "md:row-span-2")}>
              {l}
              <textarea
                className={area}
                rows={rows}
                disabled={!editable}
                value={ig[k] ?? ""}
                maxLength={k === "legenda" ? 2200 : 3000}
                onChange={(e) => {
                  setIg({ ...ig, [k]: e.target.value });
                  touch();
                }}
              />
              {k === "legenda" && <span className="text-xs font-normal text-muted">{(ig.legenda ?? "").length}/2200</span>}
            </label>
          ))}
          <div className="rounded-xl border border-border bg-surface-muted p-3 md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Pré-visualização da legenda</p>
            <div className="max-w-md whitespace-pre-line rounded-lg bg-surface p-3 text-sm">
              {ig.legenda || <span className="text-muted">Sem legenda.</span>}
              {ig.cta && <p className="mt-2 font-medium">{ig.cta}</p>}
              {ig.hashtags && <p className="mt-2 text-info-600">{ig.hashtags}</p>}
            </div>
          </div>
        </div>
      )}

      {mode === "relatorio" && (
        <div className="grid gap-3">
          {REPORT_FIELDS.map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1 text-sm font-medium">
              {l}
              <textarea
                className={area}
                rows={4}
                disabled={!editable}
                value={rep[k] ?? ""}
                onChange={(e) => {
                  setRep({ ...rep, [k]: e.target.value });
                  touch();
                }}
              />
            </label>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {mode !== "padrao" && <p className="text-sm font-medium">Texto complementar</p>}
        {blocks.length === 0 && <p className="text-sm text-muted">Nenhum bloco de texto. Adicione parágrafos e subtítulos.</p>}
        {blocks.map((b, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                aria-label={`Tipo do bloco ${i + 1}`}
                className="h-8 rounded border border-border bg-surface px-2 text-xs"
                value={b.tipo}
                disabled={!editable}
                onChange={(e) => update(i, { tipo: e.target.value as DraftBlock["tipo"] })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {editable && (
                <span className="ml-auto flex gap-1">
                  <button type="button" className={buttonClass("ghost", "sm")} onClick={() => move(i, -1)} aria-label="Mover para cima">
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </button>
                  <button type="button" className={buttonClass("ghost", "sm")} onClick={() => move(i, 1)} aria-label="Mover para baixo">
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    onClick={() => {
                      setBlocks((x) => x.filter((_, j) => j !== i));
                      touch();
                    }}
                    aria-label="Remover bloco"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </span>
              )}
            </div>
            <textarea
              aria-label={`Texto do bloco ${i + 1}`}
              className={cx(area, b.tipo === "titulo" && "font-semibold")}
              rows={b.tipo === "titulo" ? 1 : 4}
              disabled={!editable}
              value={b.texto}
              onChange={(e) => update(i, { texto: e.target.value })}
            />
          </div>
        ))}
        {editable && (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => {
              setBlocks((b) => [...b, { tipo: "paragrafo", texto: "" }]);
              touch();
            }}
          >
            <Plus aria-hidden className="h-4 w-4" /> Adicionar bloco
          </button>
        )}
      </div>

      {editable && (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 py-3">
          <button type="button" onClick={save} disabled={pending || !dirty} className={buttonClass("primary")}>
            {pending ? "Salvando…" : "Salvar rascunho"}
          </button>
          <span role="status" className={cx("text-sm", msg ? (msg.ok ? "text-brand-700" : "text-danger-600") : dirty ? "text-warning-600" : "text-muted")}>
            {msg?.text ?? (dirty ? "Alterações não salvas." : "Tudo salvo.")}
          </span>
        </div>
      )}
    </div>
  );
}
