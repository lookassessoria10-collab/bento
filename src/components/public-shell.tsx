import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="Início">
            <Logo />
          </Link>
          <nav aria-label="Portal" className="flex gap-4 text-sm">
            <Link className="hover:text-brand-700" href="/transparencia">
              Transparência
            </Link>
            <Link className="hover:text-brand-700" href="/privacidade">
              Privacidade
            </Link>
            <Link className="font-medium text-brand-700" href="/login">
              Área da equipe
            </Link>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {children}
      </main>
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted">
        Bento · Gestão científica | Entomo Agro 360 — projeto acadêmico de acompanhamento e divulgação científica.
      </footer>
    </div>
  );
}
