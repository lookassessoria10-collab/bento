import type { Metadata } from "next";
import Link from "next/link";
import { portalState } from "@/lib/data/portal";
import { fmtDate } from "@/lib/format";
import { EDITORIAL_KIND_LABELS } from "@/lib/labels";
import { PublicShell } from "@/components/public-shell";
import { BentoMark } from "@/components/logo";
import { Card, CardBody, EmptyState, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const st = await portalState();
  // sem indexação enquanto o portal não estiver ativado institucionalmente
  return { title: "Entomo Agro 360", robots: st.active ? { index: true, follow: true } : { index: false, follow: false } };
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const st = await portalState();
  const sp = await searchParams;
  if (!st.active) {
    return (
      <PublicShell>
        <section className="relative mx-auto max-w-2xl py-10 text-center animate-bento-pop">
          <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-accent-500/25 blur-3xl" />
          <span className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] bg-surface shadow-float ring-1 ring-border/70">
            <BentoMark className="h-14 w-14" />
          </span>
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-brand-600">Em desenvolvimento</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-brand-950 sm:text-5xl">Entomo Agro 360</h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            Projeto acadêmico de acompanhamento de pesquisas agrícolas e divulgação científica, em desenvolvimento. O portal público será
            disponibilizado após o alinhamento e as autorizações institucionais.
          </p>
          <LinkButton variant="primary" size="lg" className="mt-8" href="/login">
            Acesso da equipe
          </LinkButton>
        </section>
      </PublicShell>
    );
  }
  const tipo = typeof sp.tipo === "string" ? sp.tipo : "";
  let q = st.sb.from("public_publications").select("id, slug, tipo, titulo, resumo, published_at, versao, errata").eq("organization_id", st.org.id).order("published_at", { ascending: false }).limit(100);
  if (tipo && tipo in EDITORIAL_KIND_LABELS) q = q.eq("tipo", tipo as keyof typeof EDITORIAL_KIND_LABELS);
  const { data: pubs } = await q;
  return (
    <PublicShell>
      <section className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">{st.settings.nome_projeto}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Acompanhamento de pesquisas e divulgação científica. Todo conteúdo publicado aqui passou por validação do pesquisador responsável e
          autorização final, e indica versão e data de revisão.
        </p>
        {st.settings.contato_institucional && <p className="mt-2 text-sm">Contato: {st.settings.contato_institucional}</p>}
      </section>
      <nav aria-label="Filtrar publicações" className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Todas"], ["boletim", "Boletins"], ["dossie", "Dossiês"], ["pauta", "Conteúdos"]].map(([k, l]) => (
          <Link key={k} href={k ? `/?tipo=${k}` : "/"} className={`rounded-full border px-3 py-1 ${tipo === k ? "border-brand-700 bg-brand-700 text-white" : "border-border"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {!pubs?.length ? (
        <EmptyState title="Ainda não há publicações liberadas." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pubs.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-accent-600">{EDITORIAL_KIND_LABELS[p.tipo]}</p>
                <Link href={`/publicacoes/${p.slug}`} className="mt-1 block text-lg font-semibold text-brand-900 hover:underline">
                  {p.titulo}
                </Link>
                {p.resumo && <p className="mt-1 text-sm text-muted">{p.resumo}</p>}
                <p className="mt-2 text-xs text-muted">
                  Publicado em {fmtDate(p.published_at)} · versão {p.versao}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
