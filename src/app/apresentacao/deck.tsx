"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  House,
  Layers,
  LayoutGrid,
  LogIn,
  Maximize2,
  Minimize2,
  Play,
  Printer,
  RotateCcw,
  Route,
  Search,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { BentoMark, Logo } from "@/components/logo";
import { cx } from "@/components/ui";
import { CHAPTERS, MINUTES_PER_SLIDE, MURAL, QUIZ, ROLES, SLIDES, buildTrail, type RoleId } from "./slides";

// ---------------------------------------------------------------------------
// Roteamento por hash (#inicio, #s/3, #t/estudante/rapida/2, #sumario…)
// ---------------------------------------------------------------------------
type Mode = "rapida" | "detalhada";
const MODE_LABEL: Record<Mode, string> = { rapida: "Essencial", detalhada: "Completa" };
const ALL = SLIDES.map((_, i) => i);

type View =
  | { v: "hub" | "sumario" | "trilha" | "mural" | "quiz" | "todas" }
  | { v: "deck"; seq: number[]; pos: number; base: string; trail?: { role: RoleId; mode: Mode } };

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => window.location.hash.replace(/^#\/?/, "");

function go(h: string, replace = false) {
  if (replace) {
    history.replaceState(null, "", `#${h}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = h;
  }
}

const isRole = (r: string): r is RoleId => ROLES.some((x) => x.id === r);
const toPos = (v: string | undefined, len: number) => Math.min(len, Math.max(1, parseInt(v ?? "1", 10) || 1)) - 1;

function parse(h: string): View {
  const p = h.split("/");
  if (p[0] === "s") return { v: "deck", seq: ALL, pos: toPos(p[1], ALL.length), base: "s" };
  if (p[0] === "t" && isRole(p[1]) && (p[2] === "rapida" || p[2] === "detalhada")) {
    const seq = buildTrail(p[1], p[2]);
    return { v: "deck", seq, pos: toPos(p[3], seq.length), base: `t/${p[1]}/${p[2]}`, trail: { role: p[1], mode: p[2] } };
  }
  if (p[0] === "sumario" || p[0] === "trilha" || p[0] === "mural" || p[0] === "quiz" || p[0] === "todas") return { v: p[0] };
  return { v: "hub" };
}

const minutes = (n: number) => Math.max(1, Math.round(n * MINUTES_PER_SLIDE));
const chapterStart = (n: number) => SLIDES.findIndex((s) => s.ch === n);
const chapterLabel = (n: number) => (n === 0 ? "Abertura" : `${String(n).padStart(2, "0")} · ${CHAPTERS[n - 1].title}`);

export function Deck() {
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const view = useMemo(() => parse(hash), [hash]);

  useEffect(() => {
    if (view.v !== "deck") window.scrollTo({ top: 0 });
  }, [view.v]);

  if (view.v === "deck") return <Viewer key={view.base} seq={view.seq} pos={view.pos} base={view.base} trail={view.trail} />;
  return (
    <div className="deck-root">
      <TopBar current={view.v} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {view.v === "hub" && <Hub />}
        {view.v === "sumario" && <Summary />}
        {view.v === "trilha" && <Trail />}
        {view.v === "mural" && <Mural />}
        {view.v === "quiz" && <Quiz />}
        {view.v === "todas" && <AllSlides />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra superior
// ---------------------------------------------------------------------------
const NAV = [
  { h: "inicio", v: "hub", label: "Início" },
  { h: "s/1", v: "deck", label: "Apresentação" },
  { h: "sumario", v: "sumario", label: "Sumário" },
  { h: "trilha", v: "trilha", label: "Trilhas" },
  { h: "mural", v: "mural", label: "Sem × Com" },
  { h: "quiz", v: "quiz", label: "Teste rápido" },
];

function TopBar({ current }: { current: string }) {
  return (
    <header className="deck-chrome sticky top-0 z-30 border-b border-white/10 bg-[#082619]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <a href="#inicio" aria-label="Início da apresentação" className="shrink-0">
          <Logo tone="light" size="sm" assinatura="Apresentação da plataforma" />
        </a>
        <nav aria-label="Seções da apresentação" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.h}
              href={`#${n.h}`}
              aria-current={current === n.v ? "page" : undefined}
              className={cx("rounded-full px-3 py-1.5 text-sm font-medium transition", current === n.v ? "bg-white/12 text-white" : "text-white/70 hover:text-white")}
            >
              {n.label}
            </a>
          ))}
        </nav>
        {/* <a> comum (recarrega a página): a apresentação comercial carrega o próprio CSS */}
        <a
          href={COMERCIAL}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-[#a7d572]/60 transition hover:bg-white/15 lg:ml-2"
        >
          <Sparkles aria-hidden className="h-4 w-4 text-[#a7d572]" />
          <span className="sm:hidden">Comercial</span>
          <span className="hidden sm:inline">Apresentação comercial</span>
        </a>
        <Link href="/login" aria-label="Acessar" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#a7d572] px-2.5 py-1.5 text-sm font-semibold text-[#0a2e1d] transition hover:bg-[#bfe293] sm:px-3.5">
          <LogIn aria-hidden className="h-4 w-4" /> <span className="hidden sm:inline">Acessar</span>
        </Link>
      </div>
      <nav aria-label="Seções da apresentação" className="flex gap-1 overflow-x-auto px-4 pb-2.5 lg:hidden">
        {NAV.map((n) => (
          <a
            key={n.h}
            href={`#${n.h}`}
            aria-current={current === n.v ? "page" : undefined}
            className={cx("shrink-0 rounded-full px-3 py-1 text-[13px] font-medium", current === n.v ? "bg-white/15 text-white" : "text-white/70")}
          >
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.2em] text-[#a7d572] before:h-[2px] before:w-8 before:rounded before:bg-current">{children}</p>;
}

function PageTitle({ k, t, d }: { k: string; t: ReactNode; d?: ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl">
      <Kicker>{k}</Kicker>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">{t}</h1>
      {d && <p className="mt-4 text-[15px] leading-relaxed text-white/75 sm:text-base">{d}</p>}
    </div>
  );
}

const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-full bg-[#a7d572] px-5 py-2.5 text-[15px] font-semibold text-[#0a2e1d] shadow-lg shadow-black/20 transition hover:bg-[#bfe293]",
  ghost: "inline-flex items-center justify-center gap-2 rounded-full bg-white/8 px-5 py-2.5 text-[15px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/14",
  accent: "inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-[#0a2e1d] shadow-lg shadow-black/20 transition hover:bg-[#eef7df]",
};

// Versão comercial curta (10 lâminas), em rota própria.
const COMERCIAL = "/apresentacao/comercial";
const glass = "rounded-3xl bg-white/[0.06] ring-1 ring-white/10";

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------
function Hub() {
  return (
    <>
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <Kicker>Apresentação interativa · Entomo Agro 360</Kicker>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl">
            Conheça o <span className="text-[#a7d572]">Bento</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            A plataforma de gestão científica do projeto: como funciona, quem faz o quê e como a pesquisa vai do campo à publicação — com fonte, autoria e
            aprovação registradas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#s/1" className={btn.primary}>
              <Play aria-hidden className="h-4 w-4" /> Assistir apresentação
            </a>
            <a href={COMERCIAL} className={btn.accent}>
              <Sparkles aria-hidden className="h-4 w-4 text-[#2a8150]" /> Apresentação comercial
            </a>
            <a href="#trilha" className={btn.ghost}>
              <Route aria-hidden className="h-4 w-4" /> Montar minha trilha
            </a>
          </div>
          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            {[
              [String(CHAPTERS.length), "capítulos"],
              [String(SLIDES.length), "lâminas"],
              [`~${minutes(SLIDES.length)}`, "minutos"],
            ].map(([n, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <dt className="font-display text-3xl font-semibold text-white">{n}</dt>
                <dd>{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroArt />
      </section>

      <section className="mt-16" aria-labelledby="modos">
        <h2 id="modos" className="font-display text-2xl font-semibold">
          Escolha como explorar
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { h: "s/1", i: Play, t: "Apresentação completa", d: `${SLIDES.length} lâminas em ${CHAPTERS.length} capítulos, com setas, deslize e tela cheia.` },
            { h: "trilha", i: Route, t: "Trilha por perfil", d: "Estudante, pesquisador, coordenação ou administração: só o que importa para você." },
            { h: "mural", i: Layers, t: "Sem × Com o Bento", d: "Cartões que viram: como era antes e como fica com a plataforma." },
            { h: "quiz", i: CircleHelp, t: "Teste rápido", d: `${QUIZ.length} perguntas para fixar as regras de revisão e publicação.` },
          ].map((c) => (
            <a key={c.h} href={`#${c.h}`} className={cx(glass, "group flex flex-col p-5 transition hover:bg-white/[0.1]")}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#a7d572]/15 text-[#a7d572]">
                <c.i aria-hidden className="h-5 w-5" />
              </span>
              <span className="mt-4 font-display text-lg font-semibold">{c.t}</span>
              <span className="mt-1 text-sm leading-relaxed text-white/65">{c.d}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-[#a7d572]">
                Abrir <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="indice">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="indice" className="font-display text-2xl font-semibold">
            Índice
          </h2>
          <a href="#sumario" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a7d572] hover:underline">
            <LayoutGrid aria-hidden className="h-4 w-4" /> Ver todas as lâminas
          </a>
        </div>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHAPTERS.map((c) => {
            const n = SLIDES.filter((s) => s.ch === c.n).length;
            return (
              <li key={c.n}>
                <a href={`#s/${chapterStart(c.n) + 1}`} className={cx(glass, "flex h-full items-start gap-4 p-5 transition hover:bg-white/[0.1]")}>
                  <span className="font-display text-3xl font-bold leading-none text-[#a7d572]">{String(c.n).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-semibold">{c.title}</span>
                    <span className="mt-0.5 block text-sm text-white/60">{c.subtitle}</span>
                    <span className="mt-2 block text-xs text-white/45">{n} lâminas</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={cx(glass, "mt-16 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8")}>
        <BentoMark className="h-14 w-14 shrink-0" gap="#0a2e1d" />
        <div className="flex-1">
          <p className="font-display text-xl font-semibold">Já recebeu seu convite?</p>
          <p className="mt-1 text-sm text-white/65">
            Esta página é pública e usa apenas exemplos ilustrativos — nenhum dado real do projeto aparece aqui. O acesso à plataforma é feito pelo link do convite.
          </p>
        </div>
        <Link href="/login" className={btn.primary}>
          Acessar o Bento <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}

function HeroArt() {
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[440px]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        {[190, 160, 130, 100].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={i % 2 ? "#a7d572" : "#3e9b5f"} strokeOpacity={0.22 + i * 0.08} strokeWidth="14" strokeDasharray={i % 2 ? "4 18" : undefined} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-36 w-36 items-center justify-center rounded-[40px] bg-[#f6f7f2] shadow-2xl shadow-black/40">
          <BentoMark className="h-24 w-24" />
        </span>
      </div>
      {[
        { c: "left-0 top-[14%]", t: "EA360-014", d: "Em andamento" },
        { c: "right-0 top-[30%]", t: "Validação científica", d: "aprovada · v3" },
        { c: "bottom-[12%] left-[6%]", t: "Boletim nº 1", d: "liberado para o portal" },
      ].map((x) => (
        <span key={x.t} className={cx("absolute flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#14211a] shadow-xl shadow-black/30", x.c)}>
          <CircleCheck className="h-4 w-4 text-[#2a8150]" />
          <span className="leading-tight">
            <span className="block text-[13px] font-bold">{x.t}</span>
            <span className="block text-[11px] text-[#5b6760]">{x.d}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visualizador de lâminas
// ---------------------------------------------------------------------------
const noopSubscribe = () => () => {};
const subscribeFs = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

function Viewer({ seq, pos, base, trail }: { seq: number[]; pos: number; base: string; trail?: { role: RoleId; mode: Mode } }) {
  const ref = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const total = seq.length;
  const slide = SLIDES[seq[pos]];
  const next = pos < total - 1 ? SLIDES[seq[pos + 1]] : null;
  const isFs = useSyncExternalStore(subscribeFs, () => document.fullscreenElement != null, () => false);
  const canFs = useSyncExternalStore(noopSubscribe, () => document.fullscreenEnabled, () => false);
  const exitHref = trail ? "#trilha" : "#inicio";

  const goto = useCallback((p: number) => go(`${base}/${Math.min(total, Math.max(1, p + 1))}`, true), [base, total]);
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (e.altKey || e.ctrlKey || e.metaKey || t?.closest("input, textarea, select")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) goto(pos + 1);
      else if (["ArrowLeft", "PageUp"].includes(e.key)) goto(pos - 1);
      else if (e.key === "Home") goto(0);
      else if (e.key === "End") goto(total - 1);
      else if (e.key === "f" || e.key === "F") toggleFs();
      else if (e.key === "Escape" && !document.fullscreenElement) go(exitHref.slice(1));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goto, pos, total, toggleFs, exitHref]);

  const groups = useMemo(() => {
    const g: { ch: number; start: number; len: number }[] = [];
    seq.forEach((si, p) => {
      const last = g[g.length - 1];
      if (last && last.ch === SLIDES[si].ch) last.len++;
      else g.push({ ch: SLIDES[si].ch, start: p, len: 1 });
    });
    return g;
  }, [seq]);

  const role = trail && ROLES.find((r) => r.id === trail.role);

  return (
    <div ref={ref} className="deck-root deck-viewer flex min-h-dvh flex-col">
      <header className="deck-chrome flex items-center gap-3 px-4 pb-2 pt-3 sm:px-6">
        <a href={exitHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 hover:bg-white/15" aria-label="Fechar apresentação">
          <X aria-hidden className="h-4 w-4" />
        </a>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[#a7d572]">{chapterLabel(slide.ch)}</p>
          <p className="truncate text-sm text-white/70">
            {role ? (
              <>
                Trilha · {role.label} · {MODE_LABEL[trail.mode]}
              </>
            ) : (
              slide.title
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 font-mono text-sm tabular-nums text-white/85 ring-1 ring-white/10">
          {pos + 1}
          <span className="text-white/40"> / {total}</span>
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
          <section key={seq[pos]} className={cx("slide slide-enter", `slide-${slide.tone}`)} aria-roledescription="lâmina" aria-label={`${pos + 1} de ${total}: ${slide.title}`}>
            {slide.render()}
          </section>
        </div>
        <p className="sr-only" aria-live="polite">
          Lâmina {pos + 1} de {total}: {slide.title}
        </p>
      </main>

      <footer className="deck-chrome px-4 pb-4 pt-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => goto(pos - 1)} disabled={pos === 0} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/10 transition hover:bg-white/15 disabled:opacity-30" aria-label="Lâmina anterior">
            <ArrowLeft aria-hidden className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 gap-1" role="group" aria-label="Progresso por capítulo">
            {groups.map((g) => {
              const fill = Math.min(1, Math.max(0, (pos - g.start + 1) / g.len));
              return (
                <button
                  key={`${g.ch}-${g.start}`}
                  type="button"
                  onClick={() => goto(g.start)}
                  title={chapterLabel(g.ch)}
                  aria-label={`Ir para ${chapterLabel(g.ch)}`}
                  className="group relative h-5 min-w-0 rounded-full"
                  style={{ flexGrow: g.len, flexBasis: 0 }}
                >
                  <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/12 transition group-hover:h-2">
                    <span className="block h-full rounded-full bg-[#a7d572] transition-[width] duration-300" style={{ width: `${fill * 100}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => goto(pos + 1)} disabled={pos === total - 1} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a7d572] text-[#0a2e1d] transition hover:bg-[#bfe293] disabled:opacity-30" aria-label="Próxima lâmina">
            <ArrowRight aria-hidden className="h-5 w-5" />
          </button>
          <a href="#sumario" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/10 hover:bg-white/15 sm:flex" aria-label="Sumário" title="Sumário">
            <LayoutGrid aria-hidden className="h-5 w-5" />
          </a>
          {canFs && (
            <button type="button" onClick={toggleFs} className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/10 hover:bg-white/15 sm:flex" aria-label={isFs ? "Sair da tela cheia" : "Tela cheia"} title="Tela cheia (F)">
              {isFs ? <Minimize2 aria-hidden className="h-5 w-5" /> : <Maximize2 aria-hidden className="h-5 w-5" />}
            </button>
          )}
        </div>
        <p className="mx-auto mt-2 hidden max-w-6xl justify-between text-xs text-white/45 sm:flex">
          <span>{next ? <>A seguir: {next.title}</> : trail ? "Fim da trilha" : "Fim da apresentação"}</span>
          <span>← → navegar · F tela cheia · Esc sair</span>
        </p>
        {!next && (
          <div className="mx-auto mt-3 flex max-w-6xl flex-wrap justify-center gap-2">
            <a href="#quiz" className={btn.ghost}>
              <CircleHelp aria-hidden className="h-4 w-4" /> Fazer o teste rápido
            </a>
            <a href="#mural" className={btn.ghost}>
              <Layers aria-hidden className="h-4 w-4" /> Ver Sem × Com
            </a>
          </div>
        )}
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sumário com busca
// ---------------------------------------------------------------------------
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function Summary() {
  const [q, setQ] = useState("");
  const nq = norm(q.trim());
  const groups = [0, ...CHAPTERS.map((c) => c.n)].map((ch) => ({
    ch,
    items: SLIDES.map((s, i) => ({ s, i })).filter(({ s }) => s.ch === ch && (!nq || norm(`${s.title} ${s.keywords}`).includes(nq))),
  }));
  const found = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <>
      <PageTitle k="Sumário" t="Todas as lâminas" d={`${SLIDES.length} lâminas em ${CHAPTERS.length} capítulos · cerca de ${minutes(SLIDES.length)} minutos. Busque um tema ou pule direto para uma lâmina.`} />
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar na apresentação</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar: coordenadas, boletim, revisão, celular…"
            className="w-full rounded-full bg-white/8 py-3 pl-11 pr-4 text-[15px] text-white ring-1 ring-white/15 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#a7d572]"
          />
        </label>
        <a href="#todas" className={btn.ghost}>
          <Printer aria-hidden className="h-4 w-4" /> Rolar tudo / imprimir
        </a>
      </div>
      {nq && (
        <p className="mb-6 text-sm text-white/60" role="status">
          {found ? `${found} lâmina(s) encontrada(s).` : "Nada encontrado. Tente outra palavra."}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.ch} className={cx(glass, "p-5")}>
              <h2 className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-[#a7d572]">{g.ch ? String(g.ch).padStart(2, "0") : "00"}</span>
                <span className="font-display text-lg font-semibold">{g.ch ? CHAPTERS[g.ch - 1].title : "Abertura"}</span>
              </h2>
              <ol className="mt-3 divide-y divide-white/8">
                {g.items.map(({ s, i }) => (
                  <li key={s.id}>
                    <a href={`#s/${i + 1}`} className="flex items-center gap-3 py-2.5 text-[15px] text-white/85 hover:text-white">
                      <span className="w-7 shrink-0 font-mono text-xs text-white/40">{i + 1}</span>
                      <span className="flex-1">{s.title}</span>
                      <ArrowRight aria-hidden className="h-4 w-4 text-white/30" />
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Trilha por perfil
// ---------------------------------------------------------------------------
function Trail() {
  const [role, setRole] = useState<RoleId | null>(null);
  return (
    <>
      <PageTitle k="Trilha personalizada" t="Monte a apresentação para o seu papel" d="Escolha quem você é e quanto tempo tem. O Bento monta a sequência de lâminas mais útil para você." />
      <ol className="mb-6 flex items-center gap-3 text-sm text-white/60" aria-label="Etapas">
        <li className={cx("rounded-full px-3 py-1", role ? "bg-white/8" : "bg-[#a7d572] font-semibold text-[#0a2e1d]")}>1 · Perfil</li>
        <li aria-hidden>→</li>
        <li className={cx("rounded-full px-3 py-1", role ? "bg-[#a7d572] font-semibold text-[#0a2e1d]" : "bg-white/8")}>2 · Formato</li>
      </ol>
      {!role ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <button key={r.id} type="button" onClick={() => setRole(r.id)} className={cx(glass, "flex items-start gap-4 p-5 text-left transition hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-[#a7d572]")}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#a7d572]/15 text-[#a7d572]">
                <r.icon aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold">{r.label}</span>
                <span className="mt-0.5 block text-sm text-white/65">{r.d}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(["rapida", "detalhada"] as const).map((m) => {
              const n = buildTrail(role, m).length;
              return (
                <a key={m} href={`#t/${role}/${m}/1`} className={cx(glass, "group flex flex-col p-6 transition hover:bg-white/[0.1]")}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#a7d572]">
                    {m === "rapida" ? <Sparkles aria-hidden className="h-4 w-4" /> : <Layers aria-hidden className="h-4 w-4" />}
                    {MODE_LABEL[m]}
                  </span>
                  <span className="mt-3 font-display text-2xl font-semibold">{m === "rapida" ? "Só o essencial" : "Capítulos completos"}</span>
                  <span className="mt-1 text-sm text-white/65">
                    {m === "rapida" ? "As lâminas-chave para o seu papel, sem desvios." : "Os capítulos inteiros que mais dizem respeito ao seu papel."}
                  </span>
                  <span className="mt-5 flex items-center gap-4 text-sm text-white/75">
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutGrid aria-hidden className="h-4 w-4" /> {n} lâminas
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock aria-hidden className="h-4 w-4" /> ~{minutes(n)} min
                    </span>
                  </span>
                  <span className="mt-6 inline-flex items-center gap-1 font-semibold text-[#a7d572]">
                    Começar <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </a>
              );
            })}
          </div>
          <button type="button" onClick={() => setRole(null)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft aria-hidden className="h-4 w-4" /> Trocar perfil ({ROLES.find((r) => r.id === role)?.label})
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mural Sem × Com
// ---------------------------------------------------------------------------
function Mural() {
  const [on, setOn] = useState<Set<number>>(() => new Set());
  const all = on.size === MURAL.length;
  const toggle = (i: number) =>
    setOn((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <>
      <PageTitle k="Mural" t={<>Sem o Bento × <span className="text-[#a7d572]">com o Bento</span></>} d="Toque em cada cartão para ver como a rotina do projeto muda com a plataforma." />
      <button type="button" onClick={() => setOn(all ? new Set() : new Set(MURAL.map((_, i) => i)))} className={cx(btn.ghost, "mb-6")}>
        <RotateCcw aria-hidden className="h-4 w-4" /> {all ? "Desvirar todos" : "Virar todos"}
      </button>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MURAL.map((m, i) => (
          <button key={m.tema} type="button" onClick={() => toggle(i)} aria-pressed={on.has(i)} className={cx("flip text-left", on.has(i) && "on")}>
            <span className="flip-inner min-h-[220px]">
              <span className="flip-face flex flex-col rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <span className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Sem o Bento</span>
                  <CircleX aria-hidden className="h-5 w-5 text-[#f0a69f]" />
                </span>
                <span className="mt-4 font-display text-xl font-semibold">{m.tema}</span>
                <span className="mt-2 text-[15px] leading-relaxed text-white/75">{m.sem}</span>
                <span className="mt-auto pt-4 text-xs font-semibold text-white/45">Toque para virar</span>
              </span>
              <span className="flip-face flip-back flex flex-col rounded-3xl bg-[#a7d572] p-5 text-[#0a2e1d]">
                <span className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f4a2e]">Com o Bento</span>
                  <m.i aria-hidden className="h-5 w-5" />
                </span>
                <span className="mt-4 font-display text-xl font-semibold">{m.tema}</span>
                <span className="mt-2 text-[15px] leading-relaxed">{m.com}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-bold">
                  <CircleCheck aria-hidden className="h-4 w-4" /> Registrado e rastreável
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Teste rápido
// ---------------------------------------------------------------------------
function Quiz() {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= QUIZ.length;
  const q = QUIZ[i];

  const pick = (o: number) => {
    if (chosen !== null) return;
    setChosen(o);
    if (o === q.a) setScore((s) => s + 1);
  };
  const advance = () => {
    setChosen(null);
    setI((n) => n + 1);
  };
  const restart = () => {
    setI(0);
    setChosen(null);
    setScore(0);
  };

  return (
    <>
      <PageTitle k="Teste rápido" t="Você já pensa como o Bento?" d="Perguntas sobre revisão, registro e publicação. Sem cadastro, sem nota guardada." />
      <div className={cx(glass, "mx-auto max-w-3xl p-6 sm:p-8")}>
        {done ? (
          <div className="text-center">
            <Trophy aria-hidden className="mx-auto h-12 w-12 text-[#a7d572]" />
            <p className="mt-4 font-display text-4xl font-semibold">
              {score} de {QUIZ.length}
            </p>
            <p className="mt-2 text-white/70">
              {score === QUIZ.length ? "Perfeito: você já domina as regras do projeto." : score >= QUIZ.length / 2 ? "Muito bem! Revise as lâminas de revisão e publicação para fechar 100%." : "Vale rever a apresentação — principalmente o capítulo de revisão e publicação."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={restart} className={btn.ghost}>
                <RotateCcw aria-hidden className="h-4 w-4" /> Refazer
              </button>
              <a href={`#s/${chapterStart(5) + 1}`} className={btn.primary}>
                Revisão & publicação <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>
                Pergunta {i + 1} de {QUIZ.length}
              </span>
              <span>
                {score} acerto{score === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#a7d572] transition-[width]" style={{ width: `${(i / QUIZ.length) * 100}%` }} />
            </div>
            <p className="mt-6 font-display text-2xl font-semibold leading-snug">{q.q}</p>
            <div className="mt-5 grid gap-2.5">
              {q.opts.map((o, k) => {
                const state = chosen === null ? "idle" : k === q.a ? "right" : k === chosen ? "wrong" : "dim";
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => pick(k)}
                    disabled={chosen !== null}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] ring-1 transition",
                      state === "idle" && "bg-white/[0.05] ring-white/12 hover:bg-white/[0.1]",
                      state === "right" && "bg-[#a7d572] font-semibold text-[#0a2e1d] ring-[#a7d572]",
                      state === "wrong" && "bg-[#b42318]/25 ring-[#f0a69f]/60",
                      state === "dim" && "bg-white/[0.03] text-white/45 ring-white/8",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/15 text-sm font-bold">{"ABC"[k]}</span>
                    <span className="flex-1">{o}</span>
                    {state === "right" && <CircleCheck aria-hidden className="h-5 w-5" />}
                    {state === "wrong" && <CircleX aria-hidden className="h-5 w-5 text-[#f0a69f]" />}
                  </button>
                );
              })}
            </div>
            {chosen !== null && (
              <div className="mt-5 rounded-2xl bg-black/20 p-4" role="status">
                <p className="font-semibold">{chosen === q.a ? "Isso mesmo!" : "Quase."}</p>
                <p className="mt-1 text-sm text-white/75">{q.why}</p>
                <button type="button" onClick={advance} className={cx(btn.primary, "mt-4")}>
                  {i === QUIZ.length - 1 ? "Ver resultado" : "Próxima pergunta"} <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Todas as lâminas (rolagem contínua / impressão)
// ---------------------------------------------------------------------------
function AllSlides() {
  return (
    <>
      <div className="deck-chrome">
        <PageTitle k="Versão contínua" t="Todas as lâminas" d="Role para ler tudo de uma vez, ou imprima / salve em PDF (orientação paisagem)." />
        <div className="mb-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.print()} className={btn.primary}>
            <Printer aria-hidden className="h-4 w-4" /> Imprimir ou salvar PDF
          </button>
          <a href="#inicio" className={btn.ghost}>
            <House aria-hidden className="h-4 w-4" /> Início
          </a>
        </div>
      </div>
      <div className="deck-frame space-y-6">
        {SLIDES.map((s) => (
          <section key={s.id} className={cx("slide", `slide-${s.tone}`)} aria-label={s.title}>
            {s.render()}
          </section>
        ))}
      </div>
    </>
  );
}
