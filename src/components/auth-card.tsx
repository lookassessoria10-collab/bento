import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarCheck, ClipboardCheck, FlaskConical } from "lucide-react";
import { BentoMark, Logo } from "@/components/logo";

// Tela de acesso em duas colunas: painel da marca (desktop) + formulário.
export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main id="conteudo" className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* faixas de cultivo decorativas, derivadas da marca */}
        <svg aria-hidden viewBox="0 0 600 600" className="pointer-events-none absolute -bottom-40 -right-40 h-[680px] w-[680px] opacity-[0.16]">
          {[300, 255, 210, 165, 120].map((r, i) => (
            <circle key={r} cx="600" cy="600" r={r} fill="none" stroke={i % 2 ? "#A7D572" : "#3E9B5F"} strokeWidth="34" />
          ))}
        </svg>
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <Link href="/" aria-label="Página inicial" className="relative">
          <Logo tone="light" size="md" />
        </Link>
        <div className="relative max-w-md">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-accent-500">Entomo Agro 360</p>
          <h2 className="font-display text-[40px] font-semibold leading-[1.08] tracking-tight">Pesquisa agrícola organizada, do campo à publicação.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Experimentos, visitas, resultados e revisão científica em um só lugar — com rastreabilidade e autorização em cada etapa.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              [FlaskConical, "Cadastro de experimentos com fonte e data"],
              [CalendarCheck, "Visitas mensais e fichas conferidas"],
              [ClipboardCheck, "Validação do pesquisador antes de publicar"],
            ].map(([I, t]) => {
              const Icon = I as typeof FlaskConical;
              return (
                <li key={t as string} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon aria-hidden className="h-4 w-4 text-accent-500" />
                  </span>
                  {t as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Bento · Gestão científica | Entomo Agro 360</p>
      </aside>

      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px] animate-bento-pop">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" aria-label="Página inicial">
              <Logo />
            </Link>
          </div>
          <div className="rounded-3xl border border-border/80 bg-surface p-7 shadow-float sm:p-9">
            <BentoMark className="mb-5 hidden h-11 w-11 lg:block" />
            <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-950">{title}</h1>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
