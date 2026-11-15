/**
 * Importador ADMINISTRATIVO do ambiente de demonstração (dados 100% sintéticos).
 *
 *   npm run demo:dry-run                      prévia: valida o JSON e mostra o que seria criado/atualizado (não grava)
 *   npm run demo:apply  [-- --membro email]   importa/atualiza (idempotente) e, opcionalmente, dá acesso de coordenação
 *   npm run demo:verify                       confere contagens, relações e regras no banco
 *   npm run demo:rollback                     remove SOMENTE a organização de demonstração (e seus registros)
 *
 * Alvo: por padrão só o Supabase LOCAL (.env.local apontando para 127.0.0.1/localhost).
 * Remoto exige `--project-ref <ref> --confirmar-remoto` (chaves obtidas pela CLI logada, nunca impressas).
 * Opções: --arquivo <caminho> (padrão supabase/demo/bento-demo-dados.json) · --restaurar-premissas
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../src/lib/supabase/database.types";
import { buildComplementRows, buildDemoRows, countDataset, demoUuid, parseDemoComplement, parseDemoDataset, type DemoDataset, type DemoRows } from "../src/lib/demo/dataset";

config({ path: ".env.local" });

type DB = SupabaseClient<Database>;
const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (k: string) => process.argv.includes(`--${k}`);
const MODES = ["dry-run", "apply", "verify", "rollback-demo"] as const;
type Mode = (typeof MODES)[number];
const mode = (arg("modo") ?? "dry-run") as Mode;
const BUCKET = "bento-privado";
const BATCH_TAG = "demo-importacao";

function target(): { url: string; secret: string; label: string } | null {
  const ref = arg("project-ref");
  if (ref) {
    if (!/^[a-z0-9]{20}$/.test(ref)) throw new Error("--project-ref inválido.");
    if (!flag("confirmar-remoto")) throw new Error("Alvo remoto exige --confirmar-remoto (gravação fora do ambiente local precisa de aprovação explícita).");
    const cliArgs = ["projects", "api-keys", "--project-ref", ref, "--reveal", "-o", "json"];
    const out =
      process.platform === "win32"
        ? execFileSync("cmd.exe", ["/d", "/s", "/c", "node_modules\\.bin\\supabase.cmd", ...cliArgs], { encoding: "utf8" })
        : execFileSync("node_modules/.bin/supabase", cliArgs, { encoding: "utf8" });
    const keys = JSON.parse(out) as { name: string; type?: string; api_key: string }[];
    const secret = (keys.find((k) => k.type === "secret") ?? keys.find((k) => k.name === "service_role"))?.api_key;
    if (!secret) throw new Error("Chave secreta não encontrada pela CLI.");
    return { url: `https://${ref}.supabase.co`, secret, label: `REMOTO (${ref})` };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error("O .env.local não aponta para o Supabase local. Para outro alvo use --project-ref e --confirmar-remoto.");
  }
  return { url, secret, label: `LOCAL (${url})` };
}

function loadDataset(): DemoDataset {
  const path = arg("arquivo") ?? "supabase/demo/bento-demo-dados.json";
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Não foi possível ler ${path}: ${(e as Error).message}`);
  }
  const r = parseDemoDataset(raw);
  if (!r.data) {
    console.error("JSON rejeitado — nada foi gravado:");
    r.errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }
  return r.data;
}

/** Agenda fictícia complementar (supabase/demo/bento-demo-complemento.json), validada contra o pacote principal. */
export function loadComplement(d: DemoDataset) {
  const path = arg("complemento") ?? "supabase/demo/bento-demo-complemento.json";
  const r = parseDemoComplement(JSON.parse(readFileSync(path, "utf8")), d);
  if (!r.data) throw new Error(`Complemento rejeitado — nada foi gravado: ${r.errors.join(" | ")}`);
  return r.data;
}

const ok = (e: { message: string } | null, what: string) => {
  if (e) throw new Error(`${what}: ${e.message}`);
};
const chunks = <T>(a: T[], n = 400) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Garante que o alvo é a organização de demonstração (nunca uma instituição real). */
async function resolveOrg(sb: DB, d: DemoDataset, create: boolean) {
  const id = demoUuid(`org:${d.demoOrganization.slug}`);
  const { data: bySlug, error } = await sb.from("organizations").select("id, slug, is_demo").eq("slug", d.demoOrganization.slug).maybeSingle();
  ok(error, "consulta da organização");
  if (bySlug && (!bySlug.is_demo || bySlug.id !== id)) {
    throw new Error(`Já existe a organização '${bySlug.slug}' que NÃO é a demonstração esperada. Operação abortada.`);
  }
  const { data: byId } = await sb.from("organizations").select("id, slug, is_demo").eq("id", id).maybeSingle();
  if (byId && (!byId.is_demo || byId.slug !== d.demoOrganization.slug)) throw new Error("Conflito de identificador com organização não demonstrativa. Abortado.");
  if (!bySlug && create) {
    const { error: ie } = await sb.from("organizations").insert({ id, nome: d.demoOrganization.name, slug: d.demoOrganization.slug, is_demo: true });
    ok(ie, "criação da organização de demonstração");
  }
  return { id, exists: !!bySlug };
}

const TABLE_ORDER = [
  "people",
  "farms",
  "farm_areas",
  "experiments",
  "experiment_treatments",
  "experiment_members",
  "visit_schedules",
  "visit_schedule_experiments",
  "visit_records",
  "experiment_measurements",
  "experiment_incidents",
  "experiment_plot_readings",
  "tasks",
  "files",
  "editorial_items",
  "editorial_sources",
  "demo_time_assumptions",
] as const;
type Table = (typeof TABLE_ORDER)[number];

function rowsOf(rows: DemoRows, t: Table): Record<string, unknown>[] {
  if (t === "files") return rows.files.map((f) => f.row);
  return rows[t] as unknown as Record<string, unknown>[];
}

async function existingIds(sb: DB, t: Table, orgId: string): Promise<Set<string>> {
  if (t === "visit_schedule_experiments") {
    const { data } = await sb.from(t).select("visit_id, experiment_id").eq("organization_id", orgId);
    return new Set((data ?? []).map((r) => `${r.visit_id}|${r.experiment_id}`));
  }
  const { data, error } = await sb.from(t).select("id").eq("organization_id", orgId).limit(10000);
  ok(error, `leitura de ${t}`);
  return new Set((data ?? []).map((r) => (r as { id: string }).id));
}
const keyOf = (t: Table, r: Record<string, unknown>) => (t === "visit_schedule_experiments" ? `${r.visit_id}|${r.experiment_id}` : String(r.id));

async function checkpoint(sb: DB, orgId: string, d: DemoDataset, step: string, done: boolean, report?: Json) {
  const id = demoUuid(`batch:${d.demoOrganization.slug}`);
  const c = countDataset(d);
  const { error } = await sb.from("import_batches").upsert({
    id,
    organization_id: orgId,
    entidade: BATCH_TAG,
    arquivo_nome: "bento-demo-dados.json",
    total_linhas: c.portfolioCount,
    importadas: done ? c.portfolioCount : 0,
    relatorio: { etapa: step, concluido: done, atualizado_em: new Date().toISOString(), schemaVersion: d.schemaVersion, resumo: report ?? null },
  });
  ok(error, "registro do checkpoint");
}

export async function dryRun(sb: DB | null, d: DemoDataset) {
  const rows = buildDemoRows(d, demoUuid(`org:${d.demoOrganization.slug}`));
  console.log("Prévia (nenhum dado foi gravado):");
  let org: { id: string; exists: boolean } | null = null;
  if (sb) org = await resolveOrg(sb, d, false);
  console.log(`  organização de demonstração: ${d.demoOrganization.name} — ${org?.exists ? "já existe (será atualizada)" : "seria criada"}`);
  for (const t of TABLE_ORDER) {
    const list = rowsOf(rows, t);
    const have = sb && org?.exists ? await existingIds(sb, t, org.id) : new Set<string>();
    const upd = list.filter((r) => have.has(keyOf(t, r))).length;
    console.log(`  ${t.padEnd(28)} criar ${String(list.length - upd).padStart(4)} · atualizar ${String(upd).padStart(4)}`);
  }
  const comp = buildComplementRows(loadComplement(d), demoUuid(`org:${d.demoOrganization.slug}`));
  console.log(`  complemento: ${comp.visit_schedules.length} visitas futuras planejadas · ${comp.calendar_events.length} compromissos (upsert por id)`);
}

export async function apply(sb: DB, d: DemoDataset) {
  const org = await resolveOrg(sb, d, true);
  const rows = buildDemoRows(d, org.id);
  await checkpoint(sb, org.id, d, "inicio", false);
  const { error: se } = await sb
    .from("project_settings")
    .upsert(
      {
        organization_id: org.id,
        nome_projeto: `${d.demoOrganization.name} — demonstração`,
        assinatura: "Ambiente de demonstração | Dados simulados",
        portal_publico_ativo: false,
        feedback_publico_ativo: false,
        exibir_marcas_institucionais: false,
        meta_boletins: d.editorialExamples.length,
        onboarding_concluido: true,
      },
      { onConflict: "organization_id" },
    );
  ok(se, "configurações da demonstração");

  for (const t of TABLE_ORDER) {
    if (t === "files") {
      for (const f of rows.files) {
        const { error } = await sb.storage.from(BUCKET).upload(f.row.storage_path, new Blob([f.content], { type: "text/plain" }), { upsert: true, contentType: "text/plain" });
        ok(error, `envio de ${f.row.nome_original}`);
      }
    }
    const list = rowsOf(rows, t);
    const keepEdits = t === "demo_time_assumptions" && !flag("restaurar-premissas");
    for (const part of chunks(list)) {
      const onConflict = t === "visit_schedule_experiments" ? "visit_id,experiment_id" : "id";
      const { error } = await sb.from(t).upsert(part as never, { onConflict, ignoreDuplicates: keepEdits });
      ok(error, `gravação de ${t}`);
    }
    await checkpoint(sb, org.id, d, t, false);
    console.log(`  ✓ ${t} (${list.length})`);
  }

  const comp = buildComplementRows(loadComplement(d), org.id);
  for (const [t, list] of [["visit_schedules", comp.visit_schedules], ["visit_schedule_experiments", comp.visit_schedule_experiments], ["calendar_events", comp.calendar_events]] as const) {
    const onConflict = t === "visit_schedule_experiments" ? "visit_id,experiment_id" : "id";
    const { error } = await sb.from(t).upsert(list as never, { onConflict });
    ok(error, `gravação do complemento (${t})`);
    console.log(`  ✓ complemento ${t} (${list.length})`);
  }

  const email = arg("membro")?.toLowerCase();
  if (email) {
    const { data: prof } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!prof) throw new Error(`Usuário ${email} não encontrado. Ele precisa existir (convite aceito) antes de receber acesso à demonstração.`);
    const { error } = await sb.from("memberships").upsert({ organization_id: org.id, user_id: prof.id, role: "coordenacao", status: "ativo" }, { onConflict: "organization_id,user_id,role" });
    ok(error, "acesso à demonstração");
    console.log(`  ✓ ${email} recebeu acesso de coordenação SOMENTE à organização de demonstração`);
  }
  await checkpoint(sb, org.id, d, "concluido", true, countDataset(d) as unknown as Json);
  console.log(`Importação concluída para ${d.demoOrganization.name}.`);
}

interface Check {
  name: string;
  got: unknown;
  want: unknown;
}
export async function verify(sb: DB, d: DemoDataset): Promise<Check[]> {
  const org = await resolveOrg(sb, d, false);
  const comp = loadComplement(d);
  if (!org.exists) throw new Error("A organização de demonstração não existe neste banco.");
  const c = countDataset(d);
  const count = async (t: Table | "import_batches", extra?: (q: ReturnType<DB["from"]>) => unknown) => {
    let q = sb.from(t).select("*", { count: "exact", head: true }).eq("organization_id", org.id);
    if (extra) q = extra(q as never) as typeof q;
    const { count: n, error } = await q;
    ok(error, `contagem ${t}`);
    return n ?? 0;
  };
  const { data: exps } = await sb.from("experiments").select("codigo, fase, is_demo, data_termino_efetiva").eq("organization_id", org.id);
  const fases = (exps ?? []).reduce<Record<string, number>>((m, e) => ((m[e.fase] = (m[e.fase] ?? 0) + 1), m), {});
  const { data: orgRow } = await sb.from("organizations").select("is_demo").eq("id", org.id).single();
  const { data: batch } = await sb.from("import_batches").select("relatorio").eq("organization_id", org.id).eq("entidade", BATCH_TAG).maybeSingle();
  const { data: nullMeas } = await sb.from("experiment_measurements").select("valor, motivo_ausencia").eq("organization_id", org.id).is("valor", null);
  const exp015 = demoUuid("exp:DEMO-EA360-015");
  const { count: plots015 } = await sb.from("experiment_plot_readings").select("*", { count: "exact", head: true }).eq("experiment_id", exp015);
  const { count: futureVisits } = await sb
    .from("visit_schedules")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("status", "realizada")
    .gt("data_hora", `${d.asOfDate}T23:59:59-03:00`);
  const { count: futureDone } = await sb.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", org.id).eq("status", "concluida").gt("prazo", d.asOfDate);
  const notDemo = async (t: Table) => {
    const { count: n } = await sb.from(t).select("*", { count: "exact", head: true }).eq("organization_id", org.id).eq("is_demo" as never, false as never);
    return n ?? 0;
  };
  const { count: demoCodesElsewhere } = await sb.from("experiments").select("*", { count: "exact", head: true }).like("codigo", "DEMO-EA360-%").neq("organization_id", org.id).eq("is_demo", true);
  const { data: settings } = await sb.from("project_settings").select("portal_publico_ativo").eq("organization_id", org.id).single();
  const { count: pubs } = await sb.from("public_publications").select("*", { count: "exact", head: true }).eq("organization_id", org.id);

  const checks: Check[] = [
    { name: "organização marcada como demonstração", got: orgRow?.is_demo, want: true },
    { name: "experimentos", got: await count("experiments"), want: c.portfolioCount },
    { name: "visitas realizadas (agendas)", got: await count("visit_schedules", (q) => q.eq("status", "realizada")), want: c.visits },
    { name: "visitas futuras planejadas (complemento)", got: await count("visit_schedules", (q) => q.in("status", ["planejada", "confirmada"]).gt("data_hora", `${d.asOfDate}T23:59:59-03:00`)), want: comp.plannedVisits.length },
    { name: "compromissos da agenda (complemento)", got: (await sb.from("calendar_events").select("*", { count: "exact", head: true }).eq("organization_id", org.id)).count ?? 0, want: comp.events.length },
    { name: "compromissos realizados com data futura", got: (await sb.from("calendar_events").select("*", { count: "exact", head: true }).eq("organization_id", org.id).gt("realizado_em", d.asOfDate)).count ?? 0, want: 0 },
    { name: "fichas de visita", got: await count("visit_records"), want: c.visits },
    { name: "medições", got: await count("experiment_measurements"), want: c.measurements },
    { name: "ocorrências", got: await count("experiment_incidents"), want: c.incidents },
    { name: "leituras por parcela", got: await count("experiment_plot_readings"), want: c.plots },
    { name: "fase concluído", got: fases.concluido ?? 0, want: c.statuses.concluido },
    { name: "fase em andamento", got: fases.andamento ?? 0, want: c.statuses.em_andamento },
    { name: "fase interrompido", got: fases.interrompido ?? 0, want: c.statuses.interrompido },
    { name: "fase planejado", got: fases.planejado ?? 0, want: c.statuses.planejado },
    { name: "medições ausentes preservadas como nulas (com motivo)", got: (nullMeas ?? []).filter((m) => m.motivo_ausencia).length, want: 2 },
    { name: "DEMO-EA360-015 sem leituras finais", got: plots015 ?? 0, want: 0 },
    { name: "término efetivo não inventado", got: (exps ?? []).filter((e) => e.data_termino_efetiva).length, want: 0 },
    { name: "visitas futuras marcadas como realizadas", got: futureVisits ?? 0, want: 0 },
    { name: "tarefas futuras marcadas como concluídas", got: futureDone ?? 0, want: 0 },
    { name: "registros sem marcador is_demo", got: (await Promise.all((["experiments", "visit_records", "experiment_measurements", "experiment_incidents", "experiment_plot_readings", "tasks", "files", "people"] as Table[]).map(notDemo))).reduce((a, b) => a + b, 0), want: 0 },
    { name: "códigos DEMO em outras organizações", got: demoCodesElsewhere ?? 0, want: 0 },
    { name: "portal público desativado na demonstração", got: settings?.portal_publico_ativo, want: false },
    { name: "publicações públicas da demonstração", got: pubs ?? 0, want: 0 },
    { name: "importação concluída (checkpoint)", got: (batch?.relatorio as { concluido?: boolean } | null)?.concluido ?? false, want: true },
  ];
  return checks;
}

export async function rollback(sb: DB, d: DemoDataset) {
  const org = await resolveOrg(sb, d, false);
  if (!org.exists) {
    console.log("Nada a remover: a organização de demonstração não existe.");
    return;
  }
  const prefix = `${org.id}/demo`;
  const { data: dirs } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  for (const dir of dirs ?? []) {
    const { data: objs } = await sb.storage.from(BUCKET).list(`${prefix}/${dir.name}`, { limit: 1000 });
    const paths = (objs ?? []).map((o) => `${prefix}/${dir.name}/${o.name}`);
    if (paths.length) ok((await sb.storage.from(BUCKET).remove(paths)).error, "remoção de arquivos");
  }
  const { data, error } = await sb.rpc("demo_purge_organization", { p_org: org.id });
  ok(error, "remoção da demonstração");
  console.log("Removido (somente organização de demonstração):", data);
}

async function main() {
  if (!MODES.includes(mode)) throw new Error(`--modo deve ser um de: ${MODES.join(", ")}`);
  const d = loadDataset();
  console.log(`Pacote: ${d.dataType} · v${d.schemaVersion} · referência ${d.asOfDate} · ${d.experiments.length} ensaios`);
  const t = target();
  if (!t && mode !== "dry-run") throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local (Supabase local).");
  console.log(`Alvo: ${t?.label ?? "nenhum (apenas validação do arquivo)"} · modo: ${mode}`);
  const sb = t ? createClient<Database>(t.url, t.secret, { auth: { persistSession: false } }) : null;
  if (mode === "dry-run") return dryRun(sb, d);
  if (mode === "apply") return apply(sb!, d);
  if (mode === "rollback-demo") return rollback(sb!, d);
  const checks = await verify(sb!, d);
  let fail = 0;
  for (const c of checks) {
    const pass = c.got === c.want;
    if (!pass) fail++;
    console.log(`  ${pass ? "✓" : "✗"} ${c.name}: ${String(c.got)}${pass ? "" : ` (esperado ${String(c.want)})`}`);
  }
  if (fail) {
    console.error(`${fail} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log("Verificação concluída sem divergências.");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/importar-demo-bento.ts")) {
  main().catch((e) => {
    console.error(`Erro: ${(e as Error).message}`);
    process.exit(1);
  });
}
