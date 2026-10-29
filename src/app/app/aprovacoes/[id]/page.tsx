import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { EDITORIAL_KIND_LABELS } from "@/lib/labels";
import { STATUS_LABELS } from "@/lib/workflow";
import { diffLines, snapshotToText } from "@/lib/diff";
import type { SnapshotContent } from "@/lib/snapshot";
import { Alert, Card, CardBody, CardHeader, DemoBadge, LinkButton, PageHeader, Select, StatusBadge, buttonClass, cx } from "@/components/ui";
import { WorkflowPanel } from "../../editorial/workflow-panel";

export const metadata: Metadata = { title: "Revisão" };

export default async function ReviewPage({ params, searchParams }: PageProps<"/app/aprovacoes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireContext();
  const { data: item } = await ctx.supabase.from("editorial_items").select("id, titulo, tipo, status, current_version_id, is_demo").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!item) notFound();
  const { data: versions } = await ctx.supabase.from("editorial_versions").select("id, numero, content, created_at").eq("item_id", id).order("numero", { ascending: false });
  const current = versions?.find((v) => v.id === item.current_version_id) ?? versions?.[0];
  const compareTo = versions?.find((v) => v.id === sp.comparar) ?? versions?.find((v) => current && v.numero === current.numero - 1);
  const content = current?.content as unknown as SnapshotContent | undefined;
  const diff = current && compareTo ? diffLines(snapshotToText(compareTo.content), snapshotToText(current.content)) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/aprovacoes", label: "Revisões e aprovações" }, { label: item.titulo }]}
        title={item.titulo}
        description={
          <span className="flex items-center gap-2">
            {EDITORIAL_KIND_LABELS[item.tipo]} · <StatusBadge status={item.status} label={STATUS_LABELS[item.status]} /> {item.is_demo && <DemoBadge />}
          </span>
        }
        actions={<LinkButton href={`/app/editorial/${id}`}>Abrir no editorial</LinkButton>}
      />
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          {!current ? (
            <Alert tone="info">Este conteúdo ainda não tem versão enviada para revisão.</Alert>
          ) : (
            <>
              <Card>
                <CardHeader title={`Conteúdo da versão v${current.numero}`} description={`Snapshot imutável de ${fmtDateTime(current.created_at)} — é exatamente isto que será publicado.`} />
                <CardBody className="space-y-3 text-sm">
                  <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-muted p-3 font-sans text-sm">{snapshotToText(current.content)}</pre>
                  <a className={buttonClass("secondary", "sm")} href={`/app/editorial/${id}/pdf`} target="_blank" rel="noopener">
                    Abrir PDF de revisão desta versão
                  </a>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Fontes e anexos da versão" />
                <CardBody>
                  {!content?.sources.length && !content?.bulletin && !content?.dossier ? (
                    <p className="text-sm text-muted">Nenhuma fonte vinculada.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {content?.sources.map((s, i) => (
                        <li key={i}>
                          {s.experiment && (
                            <Link className="hover:underline" href={`/app/experimentos/${s.experiment.id}`}>
                              Experimento {s.experiment.codigo} ({s.experiment.pesquisador ?? "responsável não informado"})
                            </Link>
                          )}
                          {s.result && <span>Resultado: {s.result.variavel} — validação: {s.result.validacao_status}, escopo: {s.result.escopo_divulgacao.join(", ")}</span>}
                          {s.file && <span>Arquivo: {s.file.nome} — {s.file.autorizacao_uso}, canais: {s.file.autorizacao_canais.join(", ") || "nenhum"}</span>}
                          {s.referencia && <span>Referência: {s.referencia}</span>}
                        </li>
                      ))}
                      {content?.bulletin?.sections.map((sec) =>
                        sec.results.map((r) => (
                          <li key={`${sec.id}-${r.id}`}>
                            Seção “{sec.titulo}”: resultado {r.variavel} — validação {r.validacao_status}, escopo {r.escopo_divulgacao.join(", ")}
                          </li>
                        )),
                      )}
                      {content?.dossier?.experiments.map((e) => (
                        <li key={e.id}>
                          Dossiê: {e.codigo} — {e.results?.length ?? 0} resultado(s), {e.files?.length ?? 0} arquivo(s)
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
              {versions && versions.length > 1 && (
                <Card>
                  <CardHeader
                    title="Comparação entre versões"
                    description={compareTo ? `v${compareTo.numero} → v${current.numero}` : undefined}
                    actions={
                      <form className="flex items-center gap-2">
                        <label htmlFor="comparar" className="text-xs text-muted">
                          Comparar com
                        </label>
                        <Select name="comparar" defaultValue={compareTo?.id} options={versions.filter((v) => v.id !== current.id).map((v) => ({ value: v.id, label: `v${v.numero}` }))} className="h-8 w-24" />
                        <button className={buttonClass("secondary", "sm")}>Ver</button>
                      </form>
                    }
                  />
                  <CardBody>
                    <pre className="max-h-[480px] overflow-auto rounded-lg border border-border font-mono text-xs">
                      {diff?.map((l, i) => (
                        <div key={i} className={cx("whitespace-pre-wrap px-2", l.kind === "add" && "bg-brand-100", l.kind === "del" && "bg-danger-100 line-through")}>
                          <span aria-hidden>{l.kind === "add" ? "+ " : l.kind === "del" ? "− " : "  "}</span>
                          <span className="sr-only">{l.kind === "add" ? "Adicionado: " : l.kind === "del" ? "Removido: " : ""}</span>
                          {l.text}
                        </div>
                      ))}
                    </pre>
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </div>
        <div className="xl:col-span-2">
          <WorkflowPanel ctx={ctx} itemId={id} />
        </div>
      </div>
    </>
  );
}
