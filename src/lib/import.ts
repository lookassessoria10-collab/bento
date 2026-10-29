// Regras puras da importação de experimentos (testáveis sem banco).
// O modelo de planilha (cabeçalhos) é gerado a partir de IMPORT_FIELDS — a mesma lista usada no mapeamento.

type Kind = "text" | "list" | "date" | "int" | "fase" | "pessoa" | "tratamentos";

export interface ImportField {
  key: string;
  label: string;
  kind: Kind;
  required?: boolean;
  hint: string;
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: "titulo", label: "Título", kind: "text", required: true, hint: "Título completo do experimento (mínimo 3 caracteres)." },
  { key: "titulo_curto", label: "Título curto", kind: "text", hint: "Nome curto para listas." },
  { key: "codigo_institucional", label: "Código institucional", kind: "text", hint: "Código original da instituição. É o critério de duplicidade." },
  { key: "area_tematica", label: "Área temática", kind: "text", hint: "Ex.: Entomologia agrícola, Fitotecnia." },
  { key: "linhas_pesquisa", label: "Linhas de pesquisa", kind: "list", hint: "Separe vários itens por vírgula." },
  { key: "culturas", label: "Culturas", kind: "list", hint: "Ex.: soja, milho (separe por vírgula)." },
  { key: "organismos", label: "Organismos", kind: "list", hint: "Ex.: Chrysodeixis includens." },
  { key: "alvos_biologicos", label: "Alvos biológicos", kind: "list", hint: "Separe por vírgula." },
  { key: "palavras_chave", label: "Palavras-chave", kind: "list", hint: "Separe por vírgula." },
  { key: "descricao", label: "Descrição", kind: "text", hint: "Descrição do estudo (sem resultados)." },
  { key: "justificativa", label: "Justificativa", kind: "text", hint: "" },
  { key: "objetivo_geral", label: "Objetivo geral", kind: "text", hint: "" },
  { key: "objetivos_especificos", label: "Objetivos específicos", kind: "text", hint: "" },
  { key: "_pesquisador", label: "Pesquisador principal", kind: "pessoa", hint: "Nome exatamente como cadastrado em Equipe › Pessoas. Se não existir, fica registrado nas observações." },
  { key: "local_descricao", label: "Local", kind: "text", hint: "Ex.: Laboratório, talhão, setor." },
  { key: "resumo_metodologico", label: "Resumo metodológico", kind: "text", hint: "" },
  { key: "protocolo_referencia", label: "Protocolo / referência", kind: "text", hint: "Documento ou arquivo de referência." },
  { key: "delineamento", label: "Delineamento", kind: "text", hint: "Ex.: Inteiramente casualizado (DIC)." },
  { key: "num_repeticoes", label: "Número de repetições", kind: "int", hint: "Número inteiro." },
  { key: "unidades_experimentais", label: "Unidades experimentais", kind: "text", hint: "" },
  { key: "_tratamentos", label: "Tratamentos", kind: "tratamentos", hint: "Separe por ponto e vírgula. Ex.: T1: água; T2: 150 mL/ha" },
  { key: "data_inicio", label: "Data de início", kind: "date", hint: "DD/MM/AAAA ou AAAA-MM-DD." },
  { key: "data_termino_prevista", label: "Término previsto", kind: "date", hint: "DD/MM/AAAA ou AAAA-MM-DD." },
  { key: "data_termino_efetiva", label: "Término efetivo", kind: "date", hint: "DD/MM/AAAA ou AAAA-MM-DD." },
  { key: "calendario_avaliacoes", label: "Calendário de avaliações", kind: "text", hint: "" },
  { key: "fase", label: "Fase", kind: "fase", hint: "Em implantação, Em andamento ou Concluído (vazio = Em implantação)." },
  { key: "fonte_cadastro", label: "Fonte do cadastro", kind: "text", hint: "Documento, reunião, e-mail… (vazio = nome do arquivo importado)." },
  { key: "informante", label: "Informante", kind: "text", hint: "Quem forneceu as informações." },
  { key: "data_informacao", label: "Data da informação", kind: "date", hint: "Vazio = data da importação." },
];

/** Aceita AAAA-MM-DD ou DD/MM/AAAA; qualquer outra coisa é inválida (nunca estimada). */
export function parseDate(v: unknown): string | null | "invalid" {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return validDate(s);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return validDate(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  return "invalid";
}

function validDate(iso: string): string | "invalid" {
  const d = new Date(`${iso}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : "invalid";
}

export function normalizeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const PHASES: Record<string, string> = {
  em_implantacao: "implantacao",
  implantacao: "implantacao",
  em_andamento: "andamento",
  andamento: "andamento",
  concluido: "concluido",
  concluida: "concluido",
};

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

/** Cabeçalhos do modelo de planilha, na ordem oficial. */
export function templateHeaders() {
  return IMPORT_FIELDS.map((f) => f.label);
}

export interface ParsedTreatment {
  codigo: string | null;
  descricao: string;
}

/** "T1: água; T2 - 150 mL/ha" → [{codigo:"T1", descricao:"água"}, …] */
export function parseTreatments(v: string): ParsedTreatment[] {
  return v
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((s) => {
      const m = s.match(/^([A-Za-z]{0,3}\d{1,3})\s*[:\-–.)]\s*(.+)$/);
      return m ? { codigo: m[1].toUpperCase(), descricao: m[2].trim().slice(0, 1000) } : { codigo: null, descricao: s.slice(0, 1000) };
    });
}

export interface ImportRowResult {
  linha: number;
  status: "valida" | "invalida" | "duplicada";
  erros: string[];
  dados?: Record<string, unknown>;
  pesquisador?: string | null;
  tratamentos?: ParsedTreatment[];
}

/**
 * Valida e transforma as linhas. Duplicatas são identificadas SOMENTE por código institucional
 * (nunca por título semelhante). Colunas sem equivalência são preservadas em texto de observação.
 */
export function prepareImport(rows: Record<string, unknown>[], mapping: Record<string, string>, existingCodes: Set<string>): ImportRowResult[] {
  const seen = new Set<string>();
  return rows.map((row, i) => {
    const erros: string[] = [];
    const dados: Record<string, unknown> = {};
    const extras: string[] = [];
    let pesquisador: string | null = null;
    let tratamentos: ParsedTreatment[] = [];
    for (const [col, value] of Object.entries(row)) {
      const field = mapping[col];
      const v = value == null ? "" : value instanceof Date ? value : String(value).trim();
      if (!field) {
        if (v !== "") extras.push(`${col}: ${String(v)}`);
        continue;
      }
      const def = IMPORT_FIELDS.find((f) => f.key === field)!;
      if (v === "") continue;
      switch (def.kind) {
        case "list": {
          const items = String(v).split(/[;,]/).map((s) => s.trim()).filter(Boolean);
          // culturas em minúsculas (filtros); nomes científicos e demais listas como digitados
          dados[field] = field === "culturas" ? items.map((s) => s.toLowerCase()) : items;
          break;
        }
        case "date": {
          const d = parseDate(v);
          if (d === "invalid") erros.push(`${def.label}: data inválida (“${String(v)}”)`);
          else dados[field] = d;
          break;
        }
        case "int": {
          const n = Number(String(v).replace(",", "."));
          if (!Number.isInteger(n) || n < 0 || n > 10000) erros.push(`${def.label}: use um número inteiro (“${String(v)}”)`);
          else dados[field] = n;
          break;
        }
        case "fase": {
          const k = normalizeKey(String(v));
          if (k.startsWith("interromp")) erros.push("Fase “Interrompido” exige motivo: importe como “Em andamento” e ajuste no cadastro");
          else if (!PHASES[k]) erros.push(`Fase inválida (“${String(v)}”): use Em implantação, Em andamento ou Concluído`);
          else dados.fase = PHASES[k];
          break;
        }
        case "pessoa":
          pesquisador = String(v).slice(0, 200);
          break;
        case "tratamentos":
          tratamentos = parseTreatments(String(v));
          break;
        default:
          dados[field] = String(v).slice(0, 4000);
      }
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
    return { linha: i + 2, status, erros, dados, pesquisador, tratamentos };
  });
}

/** Compara nomes sem acento/maiúsculas para localizar a pessoa cadastrada. */
export function sameName(a: string, b: string) {
  return normalizeKey(a) === normalizeKey(b);
}
