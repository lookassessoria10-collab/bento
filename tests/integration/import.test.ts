import fs from "node:fs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { prepareImport, sameName, suggestMapping } from "../../src/lib/import";
import { as, orgId } from "./helpers";

// Reproduz a gravação da importação (server action) com o arquivo convertido do resumo Azadiractina × C. includens.
describe("importação pelo modelo de planilha", () => {
  it("o arquivo convertido é aceito pelo banco, com tratamentos e observações", async () => {
    const ORG = await orgId();
    const est = await as("estudante");
    const text = fs.readFileSync("importacoes/experimento-azadiractina-chrysodeixis-includens.csv", "utf8").replace(/^﻿/, "");
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const [r] = prepareImport(parsed.data, suggestMapping(parsed.meta.fields ?? []), new Set());
    expect(r.status).toBe("valida");

    const { data: people } = await est.from("people").select("id, nome").eq("organization_id", ORG);
    expect(sameName("marco antonio tamai", "Marco Antônio Tamai")).toBe(true);
    const { data: exp, error } = await est
      .from("experiments")
      .insert({ ...(r.dados as { titulo: string }), titulo: `[TESTE] ${String(r.dados!.titulo)}`, organization_id: ORG, codigo: "", codigo_seq: 0, disponibilidade: "pendente_conferencia" })
      .select("id, fase, num_repeticoes, culturas, organismos, observacoes_escopo")
      .single();
    expect(error).toBeNull();
    expect(exp).toMatchObject({ fase: "concluido", num_repeticoes: 5, culturas: ["soja"], organismos: ["Chrysodeixis includens (falsa-medideira)"] });
    expect(exp!.observacoes_escopo).toContain("Autores:");
    const { error: tErr } = await est
      .from("experiment_treatments")
      .insert(r.tratamentos!.map((t, ordem) => ({ organization_id: ORG, experiment_id: exp!.id, codigo: t.codigo, descricao: t.descricao, ordem })));
    expect(tErr).toBeNull();
    const { data: ts } = await est.from("experiment_treatments").select("codigo").eq("experiment_id", exp!.id).order("ordem");
    expect(ts!.map((t) => t.codigo)).toEqual(["T1", "T2", "T3", "T4"]);
    expect(people!.length).toBeGreaterThan(0);
  });
});
