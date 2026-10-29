"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cx } from "@/components/ui";
import { moveTask } from "./actions";

export interface KanbanTask {
  id: string;
  titulo: string;
  status: string;
  prazo: string | null;
  prioridade: string;
  responsavel: string | null;
  codigo: string | null;
  ordem: number;
  vencida: boolean;
  podeMover: boolean;
}

const COLUMNS: [string, string][] = [
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["aguardando_terceiro", "Aguardando terceiro"],
  ["concluida", "Concluída"],
];

export function Kanban({ tasks }: { tasks: KanbanTask[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, apply] = useOptimistic(tasks, (state, m: { id: string; status: string; ordem: number }) =>
    state.map((t) => (t.id === m.id ? { ...t, status: m.status, ordem: m.ordem } : t)),
  );
  const [dragging, setDragging] = useState<string | null>(null);

  function move(id: string, status: string) {
    const col = optimistic.filter((t) => t.status === status);
    const ordem = (col.at(-1)?.ordem ?? 0) + 1;
    let motivo: string | undefined;
    if (status === "aguardando_terceiro") {
      motivo = window.prompt("O que está pendente com terceiros?") ?? undefined;
      if (!motivo) return;
    }
    setError(null);
    start(async () => {
      apply({ id, status, ordem });
      const r = await moveTask(id, status, ordem, motivo);
      if (!r.ok) setError(r.message);
      router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {pending ? "Salvando movimentação…" : ""}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(([key, label]) => {
          const items = optimistic.filter((t) => t.status === key).sort((a, b) => a.ordem - b.ordem);
          return (
            <section
              key={key}
              aria-label={label}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, key);
                setDragging(null);
              }}
              className={cx("min-h-40 rounded-xl border border-border bg-surface-muted/60 p-3", dragging && "border-dashed border-brand-500")}
            >
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                {label} <span className="rounded-full bg-surface px-2 text-xs tabular">{items.length}</span>
              </h3>
              <ul className="space-y-2">
                {items.map((t) => (
                  <li
                    key={t.id}
                    draggable={t.podeMover}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      setDragging(t.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cx("rounded-lg border bg-surface p-2.5 text-sm shadow-sm", t.vencida ? "border-danger-600/50" : "border-border", t.podeMover && "cursor-grab")}
                  >
                    <Link href={`/app/atividades/${t.id}`} className="font-medium hover:underline">
                      {t.titulo}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {t.codigo && <span className="font-mono">{t.codigo} · </span>}
                      {t.responsavel ?? "Sem responsável"}
                      {t.prazo && ` · prazo ${t.prazo.split("-").reverse().join("/")}`}
                      {t.vencida && <strong className="text-danger-600"> · vencida</strong>}
                    </p>
                    {t.podeMover && (
                      <label className="mt-2 flex items-center gap-1 text-xs text-muted">
                        <span className="sr-only">Mover “{t.titulo}” para</span>
                        <select
                          className="h-7 flex-1 rounded border border-border bg-surface px-1 text-xs"
                          value={t.status}
                          onChange={(e) => move(t.id, e.target.value)}
                        >
                          {[...COLUMNS, ["cancelada", "Cancelada"]].map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
