"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { anonClient, PORTAL_ORG_SLUG } from "@/lib/data/portal";
import { sha256 } from "@/lib/tokens";
import { run, UserError, type ActionResult } from "@/lib/actions";

const schema = z.object({
  publication_id: z.string().uuid(),
  clareza: z.coerce.number().int().min(1).max(5),
  utilidade: z.coerce.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
  sugestao: z.string().max(1000).optional(),
  perfil: z.enum(["produtor", "estudante", "pesquisador", "tecnico", "outro"]).optional(),
  consentimento: z.literal("on", { error: "É necessário consentir." }),
  website: z.string().max(0, "Envio inválido.").optional(), // armadilha anti-spam
});

export async function submitFeedback(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const input = schema.parse(Object.fromEntries(fd.entries()));
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido";
    // hash diário e com sal: limita spam sem armazenar IP
    const origem = sha256(`${ip}|${process.env.FEEDBACK_HASH_SALT ?? "bento"}|${new Date().toISOString().slice(0, 10)}`);
    const { error } = await anonClient().rpc("submit_feedback", {
      p_org_slug: PORTAL_ORG_SLUG,
      p_publication: input.publication_id,
      p_clareza: input.clareza,
      p_utilidade: input.utilidade,
      p_comentario: input.comentario ?? "",
      p_sugestao: input.sugestao ?? "",
      p_perfil: input.perfil ?? "outro",
      p_consentimento: true,
      p_origem_hash: origem,
    });
    if (error) throw new UserError(error.code === "54000" ? error.message : "Não foi possível enviar agora.");
  }, "Obrigado! Sua resposta foi registrada para moderação.");
}
