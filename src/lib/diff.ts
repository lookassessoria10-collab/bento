// Comparação textual simples por linhas (LCS) para revisão entre versões.

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

export function diffLines(a: string, b: string): DiffLine[] {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = x.length;
  const m = y.length;
  if (n * m > 400_000) {
    // textos muito longos: mostra remoção/adição em bloco
    return [...x.map((t) => ({ kind: "del" as const, text: t })), ...y.map((t) => ({ kind: "add" as const, text: t }))];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      out.push({ kind: "same", text: x[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ kind: "del", text: x[i++] });
    else out.push({ kind: "add", text: y[j++] });
  }
  while (i < n) out.push({ kind: "del", text: x[i++] });
  while (j < m) out.push({ kind: "add", text: y[j++] });
  return out;
}

/** Representação textual legível de um snapshot para comparação. */
export function snapshotToText(c: unknown): string {
  const s = c as {
    titulo?: string;
    descricao?: string;
    draft?: { blocks?: { tipo: string; texto: string }[]; instagram?: Record<string, string>; relatorio?: Record<string, string> };
    bulletin?: { apresentacao?: string; sections?: { titulo: string; corpo: string; results?: { variavel: string; sintese: string }[] }[] };
    dossier?: { apresentacao?: string; escopo?: string; sintese?: string; experiments?: { codigo: string; titulo: string }[] };
    sources?: { referencia?: string; experiment?: { codigo: string } | null; result?: { variavel: string } | null; file?: { nome: string } | null }[];
  };
  const lines: string[] = [`# ${s.titulo ?? ""}`, s.descricao ?? ""];
  for (const b of s.draft?.blocks ?? []) lines.push(b.tipo === "titulo" ? `## ${b.texto}` : b.texto);
  for (const [k, v] of Object.entries(s.draft?.instagram ?? {})) lines.push(`[${k}] ${v}`);
  for (const [k, v] of Object.entries(s.draft?.relatorio ?? {})) lines.push(`[${k}] ${v}`);
  if (s.bulletin) {
    lines.push(s.bulletin.apresentacao ?? "");
    for (const sec of s.bulletin.sections ?? []) {
      lines.push(`## ${sec.titulo}`, sec.corpo);
      for (const r of sec.results ?? []) lines.push(`(resultado) ${r.variavel}: ${r.sintese}`);
    }
  }
  if (s.dossier) {
    lines.push(s.dossier.apresentacao ?? "", s.dossier.escopo ?? "", s.dossier.sintese ?? "");
    for (const e of s.dossier.experiments ?? []) lines.push(`(experimento) ${e.codigo} — ${e.titulo}`);
  }
  for (const src of s.sources ?? []) lines.push(`(fonte) ${src.experiment?.codigo ?? src.result?.variavel ?? src.file?.nome ?? src.referencia ?? ""}`);
  return lines
    .flatMap((l) => (l ?? "").split("\n"))
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");
}
