import "server-only";
import type { AppContext } from "@/lib/auth";
import { localDate } from "@/lib/format";
import { loadGestao, type GestaoLoad } from "@/lib/data/gestao";
import type { PDecision, PDoc, PEvent, PRequest, PSchedule, PTask } from "@/lib/painel";

export interface PainelLoad extends GestaoLoad {
  schedules: PSchedule[];
  events: PEvent[];
  tasksFull: PTask[];
  docs: PDoc[];
  requests: PRequest[];
  decisions: PDecision[];
  filesByAuth: { autorizacao_uso: string; tipo: string; revisao_status: string }[];
  agendaError: string | null;
}

const hourOf = (ts: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));

/** Carga única dos painéis (RLS do usuário). Agregações são feitas no servidor, nunca no navegador. */
export async function loadPainel(ctx: AppContext): Promise<PainelLoad> {
  const s = ctx.supabase;
  const org = ctx.orgId;
  const [base, sch, ev, tk, docs, reqs, decs, files] = await Promise.all([
    loadGestao(ctx),
    s.from("visit_schedules").select("id, titulo, data_hora, status, visit_schedule_experiments(experiment_id)").eq("organization_id", org).limit(5000),
    s.from("calendar_events").select("id, experiment_id, visit_id, tipo, titulo, data_prevista, status, realizado_em, responsavel_descricao, observacoes, profiles:responsavel_id(nome)").eq("organization_id", org).limit(5000),
    s.from("tasks").select("id, experiment_id, titulo, status, prioridade, prazo, created_at, concluida_em, profiles:responsavel_id(nome), descricao").eq("organization_id", org).limit(10000),
    s.from("editorial_items").select("id, titulo, status, tipo").eq("organization_id", org).is("archived_at", null).limit(2000),
    s.from("approval_requests").select("etapa, status, created_at, concluida_em").eq("organization_id", org).limit(5000),
    s.from("approval_decisions").select("etapa, decisao, created_at").eq("organization_id", org).limit(5000),
    s.from("files").select("autorizacao_uso, tipo, revisao_status").eq("organization_id", org).is("deleted_at", null).limit(10000),
  ]);
  const err = [sch, ev, tk, docs, reqs, decs, files].find((r) => r.error)?.error?.message ?? null;

  return {
    ...base,
    error: base.error ?? err,
    agendaError: sch.error?.message ?? ev.error?.message ?? null,
    schedules: (sch.data ?? []).map((v) => ({
      id: v.id,
      titulo: v.titulo,
      data: localDate(v.data_hora),
      hora: hourOf(v.data_hora),
      status: v.status,
      experiment_ids: ((v.visit_schedule_experiments ?? []) as { experiment_id: string }[]).map((x) => x.experiment_id),
    })),
    events: (ev.data ?? []).map((e) => ({
      id: e.id,
      experiment_id: e.experiment_id,
      visit_id: e.visit_id,
      tipo: e.tipo as PEvent["tipo"],
      titulo: e.titulo,
      data_prevista: e.data_prevista,
      status: e.status as PEvent["status"],
      realizado_em: e.realizado_em,
      responsavel: (e.profiles as unknown as { nome: string } | null)?.nome ?? e.responsavel_descricao,
      observacoes: e.observacoes,
    })),
    tasksFull: (tk.data ?? []).map((t) => ({
      id: t.id,
      experiment_id: t.experiment_id,
      titulo: t.titulo,
      status: t.status,
      prioridade: t.prioridade,
      prazo: t.prazo,
      created_at: t.created_at,
      concluida_em: t.concluida_em,
      // responsável fictício da demonstração fica na descrição ("Responsável (fictício): …")
      responsavel: (t.profiles as unknown as { nome: string } | null)?.nome ?? t.descricao?.match(/^Responsável \(fictício\): ([^.]+)\./)?.[1] ?? null,
    })),
    docs: docs.data ?? [],
    requests: reqs.data ?? [],
    decisions: decs.data ?? [],
    filesByAuth: files.data ?? [],
  };
}
