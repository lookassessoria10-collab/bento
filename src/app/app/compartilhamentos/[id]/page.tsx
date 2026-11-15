import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildShareDto } from "@/lib/data/share";
import { SHARE_PUBLICOS, SHARE_SECOES, shareConfigSchema, shareState, type SharePublico, type ShareSecao } from "@/lib/share";
import { SharePanel } from "@/components/share-panel";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Badge, Card, CardBody, CardHeader, KeyValue, PageHeader, buttonClass } from "@/components/ui";
import { revokeShareLink } from "../actions";

export const metadata: Metadata = { title: "Link de compartilhamento" };
const ACAO = { criado: "Criado", revogado: "Revogado", substituido: "Criado em substituição", duplicado: "Criado a partir de outro link" } as const;

export default async function CompartilhamentoDetalhe({ params }: PageProps<"/app/compartilhamentos/[id]">) {
  const ctx = await requirePermission("compartilhamentos.gerenciar");
  const { id } = await params;
  // leitura com o cliente do usuário (RLS de gestão): só links da própria organização
  const { data: link } = await ctx.supabase.from("dashboard_share_links").select("*, profiles:created_by(nome)").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!link) notFound();
  const [{ data: audit }, { data: access }] = await Promise.all([
    ctx.supabase.from("dashboard_share_audit").select("acao, em, detalhes, profiles:por(nome)").eq("link_id", id).order("em", { ascending: false }),
    ctx.supabase.from("dashboard_share_access").select("dia, acessos").eq("link_id", id).order("dia", { ascending: false }).limit(60),
  ]);
  const st = shareState(link);
  const cfg = shareConfigSchema.safeParse(link.config);
  // pré-visualização: o MESMO montador usado pelo link público, com a organização do próprio link
  const admin = createAdminClient();
  const dto = admin && cfg.success ? await buildShareDto(admin, link) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/compartilhamentos", label: "Compartilhamentos" }, { label: link.nome }]}
        title={link.nome}
        description={<Badge tone={st === "ativo" ? "brand" : st === "expirado" ? "warning" : "danger"}>{st === "ativo" ? "Ativo" : st === "expirado" ? "Expirado" : "Revogado"}</Badge>}
        actions={
          <>
            <Link href={`/app/compartilhamentos/novo?origem=${link.id}`} className={buttonClass("secondary")}>
              Link adicional
            </Link>
            {st === "ativo" && (
              <>
                <Link href={`/app/compartilhamentos/novo?origem=${link.id}&substituir=1`} className={buttonClass("secondary")}>
                  Substituir este link
                </Link>
                <ActionForm action={revokeShareLink} confirm="Revogar este link? O acesso para imediatamente.">
                  <input type="hidden" name="id" value={link.id} />
                  <SubmitButton variant="ghost">Desativar</SubmitButton>
                </ActionForm>
              </>
            )}
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Configuração" />
          <CardBody>
            <KeyValue
              items={[
                { label: "Público", value: SHARE_PUBLICOS[link.publico as SharePublico]?.label },
                { label: "Validade", value: fmtDateTime(link.expira_em) },
                { label: "Senha", value: link.senha_hash ? "Exigida" : "Não exigida" },
                { label: "Criado por", value: `${(link.profiles as unknown as { nome: string } | null)?.nome ?? "—"} em ${fmtDateTime(link.created_at)}` },
                { label: "Seções", value: cfg.success ? cfg.data.secoes.map((s) => SHARE_SECOES[s as ShareSecao]).join("; ") : "Configuração inválida" },
                { label: "Ensaios", value: cfg.success ? (cfg.data.experimentos.length ? `${cfg.data.experimentos.length} selecionado(s)` : "todos os compartilháveis") : null },
                { label: "Período", value: cfg.success && (cfg.data.de || cfg.data.ate) ? `${fmtDate(cfg.data.de)} a ${fmtDate(cfg.data.ate)}` : "todo o histórico" },
                { label: "Revogação", value: link.revogado_em ? `${fmtDateTime(link.revogado_em)} · ${link.motivo_revogacao ?? ""}` : null },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Histórico e acessos" description="Acessos contados por dia, sem IP nem identificação." />
          <CardBody className="space-y-3 text-sm">
            <ul className="space-y-1">
              {(audit ?? []).map((a, i) => (
                <li key={i} className="text-xs">
                  <strong>{ACAO[a.acao as keyof typeof ACAO] ?? a.acao}</strong> · {fmtDateTime(a.em)} · {(a.profiles as unknown as { nome: string } | null)?.nome ?? "—"}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              {(access ?? []).length ? (access ?? []).map((a) => `${fmtDate(a.dia)}: ${a.acessos}`).join(" · ") : "Nenhum acesso registrado."}
            </p>
          </CardBody>
        </Card>
      </div>

      <h2 className="mb-2 mt-8 font-display text-lg font-semibold text-brand-950">Pré-visualização do que o destinatário vê</h2>
      {st !== "ativo" && (
        <Alert tone="warning" title="Este link não está ativo">
          O destinatário vê apenas “Este link está indisponível”. A pré-visualização abaixo mostra a configuração para conferência.
        </Alert>
      )}
      {dto ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
          <SharePanel dto={dto} preview />
        </div>
      ) : (
        <p className="text-sm text-muted">Pré-visualização indisponível neste ambiente.</p>
      )}
    </>
  );
}
