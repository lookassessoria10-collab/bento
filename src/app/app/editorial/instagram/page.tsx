import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtNumber } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/workflow";
import type { InstagramDraft } from "@/lib/snapshot";
import { ActionForm, SubmitButton } from "@/components/client";
import { Alert, Card, CardBody, CardHeader, EmptyState, Field, LinkButton, PageHeader, Select, StatusBadge, Table, Td, Textarea, Th, optionsFrom } from "@/components/ui";
import { addAudienceQuestion, updateAudienceQuestion } from "../actions";

export const metadata: Metadata = { title: "Instagram" };

export default async function InstagramPage() {
  const ctx = await requireContext();
  const [{ data: items }, { data: questions }] = await Promise.all([
    ctx.supabase
      .from("editorial_items")
      .select(
        "id, titulo, formato, status, data_sugerida, requer_validacao_cientifica, draft, editorial_sources(id, file_id, files(autorizacao_uso, autorizacao_canais)), approval_decisions(etapa, decisao), publication_records(id, data_publicacao, url, status, instagram_metrics(data_referencia, alcance, impressoes, curtidas, comentarios, salvamentos, compartilhamentos))",
      )
      .eq("organization_id", ctx.orgId)
      .eq("tipo", "instagram")
      .is("archived_at", null)
      .order("data_sugerida", { nullsFirst: false }),
    ctx.supabase.from("audience_questions").select("id, pergunta, origem, status, created_at").eq("organization_id", ctx.orgId).order("created_at", { ascending: false }).limit(100),
  ]);

  // painel de desempenho: somente números registrados (último registro por publicação)
  type M = { data_referencia: string; alcance: number | null; impressoes: number | null; curtidas: number | null; comentarios: number | null; salvamentos: number | null; compartilhamentos: number | null };
  const perf = (items ?? []).flatMap((i) =>
    (i.publication_records as unknown as { id: string; data_publicacao: string; url: string | null; status: string; instagram_metrics: M[] }[]).map((p) => {
      const last = [...p.instagram_metrics].sort((a, b) => b.data_referencia.localeCompare(a.data_referencia))[0];
      return { item: i, p, last };
    }),
  );

  return (
    <>
      <PageHeader
        title="Instagram — gestão editorial"
        breadcrumbs={[{ href: "/app/editorial", label: "Editorial" }, { label: "Instagram" }]}
        description="Planejamento, aprovação por versão e registro de publicação manual. Sem automação de postagem."
        actions={has(ctx, "editorial.criar") && <LinkButton variant="primary" href="/app/editorial?nova=1">Nova pauta</LinkButton>}
      />
      <Alert tone="info">
        Não há integração com a Instagram Graph API. A publicação é manual e registrada aqui com data real, link e responsável; métricas são inseridas manualmente com data de referência.
      </Alert>

      <h2 className="mb-3 mt-6 text-lg font-semibold text-brand-900">Calendário e checklist</h2>
      {!items?.length ? (
        <EmptyState title="Nenhuma pauta de Instagram.">Crie uma pauta do tipo “Instagram” no módulo editorial.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((i) => {
            const draft = (i.draft ?? {}) as { instagram?: InstagramDraft };
            const decisions = i.approval_decisions as unknown as { etapa: string; decisao: string }[];
            const srcs = i.editorial_sources as unknown as { file_id: string | null; files: { autorizacao_uso: string; autorizacao_canais: string[] } | null }[];
            const imgs = srcs.filter((s) => s.file_id);
            const checks: [string, boolean][] = [
              ["Autorização de imagem", imgs.length > 0 && imgs.every((s) => s.files?.autorizacao_uso === "divulgacao_autorizada" && s.files.autorizacao_canais.includes("instagram"))],
              ["Fonte / referências", srcs.length > 0 || !!draft.instagram?.referencias],
              ["Revisão científica", !i.requer_validacao_cientifica || decisions.some((d) => d.etapa === "validacao_cientifica" && d.decisao === "aprovado")],
              ["Revisão institucional", decisions.some((d) => d.etapa === "revisao_final" && d.decisao === "aprovado")],
              ["Créditos", !!draft.instagram?.creditos],
              ["Publicação registrada", (i.publication_records as unknown as unknown[]).length > 0],
            ];
            return (
              <Card key={i.id}>
                <CardHeader
                  title={
                    <Link className="hover:underline" href={`/app/editorial/${i.id}`}>
                      {i.titulo}
                    </Link>
                  }
                  description={`${i.formato ?? "Formato não definido"} · ${fmtDate(i.data_sugerida)}`}
                  actions={<StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />}
                />
                <CardBody>
                  <ul className="space-y-1 text-sm">
                    {checks.map(([l, ok]) => (
                      <li key={l} className="flex items-center gap-2">
                        {ok ? <CheckCircle2 aria-hidden className="h-4 w-4 text-brand-600" /> : <Circle aria-hidden className="h-4 w-4 text-muted" />}
                        <span className={ok ? "" : "text-muted"}>{l}</span>
                        <span className="sr-only">{ok ? "concluído" : "pendente"}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-brand-900">Desempenho registrado</h2>
      {!perf.length ? (
        <p className="text-sm text-muted">Nenhuma publicação registrada ainda.</p>
      ) : (
        <Card>
          <Table caption="Desempenho das publicações (dados inseridos manualmente)">
            <thead>
              <tr>
                <Th>Publicação</Th>
                <Th>Data</Th>
                <Th>Referência</Th>
                <Th>Alcance</Th>
                <Th>Impressões</Th>
                <Th>Curtidas</Th>
                <Th>Comentários</Th>
                <Th>Salvamentos</Th>
              </tr>
            </thead>
            <tbody>
              {perf.map(({ item, p, last }) => (
                <tr key={p.id}>
                  <Td>
                    <Link className="hover:underline" href={`/app/editorial/${item.id}`}>
                      {item.titulo}
                    </Link>
                  </Td>
                  <Td className="tabular">{fmtDate(p.data_publicacao)}</Td>
                  <Td className="tabular">{last ? fmtDate(last.data_referencia) : "sem registro"}</Td>
                  <Td className="tabular">{fmtNumber(last?.alcance)}</Td>
                  <Td className="tabular">{fmtNumber(last?.impressoes)}</Td>
                  <Td className="tabular">{fmtNumber(last?.curtidas)}</Td>
                  <Td className="tabular">{fmtNumber(last?.comentarios)}</Td>
                  <Td className="tabular">{fmtNumber(last?.salvamentos)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-brand-900">Dúvidas e sugestões do público</h2>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            {!questions?.length ? (
              <p className="text-sm text-muted">Nenhuma dúvida registrada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {questions.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {q.pergunta} <span className="text-xs text-muted">({q.origem}, {fmtDate(q.created_at)})</span>
                    </span>
                    <ActionForm action={updateAudienceQuestion} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={q.id} />
                      <Select name="status" id={`q-${q.id}`} aria-label="Situação" defaultValue={q.status} options={optionsFrom({ nova: "Nova", em_pauta: "Em pauta", respondida: "Respondida", descartada: "Descartada" })} className="h-8 text-xs" />
                      <SubmitButton size="sm" variant="ghost">
                        Salvar
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Registrar dúvida" description="Não registre nomes, perfis ou contatos." />
          <CardBody>
            <ActionForm action={addAudienceQuestion} resetOnSuccess className="space-y-3">
              <Field label="Dúvida ou sugestão" name="pergunta" required>
                <Textarea name="pergunta" rows={3} required />
              </Field>
              <Field label="Origem" name="origem">
                <Select name="origem" options={optionsFrom({ instagram: "Instagram", portal: "Portal", evento: "Evento", outro: "Outro" })} />
              </Field>
              <SubmitButton size="sm">Registrar</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
