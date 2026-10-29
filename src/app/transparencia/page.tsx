import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Transparência editorial" };

export default function TransparencyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold text-brand-900">Transparência editorial</h1>
        <p>Cada conteúdo publicado passa por:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Conferência interna por pessoa diferente de quem redigiu.</li>
          <li>Validação científica pelo pesquisador responsável (quando há informação científica específica).</li>
          <li>Revisão final e autorização para o canal, por versão.</li>
        </ol>
        <p>
          O que é publicado é um retrato imutável da versão aprovada. Correções geram nova versão; publicações revogadas deixam de ser exibidas e
          podem ter errata.
        </p>
        <p>
          Os conteúdos não substituem relatórios técnicos, cadernos de campo ou análises originais dos pesquisadores, e não constituem
          recomendação de manejo.
        </p>
      </article>
    </PublicShell>
  );
}
