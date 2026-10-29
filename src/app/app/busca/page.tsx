import type { Metadata } from "next";
import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { EDITORIAL_KIND_LABELS, PHASE_LABELS } from "@/lib/labels";
import { STATUS_LABELS } from "@/lib/workflow";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Busca" };

// Busca global sob RLS: cada consulta só devolve o que o usuário já pode ver.
export default async function SearchPage({ searchParams }: PageProps<"/app/busca">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const term = q.replace(/[%,()*\\]/g, " ").trim();
  if (!term) {
    return (
      <>
        <PageHeader title="Busca" />
        <EmptyState title="Digite um termo na barra de busca.">Pesquise por título, código, tema ou pessoa.</EmptyState>
      </>
    );
  }
  const like = `%${term}%`;
  const [exps, people, items, visits, files, results] = await Promise.all([
    ctx.supabase
      .from("experiments")
      .select("id, codigo, titulo, fase")
      .eq("organization_id", ctx.orgId)
      .or(`titulo.ilike.${like},codigo.ilike.${like},codigo_institucional.ilike.${like},area_tematica.ilike.${like}`)
      .limit(20),
    ctx.supabase.from("people").select("id, nome, tipo").eq("organization_id", ctx.orgId).ilike("nome", like).limit(10),
    ctx.supabase.from("editorial_items").select("id, titulo, tipo, status").eq("organization_id", ctx.orgId).or(`titulo.ilike.${like},area_tematica.ilike.${like}`).limit(20),
    ctx.supabase.from("visit_schedules").select("id, titulo, data_hora").eq("organization_id", ctx.orgId).ilike("titulo", like).limit(10),
    ctx.supabase.from("files").select("id, nome_amigavel").eq("organization_id", ctx.orgId).is("deleted_at", null).or(`nome_amigavel.ilike.${like},legenda.ilike.${like}`).limit(10),
    ctx.supabase.from("result_summaries").select("id, variavel").eq("organization_id", ctx.orgId).ilike("variavel", like).limit(10),
  ]);
  // pessoas: também experimentos em que a pessoa é responsável
  const personIds = (people.data ?? []).map((p) => p.id);
  const { data: byPerson } = personIds.length
    ? await ctx.supabase.from("experiments").select("id, codigo, titulo, fase").in("pesquisador_principal_id", personIds).limit(20)
    : { data: [] };
  const allExps = [...(exps.data ?? []), ...(byPerson ?? []).filter((e) => !(exps.data ?? []).some((x) => x.id === e.id))];
  const total = allExps.length + (items.data?.length ?? 0) + (visits.data?.length ?? 0) + (files.data?.length ?? 0) + (results.data?.length ?? 0) + (people.data?.length ?? 0);

  return (
    <>
      <PageHeader title={`Resultados para “${q}”`} description={`${total} resultado(s) visíveis para o seu perfil.`} />
      {total === 0 ? (
        <EmptyState title="Nada encontrado." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {allExps.length > 0 && (
            <Card>
              <CardHeader title="Experimentos" />
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {allExps.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <Link className="hover:underline" href={`/app/experimentos/${e.id}`}>
                        <span className="font-mono text-xs">{e.codigo}</span> {e.titulo}
                      </Link>
                      <StatusBadge status={e.fase} label={PHASE_LABELS[e.fase]} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          {!!items.data?.length && (
            <Card>
              <CardHeader title="Conteúdos editoriais" />
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {items.data.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <Link className="hover:underline" href={`/app/editorial/${i.id}`}>
                        {i.titulo} <span className="text-xs text-muted">({EDITORIAL_KIND_LABELS[i.tipo]})</span>
                      </Link>
                      <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          {!!people.data?.length && (
            <Card>
              <CardHeader title="Pessoas" />
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {people.data.map((p) => (
                    <li key={p.id}>
                      <Link className="hover:underline" href="/app/equipe?aba=pessoas">
                        {p.nome}
                      </Link>{" "}
                      <span className="text-xs text-muted">({p.tipo})</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          {!!visits.data?.length && (
            <Card>
              <CardHeader title="Visitas" />
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {visits.data.map((v) => (
                    <li key={v.id}>
                      <Link className="hover:underline" href={`/app/visitas/${v.id}`}>
                        {v.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          {!!results.data?.length && (
            <Card>
              <CardHeader title="Resultados" />
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {results.data.map((r) => (
                    <li key={r.id}>
                      <Link className="hover:underline" href={`/app/resultados?resultado=${r.id}`}>
                        {r.variavel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          {!!files.data?.length && (
            <Card>
              <CardHeader title="Arquivos" />
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {files.data.map((f) => (
                    <li key={f.id}>
                      <Link className="hover:underline" href={`/app/biblioteca/${f.id}`}>
                        {f.nome_amigavel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
