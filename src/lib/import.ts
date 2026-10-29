// Regras puras da importação de experimentos (testáveis sem banco).

export const IMPORT_FIELDS: { key: string; label: string; required?: boolean; list?: boolean; date?: boolean }[] = [
  { key: "titulo", label: "Título", required: true },
  { key: "codigo_institucional", label: "Código institucional" },
  { key: "titulo_curto", label: "Título curto" },
  { key: "area_tematica", label: "Área temática" },
  { key: "culturas", label: "Culturas", list: true },
  { key: "organismos", label: "Organismos", list: true },
  { key: "palavras_chave", label: "Palavras-chave", list: true },
  { key: "descricao", label: "Descrição" },
  { key: "objetivo_geral", label: "Objetivo geral" },
  { key: "resumo_metodologico", label: "Resumo metodológico" },
  { key: "delineamento", label: "Delineamento" },
  { key: "data_inicio", label: "Data de início", date: true },
  { key: "data_termino_prevista", label: "Término previsto", date: true },
  { key: "informante", label: "Informante" },
];

/** Aceita AAAA-MM-DD ou DD/MM/AAAA; qualquer outra coisa é inválida (nunca estimada). */
export function parseDate(v: unknown): string | null | "invalid" {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "invalid";
}

export function normalizeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Sugere mapeamento coluna → campo pelo nome do cabeçalho. */
export function suggestMapping(headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    const k = normalizeKey(h);
    const f = IMPORT_FIELDS.find((x) => normalizeKey(x.label) === k || x.key === k);
    if (f) out[h] = f.key;
    else if (/^(cod|codigo)(_inst|_institucional|_original)?$/.test(k)) out[h] = "codigo_institucional";
    else if (/cultura/.test(k)) out[h] = "culturas";
    else if (/^titulo|^nome/.test(k)) out[h] = "titulo";
  }
  return out;
}

export interface ImportRowResult {
  linha: number;
  status: "valida" | "invalida" | "duplicada";
  erros: string[];
  dados?: Record<string, unknown>;
}

/**
 * Valida e transforma as linhas. Duplicatas são identificadas SOMENTE por código institucional
 * (nunca por título semelhante). Colunas sem equivalência são preservadas em texto de observação.
 */
export function prepareImport(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>,
  existingCodes: Set<string>,
): ImportRowResult[] {
  const seen = new Set<string>();
  return rows.map((row, i) => {
    const erros: string[] = [];
    const dados: Record<string, unknown> = {};
    const extras: string[] = [];
    for (const [col, value] of Object.entries(row)) {
      const field = mapping[col];
      const v = value == null ? "" : value instanceof Date ? value : String(value).trim();
      if (!field) {
        if (v !== "") extras.push(`${col}: ${String(v)}`);
        continue;
      }
      const def = IMPORT_FIELDS.find((f) => f.key === field)!;
      if (def.list) dados[field] = String(v).split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      else if (def.date) {
        const d = parseDate(v);
        if (d === "invalid") erros.push(`${def.label}: data inválida (“${String(v)}”)`);
        else dados[field] = d;
      } else dados[field] = v === "" ? null : String(v).slice(0, 4000);
    }
    if (!dados.titulo || String(dados.titulo).length < 3) erros.push("Título ausente ou muito curto");
    if (extras.length) dados.observacoes_escopo = `Dados importados sem campo equivalente — ${extras.join("; ")}`.slice(0, 4000);
    const code = dados.codigo_institucional ? String(dados.codigo_institucional).trim().toLowerCase() : null;
    let status: ImportRowResult["status"] = erros.length ? "invalida" : "valida";
    if (code && (existingCodes.has(code) || seen.has(code))) {
      status = "duplicada";
      erros.push(`Código institucional “${dados.codigo_institucional}” já existe`);
    }
    if (code) seen.add(code);
    return { linha: i + 2, status, erros, dados };
  });
}
