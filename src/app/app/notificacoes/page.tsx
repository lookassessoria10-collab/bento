import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { assertOk, run, type ActionResult } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, CardBody, EmptyState, PageHeader, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Notificações" };

async function markAllRead(): Promise<ActionResult> {
  "use server";
  return run(async () => {
    const ctx = await requireContext();
    assertOk(await ctx.supabase.from("notifications").update({ lida_em: new Date().toISOString() }).eq("user_id", ctx.userId).is("lida_em", null));
    revalidatePath("/app", "layout");
  }, "Notificações marcadas como lidas.");
}

export default async function NotificationsPage() {
  const ctx = await requireContext();
  const { data } = await ctx.supabase.from("notifications").select("*").eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <PageHeader
        title="Notificações"
        description="Atribuições, prazos, devoluções e solicitações de revisão. Avisos internos, sem envio de e-mail."
        actions={
          <ActionForm action={markAllRead}>
            <SubmitButton variant="secondary">Marcar todas como lidas</SubmitButton>
          </ActionForm>
        }
      />
      {!data?.length ? (
        <EmptyState title="Nenhuma notificação." />
      ) : (
        <Card>
          <CardBody>
            <ul className="divide-y divide-border">
              {data.map((n) => (
                <li key={n.id} className={cx("py-3 text-sm", !n.lida_em && "font-medium")}>
                  {!n.lida_em && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent-500" aria-label="Não lida" />}
                  {n.link ? (
                    <Link className="hover:underline" href={n.link}>
                      {n.titulo}
                    </Link>
                  ) : (
                    n.titulo
                  )}
                  {n.mensagem && <p className="font-normal text-muted">{n.mensagem}</p>}
                  <p className="text-xs font-normal text-muted">{fmtDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
