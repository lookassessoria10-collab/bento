import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { portalState } from "@/lib/data/portal";
import { fmtDate } from "@/lib/format";
import { publicView, type SnapshotContent } from "@/lib/snapshot";
import { PublicShell } from "@/components/public-shell";
import { Alert, buttonClass } from "@/components/ui";
import { FeedbackForm } from "./feedback-form";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const st = await portalState();
  if (!st.active || !/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  // a RLS só devolve publicações não revogadas de portal ativo
  const { data } = await st.sb.from("public_publications").select("id, titulo, resumo, tipo, content, pdf_storage_path, versao, published_at, errata").eq("slug", slug).maybeSingle();
  return data ? { pub: data, st } : null;
}

export async function generateMetadata({ params }: PageProps<"/publicacoes/[slug]">): Promise<Metadata> {
  const r = await load((await params).slug);
  if (!r) return { title: "Publicação não encontrada", robots: { index: false } };
  return { title: r.pub.titulo, description: r.pub.resumo ?? undefined };
}

export default async function PublicationPage({ params }: PageProps<"/publicacoes/[slug]">) {
  const { slug } = await params;
  const r = await load(slug);
  if (!r) notFound();
  const { pub, st } = r;
  const v = publicView(pub.content as unknown as SnapshotContent);
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">{pub.titulo}</h1>
        <p className="mt-2 text-sm text-muted">
          Publicado em {fmtDate(pub.published_at)} · versão {pub.versao} · conteúdo validado pelo pesquisador responsável e autorizado pela coordenação
        </p>
        {pub.errata && (
          <div className="mt-4">
            <Alert tone="warning" title="Errata">
              {pub.errata}
            </Alert>
          </div>
        )}
        {pub.pdf_storage_path && (
          <a className={buttonClass("secondary", "md", "mt-4")} href={`/publicacoes/${slug}/pdf`}>
            Baixar PDF
          </a>
        )}
        {v.descricao && <p className="mt-6 text-lg">{v.descricao}</p>}
        <div className="prose mt-6 max-w-none space-y-4">
          {v.blocks.map((b, i) =>
            b.tipo === "titulo" ? (
              <h2 key={i} className="mt-6 text-xl font-semibold text-brand-900">
                {b.texto}
              </h2>
            ) : b.tipo === "citacao" ? (
              <blockquote key={i} className="border-l-4 border-accent-500 pl-4 italic">
                {b.texto}
              </blockquote>
            ) : b.tipo === "lista" ? (
              <ul key={i} className="list-disc pl-5">
                {b.texto.split("\n").filter(Boolean).map((l, j) => (
                  <li key={j}>{l}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="whitespace-pre-line">
                {b.texto}
              </p>
            ),
          )}
          {v.bulletin && (
            <>
              <p className="text-sm text-muted">
                Boletim nº {v.bulletin.numero} · período {fmtDate(v.bulletin.periodo_inicio)} a {fmtDate(v.bulletin.periodo_fim)}
              </p>
              {v.bulletin.apresentacao && <p className="whitespace-pre-line">{v.bulletin.apresentacao}</p>}
              {v.bulletin.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="mt-6 text-xl font-semibold text-brand-900">{s.titulo}</h2>
                  <p className="whitespace-pre-line">{s.corpo}</p>
                  {s.referencias && <p className="text-sm text-muted">Referências: {s.referencias}</p>}
                </section>
              ))}
            </>
          )}
        </div>
        {st.settings.feedback_publico_ativo && (
          <section className="mt-10 rounded-xl border border-border bg-surface p-5">
            <h2 className="font-semibold text-brand-900">Este conteúdo foi útil?</h2>
            <FeedbackForm publicationId={pub.id} />
          </section>
        )}
      </article>
    </PublicShell>
  );
}
