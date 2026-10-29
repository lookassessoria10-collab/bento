import type { Metadata } from "next";
import Link from "next/link";
import { requireContext, has, hasFinalReview } from "@/lib/auth";
import { fmtDate, fmtDateTime, localDate } from "@/lib/format";
import { EDITORIAL_KIND_LABELS } from "@/lib/labels";
import { STAGE_LABELS, STATUS_LABELS, type Stage, type WorkflowStatus } from "@/lib/workflow";
import { listMembers } from "@/lib/data/lookups";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, StatusBadge, Table, Td, Th, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Revisões e aprovações" };

export default async function ApprovalsPage() {
  const ctx = await requireContext();
  const today = localDate();
  const [{ data: open }, { data: recent }, { data: visitRecs }, { data: results }, members] = await Promise.all([
    ctx.supabase
      .from("approval_requests")
      .select("id, etapa, prazo, revisor_id, created_at, editorial_items(id, titulo, tipo, status)")
      .eq("organization_id", ctx.orgId)
      .eq("status", "aberta")
      .order("prazo", { nullsFirst: false }),
    ctx.supabase
      .from("approval_decisions")
      .select("id, etapa, decisao, decidido_por, created_at, motivo, editorial_items(id, titulo)")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(20),
    ctx.supabase
      .from("visit_records")
      .select("id, visit_id, created_by, experiments(codigo), visit_schedules(titulo, data_hora)")
      .eq("organization_id", ctx.orgId)
      .eq("status", "preenchida")
      .limit(50),
    ctx.supabase
      .from("result_summaries")
      .select("id, variavel, conferencia_status, validacao_status, experiments(codigo)")
      .eq("organization_id", ctx.orgId)
      .or("conferencia_status.eq.pendente,and(conferencia_status.eq.conferido,validacao_status.eq.nao_validado)")
      .limit(50),
    listMembers(ctx),
  ]);
  const name = (id: string | null) => (id ? (members.find((m) => m.id === id)?.nome ?? "—") : "Qualquer membro habilitado");

  type Req = NonNullable<typeof open>[number];
  const mine = (open ?? []).filter((r) => {
    const etapa = r.etapa as Stage;
    if (r.revisor_id === ctx.userId) return true;
    if (etapa === "conferencia") return has(ctx, "revisao.conferencia");
    if (etapa === "revisao_final") return hasFinalReview(ctx) && !r.revisor_id;
    // validação sem revisor designado: a RLS só mostra ao responsável pelos experimentos citados
    if (etapa === "validacao_cientifica") return !r.revisor_id && ctx.roles.includes("pesquisador");
    return false;
  });
  const others = (open ?? []).filter((r) => !mine.includes(r));

  const Row = ({ r }: { r: Req }) => {
    const i = r.editorial_items as unknown as { id: string; titulo: string; tipo: keyof typeof EDITORIAL_KIND_LABELS; status: WorkflowStatus };
    const late = r.prazo && r.prazo < today;
    return (
      <tr>
        <Td>
          <Link className="font-medium hover:underline" href={`/app/aprovacoes/${i.id}`}>
            {i.titulo}
          </Link>
          <div className="text-xs text-muted">{EDITORIAL_KIND_LABELS[i.tipo]}</div>
        </Td>
        <Td>{STAGE_LABELS[r.etapa as Stage]}</Td>
        <Td>{name(r.revisor_id)}</Td>
        <Td className={cx("tabular", late && "font-semibold text-danger-600")}>
          {fmtDate(r.prazo)}
          {late && " (atrasado)"}
        </Td>
        <Td>
          <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
        </Td>
      </tr>
    );
  };

  const table = (rows: Req[]) => (
    <Table>
      <thead>
        <tr>
          <Th>Conteúdo</Th>
          <Th>Etapa</Th>
          <Th>Revisor</Th>
          <Th>Prazo</Th>
          <Th>Situação</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Row key={r.id} r={r} />
        ))}
      </tbody>
    </Table>
  );

  return (
    <>
      <PageHeader title="Revisões e aprovações" description="Filas por etapa, responsáveis, prazos e histórico. As decisões são assinadas no banco por versão." />
      <div className="space-y-5">
        <Card>
          <CardHeader title="Minha fila" description="Solicitações atribuídas a você ou à sua função." />
          {mine.length ? table(mine) : <CardBody><p className="text-sm text-muted">Nada aguardando você.</p></CardBody>}
        </Card>
        {others.length > 0 && (
          <Card>
            <CardHeader title="Outras solicitações abertas" />
            {table(others)}
          </Card>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Fichas de visita aguardando conferência" />
            <CardBody>
              {!visitRecs?.length ? (
                <p className="text-sm text-muted">Nenhuma ficha pendente.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {visitRecs.map((r) => {
                    const v = r.visit_schedules as unknown as { titulo: string; data_hora: string };
                    return (
                      <li key={r.id}>
                        <Link className="hover:underline" href={`/app/visitas/${r.visit_id}#ficha-${r.id}`}>
                          <span className="font-mono text-xs">{(r.experiments as unknown as { codigo: string }).codigo}</span> · {v.titulo} ({fmtDateTime(v.data_hora)})
                        </Link>
                        {r.created_by === ctx.userId && <span className="text-xs text-muted"> — preenchida por você (conferência por outra pessoa)</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Resultados aguardando conferência ou validação" />
            <CardBody>
              {!results?.length ? (
                <p className="text-sm text-muted">Nenhum resultado pendente.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {results.map((r) => (
                    <li key={r.id}>
                      <Link className="hover:underline" href={`/app/resultados?resultado=${r.id}`}>
                        <span className="font-mono text-xs">{(r.experiments as unknown as { codigo: string }).codigo}</span> · {r.variavel}
                      </Link>{" "}
                      <span className="text-xs text-muted">{r.conferencia_status === "pendente" ? "aguarda conferência" : "aguarda validação do responsável"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title="Decisões recentes" />
          <CardBody>
            {!recent?.length ? (
              <EmptyState title="Nenhuma decisão registrada ainda." />
            ) : (
              <ul className="space-y-1 text-sm">
                {recent.map((d) => {
                  const i = d.editorial_items as unknown as { id: string; titulo: string };
                  return (
                    <li key={d.id}>
                      {fmtDateTime(d.created_at)} · <strong>{STAGE_LABELS[d.etapa as Stage]}</strong> — {d.decisao} por {name(d.decidido_por)} ·{" "}
                      <Link className="hover:underline" href={`/app/aprovacoes/${i.id}`}>
                        {i.titulo}
                      </Link>
                      {d.motivo && <span className="text-muted"> — {d.motivo}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
