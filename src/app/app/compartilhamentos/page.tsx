import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus, Share2 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { SHARE_PUBLICOS, shareState, type SharePublico } from "@/lib/share";
import { ActionForm, SubmitButton } from "@/components/client";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, buttonClass } from "@/components/ui";
import { DemoSeal } from "../gestao/componentes";
import { revokeShareLink } from "./actions";

export const metadata: Metadata = { title: "Compartilhamentos" };
const STATE_TONE = { ativo: "brand", expirado: "warning", revogado: "danger" } as const;
const STATE_LABEL = { ativo: "Ativo", expirado: "Expirado", revogado: "Revogado" } as const;

export default async function CompartilhamentosPage() {
  const ctx = await requirePermission("compartilhamentos.gerenciar");
  const [{ data: links, error }, { data: access }] = await Promise.all([
    ctx.supabase
      .from("dashboard_share_links")
      .select("id, nome, publico, status, expira_em, created_at, revogado_em, senha_hash, substitui_id, profiles:created_by(nome)")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(500),
    ctx.supabase.from("dashboard_share_access").select("link_id, dia, acessos").eq("organization_id", ctx.orgId).limit(20000),
  ]);
  const stats = new Map<string, { total: number; ultimo: string | null }>();
  for (const a of access ?? []) {
    const cur = stats.get(a.link_id) ?? { total: 0, ultimo: null };
    cur.total += a.acessos;
    if (!cur.ultimo || a.dia > cur.ultimo) cur.ultimo = a.dia;
    stats.set(a.link_id, cur);
  }

  return (
    <>
      <PageHeader
        title="Compartilhamentos"
        description="Links exclusivos, somente leitura, para apresentar painéis do Bento a pessoas sem conta. Cada link tem token próprio, validade e pode ser revogado a qualquer momento."
        actions={
          <Link href="/app/compartilhamentos/novo" className={buttonClass("primary")}>
            <Plus aria-hidden className="h-4 w-4" /> Criar link
          </Link>
        }
      />
      {ctx.orgIsDemo && <DemoSeal className="mb-4" />}
      <p className="mb-4 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
        Por segurança, o endereço completo só aparece no momento da criação (o banco guarda apenas um resumo criptográfico do token). Para entregar a outra pessoa, use “Link adicional”; para
        trocar um link vazado, use “Substituir”.
      </p>
      {error ? (
        <EmptyState title="Não foi possível carregar os links." />
      ) : !links?.length ? (
        <EmptyState title="Nenhum link criado ainda." action={<Link href="/app/compartilhamentos/novo" className={buttonClass("primary")}>Criar o primeiro link</Link>}>
          Escolha o público, o escopo e as seções; o destinatário verá apenas isso.
        </EmptyState>
      ) : (
        <Card>
          <Table caption="Links de compartilhamento">
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Público</Th>
                <Th>Criado</Th>
                <Th>Validade</Th>
                <Th>Situação</Th>
                <Th className="text-right">Acessos</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const st = shareState(l);
                const s = stats.get(l.id);
                return (
                  <tr key={l.id}>
                    <Td>
                      <Link href={`/app/compartilhamentos/${l.id}`} className="font-medium text-brand-700 hover:underline">
                        {l.nome}
                      </Link>
                      <span className="block text-xs text-muted">
                        por {(l.profiles as unknown as { nome: string } | null)?.nome ?? "—"}
                        {l.senha_hash ? " · com senha" : ""}
                        {l.substitui_id ? " · substitui um link anterior" : ""}
                      </span>
                    </Td>
                    <Td className="text-xs">{SHARE_PUBLICOS[l.publico as SharePublico]?.label ?? l.publico}</Td>
                    <Td className="whitespace-nowrap text-xs">{fmtDateTime(l.created_at)}</Td>
                    <Td className="whitespace-nowrap text-xs">{fmtDate(l.expira_em.slice(0, 10))}</Td>
                    <Td>
                      <Badge tone={STATE_TONE[st]}>{STATE_LABEL[st]}</Badge>
                    </Td>
                    <Td className="text-right text-xs tabular">
                      {s?.total ?? 0}
                      {s?.ultimo && <span className="block text-muted">último {fmtDate(s.ultimo)}</span>}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/app/compartilhamentos/${l.id}`} className={buttonClass("ghost", "sm")} title="Pré-visualizar o que o destinatário vê">
                          <Eye aria-hidden className="h-3.5 w-3.5" /> Pré-visualizar
                        </Link>
                        <Link href={`/app/compartilhamentos/novo?origem=${l.id}`} className={buttonClass("ghost", "sm")} title="Novo link com a mesma configuração, mantendo este">
                          <Share2 aria-hidden className="h-3.5 w-3.5" /> Link adicional
                        </Link>
                        {st === "ativo" && (
                          <>
                            <Link href={`/app/compartilhamentos/novo?origem=${l.id}&substituir=1`} className={buttonClass("ghost", "sm")} title="Cria um token novo e revoga este no mesmo instante">
                              Substituir
                            </Link>
                            <ActionForm action={revokeShareLink} confirm={`Revogar o link “${l.nome}”? O acesso para imediatamente.`}>
                              <input type="hidden" name="id" value={l.id} />
                              <SubmitButton variant="ghost" size="sm">
                                Desativar
                              </SubmitButton>
                            </ActionForm>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
