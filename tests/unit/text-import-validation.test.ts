import { describe, expect, it } from "vitest";
import { csvCell, safeFileName, slugify, suggestedFileName, toCsv, validateUpload } from "@/lib/text";
import { parseDate, parseTreatments, prepareImport, sameName, suggestMapping, templateHeaders } from "@/lib/import";
import { experimentSchema, taskSchema } from "@/lib/validation";
import { diffLines } from "@/lib/diff";
import { fmtDate, localInputToIso, monthBoundsUtc } from "@/lib/format";

describe("exportação CSV", () => {
  it("escapa aspas, vírgulas e quebras", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("linha\nnova")).toBe('"linha\nnova"');
  });
  it("neutraliza injeção de fórmula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@x")).toBe("'@x");
  });
  it("gera cabeçalho e BOM", () => {
    const csv = toCsv([{ key: "a", label: "Coluna A" }], [{ a: ["x", "y"] }]);
    expect(csv.startsWith("\uFEFFColuna A")).toBe(true);
    expect(csv).toContain('"x; y"');
    const two = toCsv(
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
      [{ a: 1, b: 2 }],
    );
    expect(two).toBe("﻿A;B\r\n1;2"); // separador ";" (Excel em português)
  });
});

describe("arquivos", () => {
  it("sanitiza nomes e bloqueia path traversal", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("Foto Ação #1.JPG")).toBe("foto-acao-1.jpg");
    expect(safeFileName("C:\\x\\relatório final.pdf")).toBe("relatorio-final.pdf");
  });
  it("valida extensão, MIME e tamanho", () => {
    expect(validateUpload("a.jpg", "image/jpeg", 1000, 10)).toBeNull();
    expect(validateUpload("a.exe", "application/octet-stream", 10, 10)).toMatch(/não permitido/);
    expect(validateUpload("a.svg", "image/svg+xml", 10, 10)).toMatch(/não permitido/);
    expect(validateUpload("a.pdf", "image/jpeg", 10, 10)).toMatch(/não corresponde/);
    expect(validateUpload("a.pdf", "application/pdf", 11 * 1024 * 1024, 10)).toMatch(/limite/);
    expect(validateUpload("a.pdf", "application/pdf", 0, 10)).toMatch(/vazio/);
  });
  it("convenção de nome sugerido", () => {
    expect(suggestedFileName("EA360-001", "2026-11-15", "foto", 1)).toBe("EA360-001-2026-11-15-foto01");
  });
  it("slug", () => {
    expect(slugify("Boletim nº 1 — Entomologia!")).toBe("boletim-n-1-entomologia");
  });
});

describe("importação", () => {
  it("datas: aceita formatos explícitos e nunca estima", () => {
    expect(parseDate("2026-03-01")).toBe("2026-03-01");
    expect(parseDate("1/3/2026")).toBe("2026-03-01");
    expect(parseDate("março de 2026")).toBe("invalid");
    expect(parseDate("")).toBeNull();
  });
  it("sugere mapeamento por cabeçalho", () => {
    expect(suggestMapping(["Título", "Código institucional", "Culturas"])).toEqual({
      Título: "titulo",
      "Código institucional": "codigo_institucional",
      Culturas: "culturas",
    });
  });
  it("detecta duplicatas por código institucional (não por título) e preserva colunas sem equivalência", () => {
    const rows = [
      { Titulo: "Ensaio A", Cod: "UNEB-1", Extra: "valor X" },
      { Titulo: "Ensaio A", Cod: "UNEB-2" }, // mesmo título, código diferente: NÃO é duplicata
      { Titulo: "Outro", Cod: "uneb-1" }, // duplicata dentro do arquivo
      { Titulo: "Antigo", Cod: "JA-EXISTE" },
      { Titulo: "x", Cod: "" }, // título curto
      { Titulo: "Datado", Inicio: "31/02/2026x" },
    ];
    const r = prepareImport(rows, { Titulo: "titulo", Cod: "codigo_institucional", Inicio: "data_inicio" }, new Set(["ja-existe"]));
    expect(r.map((x) => x.status)).toEqual(["valida", "valida", "duplicada", "duplicada", "invalida", "invalida"]);
    expect(r[0].dados?.observacoes_escopo).toContain("Extra: valor X");
    expect(r[0].linha).toBe(2);
  });
});

describe("modelo de planilha", () => {
  it("cabeçalhos do modelo são reconhecidos automaticamente", () => {
    const h = templateHeaders();
    expect(h[0]).toBe("Título");
    const m = suggestMapping(h);
    expect(Object.keys(m)).toHaveLength(h.length);
  });
  it("fase, repetições, listas e tratamentos", () => {
    const row = { Título: "Ensaio X", Fase: "Em andamento", "Número de repetições": "4", Organismos: "Chrysodeixis includens", Culturas: "Soja, Milho" };
    const [r] = prepareImport([row], suggestMapping(Object.keys(row)), new Set());
    expect(r.dados).toMatchObject({ fase: "andamento", num_repeticoes: 4, organismos: ["Chrysodeixis includens"], culturas: ["soja", "milho"] });
    const bad = prepareImport([{ Título: "Ensaio Y", Fase: "Interrompido", "Número de repetições": "2,5" }], suggestMapping(["Título", "Fase", "Número de repetições"]), new Set());
    expect(bad[0].status).toBe("invalida");
    expect(bad[0].erros).toHaveLength(2);
    expect(parseTreatments("T1: água; T2 - 150 mL/ha; sem código")).toEqual([
      { codigo: "T1", descricao: "água" },
      { codigo: "T2", descricao: "150 mL/ha" },
      { codigo: null, descricao: "sem código" },
    ]);
    expect(sameName("Marco Antonio Tamai", "marco antônio  tamai")).toBe(true);
    expect(parseDate("31/02/2026")).toBe("invalid");
  });
});

describe("validação de formulários", () => {
  const base = { titulo: "Experimento teste", fase: "implantacao", disponibilidade: "nao_informado", nivel_acesso: "colaboradores", periodicidade_acompanhamento: "mensal" };
  it("permite rascunho parcial", () => {
    expect(experimentSchema.safeParse(base).success).toBe(true);
  });
  it("exige campos essenciais ao ativar acompanhamento", () => {
    const r = experimentSchema.safeParse({ ...base, acompanhamento_ativo: "on" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["pesquisador_principal_id", "data_inicio", "objetivo_geral"]));
  });
  it("exige motivo quando interrompido e datas coerentes", () => {
    expect(experimentSchema.safeParse({ ...base, fase: "interrompido" }).success).toBe(false);
    expect(experimentSchema.safeParse({ ...base, data_inicio: "2026-05-01", data_termino_prevista: "2026-04-01" }).success).toBe(false);
  });
  it("campos vazios viram null (sem estimativa)", () => {
    const r = experimentSchema.parse({ ...base, objetivo_geral: "", num_repeticoes: "" });
    expect(r.objetivo_geral).toBeNull();
    expect(r.num_repeticoes).toBeNull();
  });
  it("atividade aguardando terceiro exige motivo", () => {
    const t = { titulo: "Ligar", categoria: "geral", prioridade: "media", status: "aguardando_terceiro" };
    expect(taskSchema.safeParse(t).success).toBe(false);
    expect(taskSchema.safeParse({ ...t, motivo_bloqueio: "Aguardando pesquisador" }).success).toBe(true);
  });
});

describe("datas e diff", () => {
  it("fuso America/Bahia", () => {
    expect(localInputToIso("2026-11-15T09:00")).toBe("2026-11-15T12:00:00.000Z");
    expect(monthBoundsUtc("2026-11-01", "2026-11-30")).toEqual({ from: "2026-11-01T03:00:00.000Z", to: "2026-12-01T03:00:00.000Z" });
    expect(fmtDate("2026-11-05")).toBe("05/11/2026");
  });
  it("diff por linhas", () => {
    const d = diffLines("a\nb\nc", "a\nx\nc");
    expect(d).toEqual([
      { kind: "same", text: "a" },
      { kind: "del", text: "b" },
      { kind: "add", text: "x" },
      { kind: "same", text: "c" },
    ]);
  });
});
