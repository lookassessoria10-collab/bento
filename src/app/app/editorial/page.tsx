import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has } from "@/lib/auth";
import { fmtDate, fmtMonth, localDate } from "@/lib/format";
import { CHANNEL_LABELS, EDITORIAL_KIND_LABELS } from "@/lib/labels";
import { STATUS_LABELS, type WorkflowStatus } from "@/lib/workflow";
import { listMembers, listPeople, memberOptions } from "@/lib/data/lookups";
import { ActionForm, SubmitButton } from "@/components/client";
import { Badge, Card, CardBody, CardHeader, DemoBadge, EmptyState, LinkButton, PageHeader, Select, StatusBadge, Table, Tabs, Td, Th, buttonClass, optionsFrom } from "@/components/ui";
import { EditorialItemFields } from "./item-fields";
import { createEditorialItem } from "./actions";

export const metadata: Metadata = { title: "Editorial" };

export default async function EditorialPage({ searchParams }: PageProps<"/app/editorial">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const view = ["lista", "calendario"].includes(s("vista")) ? s("vista") : "lista";
  const tipo = s("tipo");
  const status = s("status");

  let q = ctx.supabase
    .from("editorial_items")
    .select("id, titulo, tipo, status, canais, data_sugerida, prazo, labels, is_demo, updated_at, profiles:responsavel_redacao(nome)")
    .eq("organization_id", ctx.orgId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (tipo && tipo in EDITORIAL_KIND_LABELS) q = q.eq("tipo", tipo as keyof typeof EDITORIAL_KIND_LABELS);
  if (status && status in STATUS_LABELS) q = q.eq("status", status as WorkflowStatus);
  const [{ data: items }, members, people] = await Promise.all([q, listMembers(ctx), listPeople(ctx)]);

  const linkFor = (i: { id: string; tipo: string }) => `/app/editorial/${i.id}`;
  const byMonth = new Map<string, NonNullable<typeof items>>();
  for (const i of items ?? []) {
    const d = i.data_sugerida ?? i.prazo;
    const k = d ? d.slice(0, 7) : "sem-data";
    byMonth.set(k, [...(byMonth.get(k) ?? []), i]);
  }
  const months = Array.from(byMonth.keys()).sort();
  const qs = (patch: Record<string, string>) => `/app/editorial?${new URLSearchParams({ vista: view, ...(tipo && { tipo }), ...(status && { status }), ...patch })}`;

  return (
    <>
      <PageHeader
        title="Editorial"
        description="Pautas → elaboração → revisão científica (quando pertinente) → revisão final → liberado → publicado."
        actions={
          <>
            <LinkButton href="/app/editorial/boletins">Boletins</LinkButton>
            <LinkButton href="/app/editorial/dossies">Dossiês</LinkButton>
            <LinkButton href="/app/editorial/instagram">Instagram</LinkButton>
            {has(ctx, "editorial.criar") && (
              <LinkButton variant="primary" href={qs({ nova: "1" })}>
                Nova pauta
              </LinkButton>
            )}
          </>
        }
      />

      {s("nova") === "1" && has(ctx, "editorial.criar") && (
        <Card className="mb-5">
          <CardHeader title="Nova pauta ou conteúdo" description="Boletins e dossiês também podem ser criados aqui (o tipo define o editor)." />
          <CardBody>
            <ActionForm action={createEditorialItem} className="space-y-4">
              <EditorialItemFields members={memberOptions(members)} people={people.map((p) => ({ value: p.id, label: p.nome }))} />
              <SubmitButton>Criar</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}

      <Tabs
        current={view}
        tabs={[
          { key: "lista", label: "Lista", href: qs({ vista: "lista" }) },
          { key: "calendario", label: "Calendário editorial", href: qs({ vista: "calendario" }) },
        ]}
      />
      <form className="mb-4 flex flex-wrap items-end gap-2" aria-label="Filtrar conteúdos">
        <input type="hidden" name="vista" value={view} />
        <div>
          <label htmlFor="tipo" className="text-xs text-muted">
            Tipo
          </label>
          <Select name="tipo" defaultValue={tipo} options={optionsFrom(EDITORIAL_KIND_LABELS)} placeholder="Todos" />
        </div>
        <div>
          <label htmlFor="status" className="text-xs text-muted">
            Fase
          </label>
          <Select name="status" defaultValue={status} options={optionsFrom(STATUS_LABELS)} placeholder="Todas" />
        </div>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {!items?.length ? (
        <EmptyState title="Nenhum conteúdo editorial.">Crie pautas a partir das visitas, dos resultados validados ou de temas educativos de entomologia.</EmptyState>
      ) : view === "lista" ? (
        <Card>
          <Table caption="Conteúdos editoriais">
            <thead>
              <tr>
                <Th>Título</Th>
                <Th>Tipo</Th>
                <Th>Canais</Th>
                <Th>Responsável</Th>
                <Th>Data sugerida</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <Link className="font-medium hover:underline" href={linkFor(i)}>
                      {i.titulo}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {i.is_demo && <DemoBadge />}
                      {i.labels.map((l) => (
                        <Badge key={l} icon={false}>
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>{EDITORIAL_KIND_LABELS[i.tipo]}</Td>
                  <Td className="text-xs">{i.canais.map((c) => CHANNEL_LABELS[c]).join(", ") || "—"}</Td>
                  <Td>{(i.profiles as unknown as { nome: string } | null)?.nome ?? "—"}</Td>
                  <Td className="tabular">{fmtDate(i.data_sugerida)}</Td>
                  <Td>
                    <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {months.map((m) => (
            <Card key={m}>
              <CardHeader title={m === "sem-data" ? "Sem data definida" : fmtMonth(m)} description={m !== "sem-data" ? `Trimestre ${Math.ceil(Number(m.slice(5)) / 3)}/${m.slice(0, 4)}` : undefined} />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {byMonth.get(m)!.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-2">
                      <Link className="hover:underline" href={linkFor(i)}>
                        <span className="tabular text-xs text-muted">{fmtDate(i.data_sugerida ?? i.prazo).slice(0, 5)} </span>
                        {i.titulo}
                      </Link>
                      <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Hoje: {fmtDate(localDate())}</p>
    </>
  );
}
