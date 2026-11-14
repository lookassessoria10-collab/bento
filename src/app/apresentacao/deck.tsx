"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, Printer } from "lucide-react";
import { Logo } from "@/components/logo";
import { cx } from "@/components/ui";
import { DURATION, SLIDES } from "./slides";

// ---------------------------------------------------------------------------
// Lâmina atual no hash (#1 … #10). Links antigos (#s/3) continuam funcionando.
// ---------------------------------------------------------------------------
const TOTAL = SLIDES.length;

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => window.location.hash;

function toIndex(hash: string): number {
  const m = hash.match(/(\d+)\s*$/);
  const n = m ? parseInt(m[1], 10) : 1;
  return Math.min(TOTAL, Math.max(1, n)) - 1;
}

const noopSubscribe = () => () => {};
const subscribeFs = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

export function Deck() {
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const pos = toIndex(hash);
  const ref = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const slide = SLIDES[pos];
  const next = pos < TOTAL - 1 ? SLIDES[pos + 1] : null;
  const isFs = useSyncExternalStore(subscribeFs, () => document.fullscreenElement != null, () => false);
  const canFs = useSyncExternalStore(noopSubscribe, () => document.fullscreenEnabled === true, () => false);

  const goto = useCallback((p: number) => {
    const n = Math.min(TOTAL, Math.max(1, p + 1));
    history.replaceState(null, "", `#${n}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (e.altKey || e.ctrlKey || e.metaKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      // espaço/Enter em botões e links mantém o comportamento nativo (não pula duas lâminas)
      const onControl = !!t?.closest("button, a");
      if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !onControl)) goto(pos + 1);
      else if (["ArrowLeft", "PageUp"].includes(e.key)) goto(pos - 1);
      else if (e.key === "Home") goto(0);
      else if (e.key === "End") goto(TOTAL - 1);
      else if (e.key === "f" || e.key === "F") toggleFs();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goto, pos, toggleFs]);

  return (
    <div className="deck-root">
      <div ref={ref} className="deck-viewer flex min-h-dvh flex-col">
        <header className="deck-chrome flex items-center gap-3 px-4 pb-2 pt-3 sm:px-6">
          <Link href="/" aria-label="Bento — página inicial" className="shrink-0">
            <Logo tone="light" size="sm" assinatura="Apresentação" />
          </Link>
          <p className="ml-2 hidden min-w-0 flex-1 truncate text-sm text-white/65 md:block">{slide.title}</p>
          <span className="ml-auto hidden text-xs text-white/45 lg:inline">{DURATION}</span>
          <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 font-mono text-sm tabular-nums text-white/85 ring-1 ring-white/10 md:ml-0" aria-hidden>
            {String(pos + 1).padStart(2, "0")}
            <span className="text-white/40"> / {TOTAL}</span>
          </span>
        </header>

        <main
          className="flex flex-1 items-center px-3 py-2 sm:px-6"
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!s) return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = e.changedTouches[0].clientY - s.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goto(dx < 0 ? pos + 1 : pos - 1);
          }}
        >
          <div className="deck-frame deck-fit">
            <section key={slide.id} className={cx("slide slide-enter", `slide-${slide.tone}`)} aria-roledescription="lâmina" aria-label={`${pos + 1} de ${TOTAL}: ${slide.title}`}>
              {slide.render()}
            </section>
          </div>
          <p className="sr-only" aria-live="polite">
            Lâmina {pos + 1} de {TOTAL}: {slide.title}
          </p>
        </main>

        <footer className="deck-chrome px-4 pb-4 pt-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => goto(pos - 1)} disabled={pos === 0} className="deck-btn flex" aria-label="Lâmina anterior">
              <ArrowLeft aria-hidden className="h-5 w-5" />
            </button>
            <nav className="flex min-w-0 flex-1 gap-1" aria-label="Lâminas">
              {SLIDES.map((s, k) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goto(k)}
                  title={`${k + 1}. ${s.title}`}
                  aria-label={`Ir para a lâmina ${k + 1}: ${s.title}`}
                  aria-current={k === pos ? "step" : undefined}
                  className="group relative h-6 min-w-0 flex-1 rounded-full"
                >
                  <span className={cx("deck-seg", k < pos && "done", k === pos && "on")} />
                </button>
              ))}
            </nav>
            <button type="button" onClick={() => goto(pos + 1)} disabled={pos === TOTAL - 1} className="deck-btn deck-btn-primary flex" aria-label="Próxima lâmina">
              <ArrowRight aria-hidden className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => window.print()} className="deck-btn hidden sm:flex" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">
              <Printer aria-hidden className="h-5 w-5" />
            </button>
            {canFs && (
              <button type="button" onClick={toggleFs} className="deck-btn hidden sm:flex" aria-label={isFs ? "Sair da tela cheia" : "Tela cheia"} title="Tela cheia (F)">
                {isFs ? <Minimize2 aria-hidden className="h-5 w-5" /> : <Maximize2 aria-hidden className="h-5 w-5" />}
              </button>
            )}
          </div>
          <p className="mx-auto mt-2 hidden max-w-6xl justify-between text-xs text-white/45 sm:flex">
            <span>{next ? <>A seguir: {next.title}</> : "Fim da apresentação"}</span>
            <span>← → navegar · F tela cheia</span>
          </p>
        </footer>
      </div>

      {/* versão para impressão / PDF: todas as lâminas em sequência */}
      <div className="deck-print deck-frame">
        {SLIDES.map((s) => (
          <section key={s.id} className={cx("slide", `slide-${s.tone}`)} aria-label={s.title}>
            {s.render()}
          </section>
        ))}
      </div>
    </div>
  );
}
