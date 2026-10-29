import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Início">
            <Logo assinatura={false} />
          </Link>
          <nav aria-label="Portal" className="flex items-center gap-1 text-sm font-medium">
            <Link className="hidden rounded-lg px-3 py-2 text-muted hover:bg-brand-50 hover:text-brand-900 sm:inline-block" href="/transparencia">
              Transparência
            </Link>
            <Link className="hidden rounded-lg px-3 py-2 text-muted hover:bg-brand-50 hover:text-brand-900 sm:inline-block" href="/privacidade">
              Privacidade
            </Link>
            <Link
              className="ml-1 rounded-xl bg-gradient-to-b from-brand-700 to-brand-800 px-4 py-2 font-semibold text-white shadow-[0_6px_16px_-6px_rgb(15_74_46/0.55)] hover:to-brand-900"
              href="/login"
            >
              Área da equipe
            </Link>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {children}
      </main>
      <footer className="border-t border-border/60 bg-surface/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted sm:flex-row">
          <Logo size="sm" />
          <p>Projeto acadêmico de acompanhamento e divulgação científica.</p>
          <div className="flex gap-4 sm:hidden">
            <Link href="/transparencia">Transparência</Link>
            <Link href="/privacidade">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
