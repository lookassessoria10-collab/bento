import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/format";
import { seriesOf, timeEconomy, type GMeasurement } from "@/lib/gestao";
import { addDaysIso, calendarEntries, statusByCulture, visitsByMonth, type PEvent, type PSchedule } from "@/lib/painel";
import { effectiveSections, hashShareToken, isWellFormedToken, shareConfigSchema, shareState, verifySharePassword, type SharePublico } from "@/lib/share";
import type { ShareDto } from "@/lib/share-dto";

type Admin = SupabaseClient<Database>;
type LinkRow = Database["public"]["Tables"]["dashboard_share_links"]["Row"];

/**
 * Monta o painel de um link. A ORGANIZAÇÃO vem do registro do link (nunca da requisição) e TODA consulta
 * é filtrada explicitamente por ela e pelo escopo configurado. Usa a chave privilegiada só no servidor.
 * Fora da demonstração: ensaios de acesso restrito não entram nem nas contagens; resultados só se validados
 * e liberados para o portal; documentos só com divulgação autorizada para o portal.
 */
export async function buildShareDto(admin: Admin, link: Pick<LinkRow, "organization_id" | "publico" | "config">): Promise<ShareDto> {
  const cfg = shareConfigSchema.parse(link.config);
  const org = link.organization_id;
  const { data: o } = await admin.from("organizations").select("nome, is_demo").eq("id", org).single();
  const demo = !!o?.is_demo;
  const secoes = effectiveSections(cfg, demo);
  const has = (s: string) => secoes.includes(s as never);

  let eq = admin
    .from("experiments")
    .select("id, codigo, titulo, culturas, fase, updated_at, nivel_acesso, demo_meta")
    .eq("organization_id", org)
    .is("archived_at", null);
  if (!demo) eq = eq.neq("nivel_acesso", "privado_equipe");
  if (cfg.experimentos.length) eq = eq.in("id", cfg.experimentos);
  const { data: exps } = await eq.order("codigo").limit(2000);
  const E = exps ?? [];
  const ids = E.map((e) => e.id);
  const code = new Map(E.map((e) => [e.id, e.codigo]));
  let ref = localDate();
  if (demo) for (const e of E) {
    const a = (e.demo_meta as { asOfDate?: string } | null)?.asOfDate;
    if (a) ref = a;
  }
  const inP = (d: string) => (!cfg.de || d >= cfg.de) && (!cfg.ate || d <= cfg.ate);

  const none = ["00000000-0000-0000-0000-000000000000"];
  const [sch, ev, inc] = await Promise.all([
    admin.from("visit_schedule_experiments").select("experiment_id, visit_schedules!inner(id, data_hora, status, titulo)").eq("organization_id", org).in("experiment_id", ids.length ? ids : none).limit(10000),
    admin.from("calendar_events").select("id, experiment_id, tipo, titulo, data_prevista, status, realizado_em").eq("organization_id", org).in("experiment_id", ids.length ? ids : none).limit(5000),
    admin.from("experiment_incidents").select("titulo, gravidade, status, detectada_em, experiment_id").eq("organization_id", org).in("experiment_id", ids.length ? ids : none).limit(5000),
  ]);
  const schedules: PSchedule[] = [];
  const seen = new Map<string, PSchedule>();
  for (const r of sch.data ?? []) {
    const v = r.visit_schedules as unknown as { id: string; data_hora: string; status: PSchedule["status"]; titulo: string };
    const cur = seen.get(v.id);
    if (cur) cur.experiment_ids.push(r.experiment_id);
    else {
      const item: PSchedule = { id: v.id, titulo: "Visita de acompanhamento", data: localDate(v.data_hora), hora: null, status: v.status, experiment_ids: [r.experiment_id] };
      seen.set(v.id, item);
      schedules.push(item);
    }
  }
  const events: PEvent[] = (ev.data ?? []).map((e) => ({ ...e, tipo: e.tipo as PEvent["tipo"], status: e.status as PEvent["status"], visit_id: null, responsavel: null, observacoes: null }));
  const entries = calendarEntries(schedules, events);
  const open = (inc.data ?? []).filter((i) => i.status === "aberta" || i.status === "em_acompanhamento");
  const porFase: Record<string, number> = {};
  for (const e of E) porFase[e.fase] = (porFase[e.fase] ?? 0) + 1;
  const culturas = new Map<string, number>();
  for (const e of E) for (const c of e.culturas) culturas.set(c, (culturas.get(c) ?? 0) + 1);
  const next = entries.filter((e) => ["planejado", "confirmado", "reagendado"].includes(e.status) && e.data >= ref && e.data <= addDaysIso(ref, 60));

  const dto: ShareDto = {
    titulo: cfg.titulo,
    subtitulo: cfg.subtitulo,
    publico: link.publico as SharePublico,
    organizacao: o?.nome ?? "",
    demo,
    referencia: ref,
    ultimaAtualizacao: E.reduce<string | null>((m, e) => (!m || e.updated_at > m ? e.updated_at : m), null),
    geradoEm: new Date().toISOString(),
    periodo: { de: cfg.de, ate: cfg.ate },
    secoes,
  };
  if (has("indicadores")) {
    dto.indicadores = {
      total: E.length,
      porFase,
      visitasRealizadas: entries.filter((e) => e.tipo === "visita" && e.status === "realizado" && inP(e.data)).length,
      visitasAgendadas: entries.filter((e) => e.tipo === "visita" && ["planejado", "confirmado", "reagendado"].includes(e.status) && inP(e.data)).length,
      ocorrenciasAbertas: has("ocorrencias") ? open.length : null,
      proximos30: has("calendario") ? next.filter((e) => e.data <= addDaysIso(ref, 30)).length : null,
    };
  }
  if (has("graficos")) {
    dto.graficos = {
      culturas: [...culturas.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      statusPorCultura: statusByCulture(E.map((e) => ({ ...e, fase: e.fase, culturas: e.culturas }) as never)).map((r) => ({ label: r.cultura, counts: r.counts, total: r.total })),
      visitasMes: visitsByMonth(entries.filter((e) => inP(e.data))),
    };
  }
  if (has("calendario")) dto.calendario = next.map((e) => ({ data: e.data, tipo: e.tipo, status: e.status, ensaio: e.experiment_ids[0] ? (code.get(e.experiment_ids[0]) ?? null) : null }));
  if (has("ocorrencias")) dto.ocorrencias = open.map((i) => ({ titulo: i.titulo, gravidade: i.gravidade, status: i.status, data: i.detectada_em, ensaio: code.get(i.experiment_id) ?? "" }));

  if (has("resultados")) {
    if (demo) {
      // dados sintéticos: uma série por ensaio (a primeira variável medida), com ausências preservadas
      const { data: meas } = await admin.from("experiment_measurements").select("experiment_id, visit_record_id, data_medicao, variavel, valor, unidade, motivo_ausencia, ordem").eq("organization_id", org).in("experiment_id", ids.length ? ids : none).order("ordem").limit(20000);
      const M: GMeasurement[] = (meas ?? []).map((m) => ({ ...m, valor: m.valor === null ? null : Number(m.valor) }));
      const withInc = new Set(open.map((i) => i.experiment_id).concat((inc.data ?? []).map((i) => i.experiment_id)));
      const pick = cfg.experimentos.length ? E : E.filter((e) => withInc.has(e.id));
      dto.resultadosDemo = pick
        .slice(0, 8)
        .map((e) => ({ e, s: seriesOf(M, e.id)[0] }))
        .filter((x) => x.s)
        .map(({ e, s }) => ({ ensaio: e.codigo, titulo: e.titulo, variavel: s.variavel, unidade: s.unidade, pontos: s.pontos }));
    } else {
      const { data: res } = await admin
        .from("result_summaries")
        .select("experiment_id, variavel, unidade, sintese, situacao_analise, data_referencia, fonte_descricao, escopo_divulgacao, validacao_status")
        .eq("organization_id", org)
        .in("experiment_id", ids.length ? ids : none)
        .eq("validacao_status", "validado")
        .contains("escopo_divulgacao", ["portal"])
        .limit(500);
      dto.resultadosReais = (res ?? []).map((r) => ({ ensaio: code.get(r.experiment_id) ?? "", variavel: r.variavel, unidade: r.unidade, sintese: r.sintese, situacao: r.situacao_analise, dataReferencia: r.data_referencia, fonte: r.fonte_descricao }));
    }
  }
  if (has("documentos")) {
    const { data: files } = await admin
      .from("files")
      .select("nome_amigavel, tipo, data_arquivo, autorizacao_uso, autorizacao_canais, experiment_id")
      .eq("organization_id", org)
      .is("deleted_at", null)
      .eq("autorizacao_uso", "divulgacao_autorizada")
      .contains("autorizacao_canais", ["portal"])
      .limit(500);
    dto.documentos = (files ?? []).filter((f) => !f.experiment_id || ids.includes(f.experiment_id)).map((f) => ({ nome: f.nome_amigavel, tipo: f.tipo, data: f.data_arquivo }));
  }
  if (has("economia") && demo) {
    const { data: t } = await admin.from("demo_time_assumptions").select("atividade, eventos_mes, minutos_antes, minutos_bento").eq("organization_id", org).order("ordem");
    if (t?.length) dto.economia = timeEconomy(t.map((x) => ({ atividade: x.atividade, eventos_mes: Number(x.eventos_mes), minutos_antes: Number(x.minutos_antes), minutos_bento: Number(x.minutos_bento) })));
  }
  return dto;
}

export type ShareResolution = { status: "ok"; dto: ShareDto } | { status: "indisponivel" } | { status: "senha"; erro?: string };

/** Valida o token (formato, hash, situação, validade, senha com bloqueio) e só então monta o painel. */
export async function resolveShare(token: unknown, senha: unknown): Promise<ShareResolution> {
  if (!isWellFormedToken(token)) return { status: "indisponivel" };
  const admin = createAdminClient();
  if (!admin) return { status: "indisponivel" };
  const { data: link } = await admin.from("dashboard_share_links").select("id, organization_id, publico, config, status, expira_em, senha_hash, bloqueado_ate").eq("token_hash", hashShareToken(token)).maybeSingle();
  if (!link || shareState(link) !== "ativo") return { status: "indisponivel" };
  if (link.senha_hash) {
    if (link.bloqueado_ate && new Date(link.bloqueado_ate) > new Date()) return { status: "senha", erro: "Muitas tentativas. Tente novamente em alguns minutos." };
    if (typeof senha !== "string" || !senha) return { status: "senha" };
    const ok = senha.length <= 200 && verifySharePassword(senha, link.senha_hash);
    await admin.rpc("share_link_password_result", { p_id: link.id, p_ok: ok });
    if (!ok) return { status: "senha", erro: "Senha incorreta." };
  }
  await admin.rpc("share_link_touch", { p_id: link.id });
  try {
    return { status: "ok", dto: await buildShareDto(admin, link) };
  } catch {
    return { status: "indisponivel" };
  }
}
