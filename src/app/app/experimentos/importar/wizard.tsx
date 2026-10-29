"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { IMPORT_FIELDS, suggestMapping, type ImportRowResult } from "@/lib/import";
import { buttonClass, cx } from "@/components/ui";
import { previewImport, runImport } from "./actions";

type Step = "arquivo" | "mapear" | "previa" | "concluido";

export function ImportWizard() {
  const [step, setStep] = useState<Step>("arquivo");
  const [file, setFile] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ImportRowResult[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function onFile(f: File) {
    setMsg(null);
    setFile(f.name);
    try {
      let data: Record<string, unknown>[] = [];
      if (/\.csv$/i.test(f.name)) {
        const text = await f.text();
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        data = parsed.data;
      } else if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const sheet = (await readXlsxFile(f)) as unknown as unknown[][];
        const [head, ...body] = sheet;
        const hs = (head ?? []).map((h) => String(h ?? "").trim());
        data = body.map((r) => Object.fromEntries(hs.map((h, i) => [h, r[i] ?? ""])));
      } else {
        setMsg({ ok: false, text: "Use arquivo .csv ou .xlsx." });
        return;
      }
      if (!data.length) {
        setMsg({ ok: false, text: "Arquivo sem linhas de dados." });
        return;
      }
      if (data.length > 2000) {
        setMsg({ ok: false, text: "Limite de 2.000 linhas por lote." });
        return;
      }
      const hs = Object.keys(data[0]);
      setHeaders(hs);
      setRows(data);
      setMapping(suggestMapping(hs));
      setStep("mapear");
    } catch {
      setMsg({ ok: false, text: "Não foi possível ler o arquivo." });
    }
  }

  const counts = {
    valida: results.filter((r) => r.status === "valida").length,
    invalida: results.filter((r) => r.status === "invalida").length,
    duplicada: results.filter((r) => r.status === "duplicada").length,
  };

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Etapas da importação">
        {(["arquivo", "mapear", "previa", "concluido"] as Step[]).map((s, i) => (
          <li key={s} className={cx("rounded-full border px-2 py-0.5", s === step ? "border-brand-700 bg-brand-700 text-white" : "border-border text-muted")} aria-current={s === step ? "step" : undefined}>
            {i + 1}. {{ arquivo: "Enviar arquivo", mapear: "Mapear colunas", previa: "Prévia e validação", concluido: "Confirmar" }[s]}
          </li>
        ))}
      </ol>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={cx("rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-brand-50 text-brand-800" : "bg-danger-100 text-danger-600")}>
          {msg.text}
        </p>
      )}

      {step === "arquivo" && (
        <label className="block rounded-xl border-2 border-dashed border-border-strong p-8 text-center text-sm">
          <span className="font-medium">Selecione um arquivo CSV ou XLSX</span>
          <span className="block text-muted">A primeira linha deve conter os nomes das colunas. Importe somente dados com autorização.</span>
          <input type="file" accept=".csv,.xlsx" className="mt-3 block w-full text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}

      {step === "mapear" && (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{file}</strong> — {rows.length} linha(s). Colunas sem campo correspondente serão preservadas no texto de observações do experimento.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {headers.map((h) => (
              <label key={h} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <span className="truncate font-mono text-xs">{h}</span>
                <select
                  className="h-8 rounded border border-border bg-surface px-2 text-xs"
                  value={mapping[h] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                  aria-label={`Campo para a coluna ${h}`}
                >
                  <option value="">— preservar em observações —</option>
                  {IMPORT_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                      {f.required ? " *" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button className={buttonClass("secondary")} onClick={() => setStep("arquivo")}>
              Voltar
            </button>
            <button
              className={buttonClass("primary")}
              disabled={pending || !Object.values(mapping).includes("titulo")}
              onClick={() =>
                start(async () => {
                  const r = await previewImport({ arquivo: file, rows, mapping, confirmar: false });
                  if (!r.ok) return setMsg({ ok: false, text: r.message });
                  setResults(r.results ?? []);
                  setStep("previa");
                })
              }
            >
              {pending ? "Validando…" : "Validar no servidor"}
            </button>
          </div>
          {!Object.values(mapping).includes("titulo") && <p className="text-xs text-danger-600">Mapeie a coluna de título (obrigatória).</p>}
        </div>
      )}

      {step === "previa" && (
        <div className="space-y-3">
          <p className="text-sm">
            Válidas: <strong>{counts.valida}</strong> · Inválidas: <strong>{counts.invalida}</strong> · Duplicadas (por código institucional): <strong>{counts.duplicada}</strong>
          </p>
          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-muted">
                <tr>
                  <th className="p-2 text-left">Linha</th>
                  <th className="p-2 text-left">Situação</th>
                  <th className="p-2 text-left">Título</th>
                  <th className="p-2 text-left">Problemas</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.linha} className="border-t border-border">
                    <td className="p-2 tabular">{r.linha}</td>
                    <td className={cx("p-2", r.status === "valida" ? "text-brand-700" : "text-danger-600")}>{r.status}</td>
                    <td className="p-2">{String(r.dados?.titulo ?? "")}</td>
                    <td className="p-2">{r.erros.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-4 w-4 accent-brand-700" />
            Confirmo que os dados têm autorização de uso e que somente as {counts.valida} linhas válidas serão importadas.
          </label>
          <div className="flex gap-2">
            <button className={buttonClass("secondary")} onClick={() => setStep("mapear")}>
              Voltar
            </button>
            <button
              className={buttonClass("primary")}
              disabled={pending || !confirm || counts.valida === 0}
              onClick={() =>
                start(async () => {
                  const r = await runImport({ arquivo: file, rows, mapping, confirmar: true });
                  setMsg({ ok: r.ok, text: r.message });
                  if (r.ok) {
                    setStep("concluido");
                    router.refresh();
                  }
                })
              }
            >
              {pending ? "Importando…" : `Importar ${counts.valida} experimento(s)`}
            </button>
          </div>
        </div>
      )}

      {step === "concluido" && (
        <button className={buttonClass("secondary")} onClick={() => { setStep("arquivo"); setResults([]); setConfirm(false); }}>
          Importar outro arquivo
        </button>
      )}
    </div>
  );
}
