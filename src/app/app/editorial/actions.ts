"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertOk, formToObject, run, UserError, type ActionResult } from "@/lib/actions";
import { slugify } from "@/lib/text";
import { CHANNELS, editorialSchema, multi, optDate, optInt, optText, optUrl, optUuid, reqText, uuid } from "@/lib/validation";
import type { Json } from "@/lib/supabase/database.types";

const BULLETIN_DEFAULT_SECTIONS: [string, string][] = [
  ["apresentacao", "Apresentação da edição"],
  ["panorama", "Panorama dos experimentos participantes"],
  ["destaque", "Pesquisa em destaque"],
  ["resultados", "Resultados disponíveis"],
  ["entomologia", "Entomologia em foco"],
  ["agenda", "Agenda e interação"],
  ["creditos", "Créditos, fontes, legendas e referências"],
];

export async function createEditorialItem(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = editorialSchema.parse(formToObject(fd));
    const item = assertOk(
      await ctx.supabase
        .from("editorial_items")
        .insert({ ...input, organization_id: ctx.orgId, draft: { blocks: [] } })
        .select("id")
        .single(),
    );
    if (input.tipo === "boletim") {
      const { data: last } = await ctx.supabase
        .from("bulletin_editions")
        .select("numero")
        .eq("organization_id", ctx.orgId)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      const b = assertOk(
        await ctx.supabase
          .from("bulletin_editions")
          .insert({ organization_id: ctx.orgId, editorial_item_id: item.id, numero: (last?.numero ?? 0) + 1 })
          .select("id")
          .single(),
      );
      assertOk(
        await ctx.supabase.from("bulletin_sections").insert(
          BULLETIN_DEFAULT_SECTIONS.map(([tipo, titulo], ordem) => ({ organization_id: ctx.orgId, bulletin_id: b.id, tipo, titulo, ordem })),
        ),
      );
      return { ok: true, message: "Edição criada.", redirectTo: `/app/editorial/boletins/${b.id}` };
    }
    if (input.tipo === "dossie") {
      const d = assertOk(
        await ctx.supabase.from("dossiers").insert({ organization_id: ctx.orgId, editorial_item_id: item.id }).select("id").single(),
      );
      return { ok: true, message: "Dossiê criado.", redirectTo: `/app/editorial/dossies/${d.id}` };
    }
    revalidatePath("/app/editorial");
    return { ok: true, message: "Conteúdo criado.", redirectTo: `/app/editorial/${item.id}` };
  });
}

export async function updateEditorialItem(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const { tipo: _t, ...input } = editorialSchema.parse(formToObject(fd));
    void _t;
    const res = await ctx.supabase.from("editorial_items").update(input).eq("id", id).select("status");
    const rows = assertOk(res);
    if (!rows.length) throw new UserError("Você não tem permissão para editar este conteúdo.");
    revalidatePath(`/app/editorial/${id}`);
    return {
      ok: true,
      message: rows[0].status === "rascunho" ? "Conteúdo salvo." : "Conteúdo salvo.",
    };
  });
}

const blockSchema = z.object({ tipo: z.enum(["paragrafo", "titulo", "citacao", "lista"]), texto: z.string().max(8000) });
const instagramSchema = z
  .object({
    texto_card: z.string().max(2000).optional(),
    legenda: z.string().max(2200).optional(),
    cta: z.string().max(300).optional(),
    hashtags: z.string().max(600).optional(),
    referencias: z.string().max(3000).optional(),
    creditos: z.string().max(1000).optional(),
  })
  .optional();
const reportSchema = z.record(z.string(), z.string().max(12000)).optional();

/** Salva o rascunho estruturado (blocos de texto puro, sem HTML). Alterar após envio invalida o ciclo. */
export async function saveDraft(id: string, draft: unknown): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const parsed = z
      .object({ blocks: z.array(blockSchema).max(200), instagram: instagramSchema, relatorio: reportSchema })
      .parse(draft);
    const res = await ctx.supabase.from("editorial_items").update({ draft: parsed as unknown as NonNullable<Json> }).eq("id", uuid.parse(id)).select("status");
    const rows = assertOk(res);
    if (!rows.length) throw new UserError("Você não tem permissão para editar este conteúdo.");
    revalidatePath(`/app/editorial/${id}`);
  }, "Rascunho salvo no servidor.");
}

export async function addSource(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ item_id: uuid, experiment_id: optUuid, result_id: optUuid, file_id: optUuid, referencia: optText(2000) })
      .refine((d) => d.experiment_id || d.result_id || d.file_id || d.referencia, { message: "Informe ao menos uma fonte.", path: ["referencia"] })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("editorial_sources").insert({ ...input, organization_id: ctx.orgId }));
    revalidatePath(`/app/editorial/${input.item_id}`);
  }, "Fonte vinculada.");
}

export async function removeSource(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    assertOk(await ctx.supabase.from("editorial_sources").delete().eq("id", uuid.parse(fd.get("id"))));
  }, "Fonte removida.");
}

// ---------------------------------------------------------------------------
// Fluxo de revisão (todas as transições pela RPC no banco)
// ---------------------------------------------------------------------------
export async function submitForReview(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const prazo = optDate.parse(fd.get("prazo"));
    assertOk(await ctx.supabase.rpc("submit_for_review", { p_item: id, p_prazo: prazo ?? undefined }));
    revalidatePath(`/app/editorial/${id}`);
  }, "Versão fixada e enviada para conferência interna.");
}

export async function decide(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        decisao: z.enum(["aprovado", "ajustes", "rejeitado"]),
        motivo: optText(4000),
        canais: multi(CHANNELS),
        prazo: optDate,
      })
      .parse(formToObject(fd));
    const next = assertOk(
      await ctx.supabase.rpc("workflow_decide", {
        p_item: input.id,
        p_decisao: input.decisao,
        p_motivo: input.motivo ?? undefined,
        p_canais: input.canais,
        p_prazo: input.prazo ?? undefined,
      }),
    );
    revalidatePath("/app/aprovacoes");
    return { ok: true, message: `Decisão registrada. Nova situação: ${String(next).replaceAll("_", " ")}.` };
  });
}

export async function externalValidation(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        person_id: uuid,
        comprovante_id: uuid,
        metodo: reqText(3, 300, "Informe o método de confirmação."),
        data: optDate.refine((v) => !!v, "Informe a data."),
        observacao: optText(2000),
      })
      .parse(formToObject(fd));
    assertOk(
      await ctx.supabase.rpc("register_external_validation", {
        p_item: input.id,
        p_person: input.person_id,
        p_comprovante: input.comprovante_id,
        p_metodo: input.metodo,
        p_data: input.data!,
        p_obs: input.observacao ?? undefined,
      }),
    );
  }, "Validação externa documentada registrada.");
}

export async function registerPublication(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        canal: z.enum(CHANNELS),
        data: optDate.refine((v) => !!v, "Informe a data real da publicação."),
        url: optUrl,
        document_id: optUuid,
        slug: optText(120),
        resumo: optText(600),
      })
      .parse(formToObject(fd));
    const slug = input.canal === "portal" ? slugify(input.slug || "", 120) : null;
    assertOk(
      await ctx.supabase.rpc("register_publication", {
        p_item: input.id,
        p_canal: input.canal,
        p_data: input.data!,
        p_url: input.url ?? undefined,
        p_document: input.document_id ?? undefined,
        p_slug: slug ?? undefined,
        p_resumo: input.resumo ?? undefined,
      }),
    );
    revalidatePath("/");
  }, "Publicação registrada com data, canal e responsável.");
}

export async function revokePublication(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z.object({ publication_id: uuid, motivo: reqText(3, 2000, "Informe o motivo."), errata: optText(2000) }).parse(formToObject(fd));
    assertOk(await ctx.supabase.rpc("revoke_publication", { p_publication: input.publication_id, p_motivo: input.motivo, p_errata: input.errata ?? undefined }));
    revalidatePath("/");
  }, "Publicação revogada; o portal deixa de exibi-la imediatamente.");
}

// ---------------------------------------------------------------------------
// Boletins
// ---------------------------------------------------------------------------
export async function updateBulletin(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        volume: optText(40),
        periodo_inicio: optDate,
        periodo_fim: optDate,
        data_prevista: optDate,
        data_fechamento: optDate,
        equipe_editorial: optText(2000),
        apresentacao: optText(8000),
        capa_file_id: optUuid,
      })
      .parse(formToObject(fd));
    const { id, ...patch } = input;
    const res = await ctx.supabase.from("bulletin_editions").update(patch).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Sem permissão para editar a edição.");
  }, "Dados da edição salvos.");
}

export async function saveSection(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: optUuid,
        bulletin_id: uuid,
        tipo: z.enum(["apresentacao", "panorama", "destaque", "resultados", "entomologia", "agenda", "creditos", "livre"]),
        titulo: reqText(1, 200, "Informe o título da seção."),
        corpo: z.string().max(20000).default(""),
        experiment_id: optUuid,
        result_ids: z.preprocess((v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(uuid).max(20)),
        file_ids: z.preprocess((v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(uuid).max(20)),
        referencias: optText(4000),
        ordem: optInt(0, 1000),
      })
      .parse(formToObject(fd));
    const { id, ...row } = input;
    if (["destaque", "resultados"].includes(row.tipo) && row.result_ids.length === 0 && !row.experiment_id && row.corpo.trim()) {
      throw new UserError("Seções científicas precisam citar o experimento ou os resultados de origem.");
    }
    if (id) {
      const res = await ctx.supabase.from("bulletin_sections").update({ ...row, ordem: row.ordem ?? 0 }).eq("id", id).select("id");
      if (!assertOk(res).length) throw new UserError("Sem permissão para editar a seção.");
    } else {
      assertOk(await ctx.supabase.from("bulletin_sections").insert({ ...row, ordem: row.ordem ?? 99, organization_id: ctx.orgId }));
    }
  }, "Seção salva.");
}

export async function moveSection(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const bulletin = uuid.parse(fd.get("bulletin_id"));
    const id = uuid.parse(fd.get("id"));
    const dir = fd.get("dir") === "up" ? -1 : 1;
    const { data } = await ctx.supabase.from("bulletin_sections").select("id, ordem").eq("bulletin_id", bulletin).order("ordem");
    const list = data ?? [];
    const i = list.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (const [ordem, s] of list.entries()) {
      await ctx.supabase.from("bulletin_sections").update({ ordem }).eq("id", s.id);
    }
  }, "Ordem atualizada.");
}

export async function deleteSection(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    assertOk(await ctx.supabase.from("bulletin_sections").delete().eq("id", uuid.parse(fd.get("id"))));
  }, "Seção removida.");
}

// ---------------------------------------------------------------------------
// Dossiês
// ---------------------------------------------------------------------------
export async function updateDossier(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        id: uuid,
        periodo_inicio: optDate,
        periodo_fim: optDate,
        finalidade: z.enum(["interno", "divulgacao"]),
        apresentacao: optText(8000),
        escopo: optText(4000),
        criterios_inclusao: optText(4000),
        metodo_coleta: optText(4000),
        sintese: optText(8000),
        referencias: optText(8000),
      })
      .parse(formToObject(fd));
    const { id, ...patch } = input;
    const res = await ctx.supabase.from("dossiers").update(patch).eq("id", id).select("id");
    if (!assertOk(res).length) throw new UserError("Sem permissão.");
  }, "Dossiê salvo.");
}

export async function setDossierExperiments(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("dossier_id"));
    const ids = z.array(uuid).max(200).parse(fd.getAll("experiment_ids"));
    const withResults = new Set(fd.getAll("incluir_resultados").map(String));
    assertOk(await ctx.supabase.from("dossier_experiments").delete().eq("dossier_id", id));
    if (ids.length) {
      assertOk(
        await ctx.supabase.from("dossier_experiments").insert(
          ids.map((experiment_id, ordem) => ({ dossier_id: id, experiment_id, organization_id: ctx.orgId, ordem, incluir_resultados: withResults.has(experiment_id) })),
        ),
      );
    }
  }, "Seleção de experimentos salva.");
}

// ---------------------------------------------------------------------------
// Instagram: métricas manuais e dúvidas do público
// ---------------------------------------------------------------------------
export async function addInstagramMetrics(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({
        publication_id: uuid,
        data_referencia: optDate.refine((v) => !!v, "Informe a data de referência."),
        alcance: optInt(0, 1e9),
        impressoes: optInt(0, 1e9),
        curtidas: optInt(0, 1e9),
        comentarios: optInt(0, 1e9),
        salvamentos: optInt(0, 1e9),
        compartilhamentos: optInt(0, 1e9),
        observacoes: optText(2000),
      })
      .parse(formToObject(fd));
    assertOk(
      await ctx.supabase
        .from("instagram_metrics")
        .insert({ ...input, data_referencia: input.data_referencia!, organization_id: ctx.orgId, registrado_por: ctx.userId }),
    );
  }, "Métricas registradas manualmente.");
}

export async function addAudienceQuestion(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const input = z
      .object({ pergunta: reqText(3, 2000, "Descreva a dúvida ou sugestão."), origem: z.enum(["instagram", "portal", "evento", "outro"]) })
      .parse(formToObject(fd));
    assertOk(await ctx.supabase.from("audience_questions").insert({ ...input, organization_id: ctx.orgId }));
  }, "Dúvida registrada (sem dados pessoais).");
}

export async function updateAudienceQuestion(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireContext();
    const id = uuid.parse(fd.get("id"));
    const status = z.enum(["nova", "em_pauta", "respondida", "descartada"]).parse(fd.get("status"));
    assertOk(await ctx.supabase.from("audience_questions").update({ status }).eq("id", id));
  }, "Situação atualizada.");
}
