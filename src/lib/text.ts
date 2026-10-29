// Utilitários de texto: CSV seguro, nomes de arquivo, slugs.

/** Escapa um valor para CSV e neutraliza injeção de fórmulas em planilhas. */
export function csvCell(value: unknown): string {
  if (value == null) return "";
  let s = Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  // separador ";" — abre em colunas no Excel em português; o importador detecta "," ou ";"
  const head = headers.map((h) => csvCell(h.label)).join(";");
  const body = rows.map((r) => headers.map((h) => csvCell(r[h.key])).join(";"));
  // BOM para abrir corretamente no Excel com acentuação
  return "﻿" + [head, ...body].join("\r\n");
}

export function slugify(input: string, max = 80): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

const DANGEROUS_EXT = /\.(exe|bat|cmd|com|msi|sh|ps1|js|mjs|vbs|jar|scr|dll|html?|svg|php|py)$/i;

export const ALLOWED_UPLOADS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "text/csv": ["csv"],
  "text/plain": ["txt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
};

/** Sanitiza nome de arquivo: sem diretórios, sem caracteres especiais, sem extensões perigosas. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "arquivo";
  const dot = base.lastIndexOf(".");
  const stem = slugify(dot > 0 ? base.slice(0, dot) : base, 60) || "arquivo";
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${stem}.${ext}` : stem;
}

export function validateUpload(name: string, mime: string, size: number, maxMb: number): string | null {
  if (DANGEROUS_EXT.test(name)) return "Tipo de arquivo não permitido.";
  const exts = ALLOWED_UPLOADS[mime];
  if (!exts) return `Formato não aceito (${mime || "desconhecido"}).`;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!exts.includes(ext)) return "A extensão do arquivo não corresponde ao seu tipo.";
  if (size <= 0) return "Arquivo vazio.";
  if (size > maxMb * 1024 * 1024) return `Arquivo maior que o limite de ${maxMb} MB.`;
  return null;
}

/** Convenção de nome sugerida: EA360-001-2026-11-15-foto01 (não altera o nome original). */
export function suggestedFileName(code: string | null, date: string | null, kind: string, seq: number): string {
  const parts = [code ?? "BENTO", date ?? "sem-data", `${kind}${String(seq).padStart(2, "0")}`];
  return parts.join("-");
}

export function splitList(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function truncate(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
