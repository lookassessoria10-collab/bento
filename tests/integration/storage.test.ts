import { beforeAll, describe, expect, it } from "vitest";
import { anon, as, expId, orgId, service, tag } from "./helpers";

let ORG: string;
let EXP1: string;
let EXP2: string;

beforeAll(async () => {
  ORG = await orgId();
  EXP1 = await expId("EA360-001");
  EXP2 = await expId("EA360-002");
});

const png = () => new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], { type: "image/png" });

describe("Storage privado", () => {
  it("upload na pasta da organização; leitura só com permissão no registro", async () => {
    const coord = await as("coordenacao");
    const path = `${ORG}/arquivos/${crypto.randomUUID()}-teste-${tag()}.png`;
    const up = await coord.storage.from("bento-privado").upload(path, png(), { contentType: "image/png" });
    expect(up.error).toBeNull();
    // sem registro de metadados ninguém lê (nem quem enviou)
    expect((await coord.storage.from("bento-privado").createSignedUrl(path, 30)).error).not.toBeNull();

    // vinculado ao experimento privado EA360-002
    const { error } = await coord.from("files").insert({ organization_id: ORG, storage_path: path, nome_amigavel: "[TESTE] foto", tipo: "foto", legenda: "Legenda", autoria: "Equipe", data_arquivo: "2026-11-01", experiment_id: EXP2 });
    expect(error).toBeNull();
    expect((await coord.storage.from("bento-privado").createSignedUrl(path, 30)).error).toBeNull();
    // pesquisador B (proprietário) lê; estudante sem vínculo e pesquisador A não
    expect((await (await as("pesquisador2")).storage.from("bento-privado").createSignedUrl(path, 30)).error).toBeNull();
    expect((await (await as("estudante")).storage.from("bento-privado").createSignedUrl(path, 30)).error).not.toBeNull();
    expect((await (await as("pesquisador")).storage.from("bento-privado").createSignedUrl(path, 30)).error).not.toBeNull();
    expect((await anon().storage.from("bento-privado").createSignedUrl(path, 30)).error).not.toBeNull();
  });

  it("não envia para outra organização nem sobrescreve originais", async () => {
    const est = await as("estudante");
    const orgB = await orgId("org-teste-b");
    expect((await est.storage.from("bento-privado").upload(`${orgB}/arquivos/${crypto.randomUUID()}-x.png`, png(), { contentType: "image/png" })).error).not.toBeNull();
    expect((await est.storage.from("bento-privado").upload(`${ORG}/../x.png`, png(), { contentType: "image/png" })).error).not.toBeNull();
    const path = `${ORG}/arquivos/${crypto.randomUUID()}-y.png`;
    expect((await est.storage.from("bento-privado").upload(path, png(), { contentType: "image/png" })).error).toBeNull();
    expect((await est.storage.from("bento-privado").upload(path, png(), { contentType: "image/png", upsert: true })).error).not.toBeNull();
    expect((await est.storage.from("bento-privado").remove([path])).data ?? []).toEqual([]);
  });

  it("bloqueia tipo de arquivo não permitido no bucket", async () => {
    const est = await as("estudante");
    const r = await est.storage.from("bento-privado").upload(`${ORG}/arquivos/${crypto.randomUUID()}-x.html`, new Blob(["<script>"], { type: "text/html" }), { contentType: "text/html" });
    expect(r.error).not.toBeNull();
  });

  it("foto sem legenda/autoria é recusada e arquivo não muda de caminho", async () => {
    const est = await as("estudante");
    const { error } = await est.from("files").insert({ organization_id: ORG, external_url: "https://exemplo.invalid/f", nome_amigavel: "foto", tipo: "foto", experiment_id: EXP1 });
    expect(error).not.toBeNull();
    const { data: f } = await est.from("files").insert({ organization_id: ORG, external_url: "https://exemplo.invalid/doc", nome_amigavel: "[TESTE] doc", tipo: "relatorio", experiment_id: EXP1 }).select("id").single();
    expect((await est.from("files").update({ storage_path: `${ORG}/arquivos/outro` }).eq("id", f!.id)).error?.message).toMatch(/sobrescritos/);
    // canal externo exige divulgação autorizada
    expect((await est.from("files").update({ autorizacao_canais: ["portal"] }).eq("id", f!.id)).error).not.toBeNull();
    await service().from("files").update({ deleted_at: new Date().toISOString() }).eq("id", f!.id);
  });
});
