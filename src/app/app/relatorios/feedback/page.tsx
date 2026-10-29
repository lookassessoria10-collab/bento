import type { Metadata } from "next";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission, requireContext } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { assertOk, run, type ActionResult } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/client";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Moderação de feedback" };

async function moderate(fd: FormData): Promise<ActionResult> {
  "use server";
  return run(async () => {
    const ctx = await requireContext();
    const id = z.string().uuid().parse(fd.get("id"));
    const moderacao = z.enum(["aprovado", "descartado"]).parse(fd.get("moderacao"));
    assertOk(await ctx.supabase.from("audience_feedback").update({ moderacao }).eq("id", id));
    revalidatePath("/app/relatorios/feedback");
  }, "Moderação registrada.");
}

export default async function FeedbackPage() {
  const ctx = await requirePermission("feedback.moderar");
  const { data } = await ctx.supabase
    .from("audience_feedback")
    .select("id, clareza, utilidade, comentario, sugestao_pauta, perfil, moderacao, created_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader title="Feedback do público" breadcrumbs={[{ href: "/app/relatorios", label: "Relatórios" }, { label: "Feedback" }]} description="Respostas do portal com consentimento. Não coletamos nome, e-mail ou IP (apenas um hash anônimo para limitar spam)." />
      {!data?.length ? (
        <EmptyState title="Nenhuma resposta recebida." />
      ) : (
        <div className="space-y-3">
          {data.map((f) => (
            <Card key={f.id}>
              <CardBody className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p>
                    Clareza {f.clareza ?? "—"}/5 · Utilidade {f.utilidade ?? "—"}/5 · {f.perfil ?? "perfil não informado"} · {fmtDateTime(f.created_at)}
                  </p>
                  {f.comentario && <p className="mt-1">{f.comentario}</p>}
                  {f.sugestao_pauta && <p className="mt-1 text-muted">Sugestão: {f.sugestao_pauta}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={f.moderacao === "aprovado" ? "brand" : f.moderacao === "descartado" ? "danger" : "warning"}>{f.moderacao}</Badge>
                  {f.moderacao === "pendente" && (
                    <>
                      <ActionForm action={moderate}>
                        <input type="hidden" name="id" value={f.id} />
                        <SubmitButton size="sm" variant="secondary" name="moderacao" value="aprovado">
                          Aprovar
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm action={moderate}>
                        <input type="hidden" name="id" value={f.id} />
                        <SubmitButton size="sm" variant="ghost" name="moderacao" value="descartado">
                          Descartar
                        </SubmitButton>
                      </ActionForm>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
