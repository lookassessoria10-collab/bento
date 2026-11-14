"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckSquare,
  CircleCheck,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  LogIn,
  Microscope,
  Search,
  Sprout,
  Stamp,
  UserCheck,
  Users,
} from "lucide-react";
import { BentoMark } from "@/components/logo";
import { cx } from "@/components/ui";
import { CONTATO_COMERCIAL, linkComercial } from "./contato";

// Apresentação comercial do Bento: 10 lâminas, ~8 minutos.
// Todas as telas abaixo são reproduções da interface real com dados FICTÍCIOS (nenhum dado do banco).

export interface SlideDef {
  id: string;
  title: string;
  tone: "dark" | "light" | "lime";
  render: () => ReactNode;
}

type Icon = typeof Sprout;

// ---------------------------------------------------------------------------
// Dados demonstrativos (fictícios) usados em todas as maquetes
// ---------------------------------------------------------------------------
const DEMO = {
  experimentos: 24,
  ativos: 18,
  taxa: { pct: 83, num: 15, den: 18 },
  visitas: { previstas: 6, realizadas: 9, adiadas: 1 },
  pendencias: { abertas: 7, vencidas: 2 },
  fases: [
    ["Em implantação", 4],
    ["Em andamento", 14],
    ["Concluído", 5],
    ["Interrompido", 1],
  ] as [string, number][],
  revisao: [
    ["Em conferência interna", 3],
    ["Aguardando validação científica", 2],
    ["Aguardando revisão final", 1],
    ["Liberados, a publicar", 2],
  ] as [string, number][],
};

// ---------------------------------------------------------------------------
// Peças de composição
// ---------------------------------------------------------------------------
function Arcs({ className, color = "#A7D572", opacity = 0.18 }: { className?: string; color?: string; opacity?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={cx("s-arcs", className)} style={{ opacity }}>
      {[380, 330, 280, 230, 180, 130].map((r, i) => (
        <circle key={r} cx="400" cy="400" r={r} fill="none" stroke={i % 2 ? color : "#3E9B5F"} strokeWidth="22" />
      ))}
    </svg>
  );
}

function Head({ k, t, lead, className }: { k?: string; t: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={cx("s-stack rise", className)}>
      {k && <p className="s-kicker">{k}</p>}
      <h2 className="s-title">{t}</h2>
      {lead && <p className="s-lead">{lead}</p>}
    </div>
  );
}

function DemoBadge({ children = "Dados fictícios" }: { children?: ReactNode }) {
  return <span className="s-badge">{children}</span>;
}

const CHIP = {
  green: "bg-[#e2f0e4] text-[#165d3b]",
  lime: "bg-[#eef7df] text-[#4f7d1f]",
  amber: "bg-[#fdf3df] text-[#9a5b07]",
  blue: "bg-[#e5f0f8] text-[#1f5f8b]",
  gray: "bg-[#f1f3ec] text-[#5b6760]",
  red: "bg-[#fdeceb] text-[#b42318]",
  dark: "bg-[#165d3b] text-white",
};
function Chip({ c = "green", children }: { c?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cx("mock-chip", CHIP[c])}>{children}</span>;
}

const SIDE: [Icon, string][] = [
  [LayoutDashboard, "Visão geral"],
  [FlaskConical, "Experimentos"],
  [CalendarCheck, "Visitas"],
  [CheckSquare, "Atividades"],
  [Sprout, "Resultados"],
  [FolderOpen, "Biblioteca"],
  [ClipboardCheck, "Aprovações"],
  [BarChart3, "Relatórios"],
];

/** Moldura de janela da plataforma (barra superior + menu lateral real). */
function Window({ path, active, children, className, side = true }: { path: string; active: string; children: ReactNode; className?: string; side?: boolean }) {
  return (
    <div className={cx("win rise", className)}>
      <div className="win-bar" aria-hidden>
        <span className="win-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="win-url">{path}</span>
      </div>
      <div className={cx("win-body", side && "has-side")}>
        {side && (
          <nav className="win-side" aria-hidden>
            <span className="mb-[0.8em] flex items-center gap-[0.5em] px-[0.5em] font-display text-[1.15em] font-bold text-[#0f4a2e]">
              <BentoMark className="h-[1.6em] w-[1.6em]" /> Bento
            </span>
            {SIDE.map(([I, l]) => (
              <span key={l} className={cx("win-nav", l === active && "on")}>
                <I aria-hidden className="h-[1.2em] w-[1.2em] shrink-0" />
                {l}
              </span>
            ))}
          </nav>
        )}
        <div className="win-main">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "warn" | "danger" }) {
  return (
    <div className="mock-stat">
      <p className="text-[0.72em] font-bold uppercase tracking-wide text-[#5b6760]">{label}</p>
      <p className={cx("font-display text-[1.9em] font-semibold leading-tight tabular-nums", tone === "danger" ? "text-[#b42318]" : "text-[#14211a]")}>{value}</p>
      {hint && <p className="text-[0.72em] text-[#5b6760]">{hint}</p>}
    </div>
  );
}

function Bars({ data, max }: { data: [string, number][]; max: number }) {
  return (
    <div className="space-y-[0.55em]">
      {data.map(([l, n]) => (
        <div key={l}>
          <div className="flex justify-between text-[0.85em]">
            <span>{l}</span>
            <span className="tabular-nums text-[#5b6760]">{n}</span>
          </div>
          <div className="mt-[0.2em] h-[0.45em] rounded-full bg-[#f1f3ec]">
            <div className="bar-fill h-full rounded-full bg-gradient-to-r from-[#2a8150] to-[#a7d572]" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ l, children, className }: { l: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[0.7em] font-bold uppercase tracking-wide text-[#5b6760]">{l}</p>
      <div className="mt-[0.15em]">{children}</div>
    </div>
  );
}

function Photo({ hue }: { hue: number }) {
  return (
    <span
      aria-hidden
      className="block aspect-[4/3] rounded-[0.5em]"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 62%), hsl(${hue + 20} 50% 32%))` }}
    />
  );
}

// ---------------------------------------------------------------------------
// Chamadas para ação (sem contato inventado: sem link enquanto não configurado)
// ---------------------------------------------------------------------------
function Cta({ href, variant, children }: { href: string | null; variant: "primary" | "secondary" | "dark"; children: ReactNode }) {
  const cls = cx("s-cta", `s-cta-${variant}`);
  const content = (
    <>
      {children} <ArrowRight aria-hidden className="h-[1.1em] w-[1.1em]" />
    </>
  );
  if (!href) return <span className={cls}>{content}</span>;
  const external = href.startsWith("https://");
  return (
    <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {content}
    </a>
  );
}

function CtaNote({ className }: { className?: string }) {
  const configured = linkComercial(CONTATO_COMERCIAL.demonstracao) || linkComercial(CONTATO_COMERCIAL.piloto);
  const who = CONTATO_COMERCIAL.responsavel?.trim();
  if (configured && !who) return null;
  return <p className={cx("s-small opacity-75", className)}>{who ? who : "Fale com quem apresentou o Bento para combinar a data da demonstração."}</p>;
}

// ---------------------------------------------------------------------------
// 1 · Capa
// ---------------------------------------------------------------------------
function DashboardMock() {
  const maxF = Math.max(...DEMO.fases.map(([, n]) => n));
  return (
    <Window path="bento · Visão geral" active="Visão geral" className="cover-win">
      <div className="flex items-start justify-between gap-[0.6em]">
        <div>
          <p className="font-display text-[1.35em] font-semibold leading-tight">Olá, Coordenação</p>
          <p className="text-[0.75em] text-[#5b6760]">Instituição demonstrativa · indicadores de 01/11 a 30/11</p>
        </div>
        <DemoBadge />
      </div>
      <div className="mt-[0.9em] grid grid-cols-2 gap-[0.6em] @[760px]:grid-cols-4">
        <Stat label="Experimentos" value={DEMO.experimentos} hint={`${DEMO.ativos} em acompanhamento ativo`} />
        <Stat label="Registros devidos — novembro" value={`${DEMO.taxa.pct}%`} hint={`${DEMO.taxa.num} de ${DEMO.taxa.den} elegíveis`} />
        <Stat label="Visitas previstas" value={DEMO.visitas.previstas} hint={`${DEMO.visitas.realizadas} realizadas`} />
        <Stat label="Pendências abertas" value={DEMO.pendencias.abertas} hint={`${DEMO.pendencias.vencidas} vencidas`} />
      </div>
      <div className="mt-[0.9em] grid gap-[0.7em] @[760px]:grid-cols-[1.2fr_1fr]">
        <div className="mock-card">
          <p className="mb-[0.6em] text-[0.9em] font-semibold">Por fase do experimento</p>
          <Bars data={DEMO.fases} max={maxF} />
        </div>
        <div className="mock-card">
          <p className="mb-[0.6em] text-[0.9em] font-semibold">Agenda</p>
          {[
            ["Visita mensal · área 2", "18/11 · 08:00 · Confirmada"],
            ["Avaliação de desfolha", "21/11 · 07:30 · Planejada"],
          ].map(([t, d], i) => (
            <div key={t} className={cx("mb-[0.45em] rounded-[0.5em] border p-[0.5em]", i === 0 ? "border-[#a7d572]" : "border-[#e3e7dd]")}>
              <p className="text-[0.85em] font-semibold">{t}</p>
              <p className="text-[0.72em] text-[#5b6760]">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

function Cover() {
  return (
    <div className="cover h-full">
      <Arcs className="-bottom-[16cqw] -left-[14cqw] h-[56cqw] w-[56cqw]" opacity={0.14} />
      <div className="cover-copy">
        <div className="rise flex items-center gap-[1.1cqw]">
          <BentoMark className="h-[4.2cqw] min-h-10 w-[4.2cqw] min-w-10" gap="#0f4a2e" />
          <span className="font-display text-[clamp(26px,3.4cqw,48px)] font-bold tracking-tight">Bento</span>
        </div>
        <h1 className="s-hero rise">
          Gestão de pesquisas e experimentos <em>em um só lugar.</em>
        </h1>
        <p className="s-lead rise">Organize estudos, acompanhe atividades e mantenha as informações da sua equipe centralizadas.</p>
      </div>
      <DashboardMock />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2 · O problema
// ---------------------------------------------------------------------------
const SCATTER: { i: Icon; t: string; tag: string; x: string; y: string; r: string }[] = [
  { i: FileSpreadsheet, t: "Planilhas e documentos dispersos", tag: "ensaio_v3_FINAL (2).xlsx", x: "2%", y: "4%", r: "-4deg" },
  { i: Search, t: "Dificuldade para acompanhar o andamento dos estudos", tag: "“Em que fase está o ensaio 7?”", x: "48%", y: "0%", r: "3deg" },
  { i: Users, t: "Informações que dependem de diferentes responsáveis", tag: "“Só o responsável sabe.”", x: "6%", y: "52%", r: "2.5deg" },
  { i: History, t: "Tempo gasto procurando registros e atualizações", tag: "“Qual é a versão mais recente?”", x: "50%", y: "50%", r: "-3deg" },
];

function Problem() {
  return (
    <div className="s-grid2 problem h-full">
      <div className="s-stack">
        <Head k="O problema" t={<>Suas pesquisas estão organizadas ou <em>espalhadas</em> em diferentes lugares?</>} />
        <p className="s-quote rise">Quanto mais pesquisas uma instituição acompanha, maior a necessidade de organizar essas informações.</p>
      </div>
      <div className="scatter rise">
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="scatter-lines">
          <path d="M22 26 C 40 40, 55 20, 72 24" />
          <path d="M26 74 C 42 60, 58 82, 74 74" />
          <path d="M20 30 C 14 50, 30 56, 24 70" />
          <path d="M76 30 C 88 44, 70 58, 78 70" />
        </svg>
        {SCATTER.map((s) => (
          <div key={s.t} className="scatter-card" style={{ ["--x" as string]: s.x, ["--y" as string]: s.y, ["--r" as string]: s.r }}>
            <span className="s-icon">
              <s.i aria-hidden />
            </span>
            <p className="s-body mt-[0.7cqw] font-semibold leading-snug">{s.t}</p>
            <p className="mt-[0.6cqw] truncate font-mono text-[clamp(10px,0.9cqw,13px)] text-[#5b6760]">{s.tag}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3 · A solução
// ---------------------------------------------------------------------------
const HUB: { i: Icon; t: string }[] = [
  { i: FlaskConical, t: "Experimentos e projetos" },
  { i: Users, t: "Equipes e responsáveis" },
  { i: CalendarCheck, t: "Visitas e atividades" },
  { i: FolderOpen, t: "Documentos e registros" },
  { i: ClipboardCheck, t: "Revisões e aprovações" },
];
const R = 36;
const HUB_POS = HUB.map((_, k) => {
  const a = ((-90 + k * 72) * Math.PI) / 180;
  return { x: +(50 + R * Math.cos(a)).toFixed(2), y: +(50 + R * Math.sin(a)).toFixed(2) };
});

function Solution() {
  return (
    <div className="s-grid2 h-full">
      <Head
        k="A solução"
        t={<>Tudo o que sua equipe precisa acompanhar, em um <em>único ambiente</em>.</>}
        lead="O Bento conecta pesquisas, pessoas e registros. Cada informação fica ligada ao estudo a que pertence."
      />
      <div className="hub rise">
        <svg aria-hidden viewBox="0 0 100 100" className="hub-lines">
          <circle cx="50" cy="50" r={R} />
          {HUB_POS.map((p, k) => (
            <line key={k} x1="50" y1="50" x2={p.x} y2={p.y} />
          ))}
        </svg>
        <div className="hub-core">
          <BentoMark className="h-[62%] w-[62%]" />
        </div>
        <ul className="hub-nodes">
          {HUB.map((h, k) => (
            <li key={h.t} className="hub-node" style={{ ["--x" as string]: `${HUB_POS[k].x}%`, ["--y" as string]: `${HUB_POS[k].y}%` }}>
              <h.i aria-hidden className="h-[1.25em] w-[1.25em] shrink-0 text-[#a7d572]" />
              <span>{h.t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4 · Gestão de experimentos
// ---------------------------------------------------------------------------
const TABS = ["Resumo", "Metodologia", "Linha do tempo", "Visitas", "Resultados", "Arquivos", "Pendências", "Histórico"];

function ExperimentMock() {
  return (
    <Window path="bento · Experimentos › EA360-014" active="Experimentos" side={false}>
      <div className="flex flex-wrap items-center gap-[0.5em]">
        <span className="font-mono text-[1em] font-bold text-[#2a8150]">EA360-014</span>
        <Chip c="green">Em andamento</Chip>
        <span className="ml-auto">
          <DemoBadge />
        </span>
      </div>
      <p className="mt-[0.35em] font-display text-[1.3em] font-semibold leading-snug">Ensaio demonstrativo · manejo de lagartas em soja</p>
      <div className="mt-[0.6em] flex flex-wrap gap-[0.3em]">
        {TABS.map((t, i) => (
          <span key={t} className={cx("rounded-[0.45em] px-[0.55em] py-[0.15em] text-[0.78em] font-semibold", i === 0 ? "bg-[#165d3b] text-white" : "bg-[#f1f3ec] text-[#5b6760]")}>
            {t}
          </span>
        ))}
      </div>
      <div className="mt-[0.8em] grid gap-[0.7em] @[760px]:grid-cols-2">
        <div className="mock-card grid grid-cols-2 gap-[0.6em] text-[0.88em]">
          <Field l="Cultura">Soja</Field>
          <Field l="Fase">Em andamento</Field>
          <Field l="Responsável">Pesquisador(a) responsável</Field>
          <Field l="Local">Área experimental 2</Field>
          <Field l="Delineamento" className="col-span-2">
            DBC · 4 tratamentos · 5 repetições
          </Field>
        </div>
        <div className="mock-card text-[0.88em]">
          <p className="mb-[0.45em] font-semibold">Próximas atividades</p>
          {[
            ["21/11", "Avaliação de desfolha", "Planejada"],
            ["28/11", "Visita mensal de acompanhamento", "Planejada"],
          ].map(([d, t, s]) => (
            <p key={t} className="flex items-center gap-[0.5em] border-b border-[#eef0ea] py-[0.35em] last:border-0">
              <span className="w-[3.2em] shrink-0 font-mono text-[0.85em] text-[#2a8150]">{d}</span>
              <span className="flex-1">{t}</span>
              <Chip c="gray">{s}</Chip>
            </p>
          ))}
          <p className="mb-[0.3em] mt-[0.7em] font-semibold">Histórico</p>
          {["12/11 · Ficha de visita conferida", "03/11 · Fase alterada para Em andamento"].map((t) => (
            <p key={t} className="flex items-center gap-[0.45em] text-[0.9em] text-[#5b6760]">
              <History aria-hidden className="h-[1.1em] w-[1.1em] shrink-0" /> {t}
            </p>
          ))}
        </div>
      </div>
    </Window>
  );
}

function Checks({ items, dark }: { items: [string, string][]; dark?: boolean }) {
  return (
    <ul className="rise space-y-[clamp(6px,0.9cqw,12px)]">
      {items.map(([t, d]) => (
        <li key={t} className="flex items-start gap-[0.9cqw]">
          <CircleCheck aria-hidden className={cx("mt-[0.2em] h-[1.25em] w-[1.25em] shrink-0 s-body", dark ? "text-[#a7d572]" : "text-[#2a8150]")} />
          <span className="s-body">
            <strong className="font-semibold">{t}</strong> <span className="opacity-70">· {d}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Experiments() {
  return (
    <div className="s-grid2 h-full">
      <div className="s-stack">
        <Head k="Gestão de experimentos" t={<>Saiba o que está acontecendo em <em>cada pesquisa</em>.</>} lead="Acompanhe estudos, responsáveis, etapas e atualizações sem depender de consultas a diferentes arquivos." />
        <Checks
          items={[
            ["Cadastro dos estudos", "código único, cultura, local e metodologia"],
            ["Fase atual", "em implantação, em andamento ou concluído"],
            ["Responsáveis", "pesquisador e participantes de cada estudo"],
            ["Histórico de atualizações", "o que mudou e quando"],
            ["Próximas atividades", "etapas, avaliações e visitas previstas"],
          ]}
        />
      </div>
      <ExperimentMock />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5 · Acompanhamento de campo
// ---------------------------------------------------------------------------
function FieldRecordMock() {
  return (
    <div className="mock field-rec rise">
      <div className="flex flex-wrap items-center gap-[0.5em]">
        <span className="font-display text-[1.2em] font-semibold">Visita de novembro</span>
        <Chip c="green">Realizada</Chip>
        <span className="ml-auto">
          <DemoBadge />
        </span>
      </div>
      <p className="mt-[0.2em] text-[0.8em] text-[#5b6760]">12/11/2026 · 08:30 · Responsável: equipe de campo (Estudante 1)</p>

      <div className="mt-[0.7em] flex items-center justify-between rounded-[0.6em] bg-[#f6f7f2] px-[0.7em] py-[0.45em]">
        <span className="text-[0.9em]">
          Ficha · <span className="font-mono font-bold text-[#2a8150]">EA360-014</span>
        </span>
        <Chip c="blue">Conferida</Chip>
      </div>

      <div className="mt-[0.7em] grid gap-[0.65em] text-[0.86em] @[760px]:grid-cols-2">
        <Field l="Atividades realizadas">Aplicação dos tratamentos concluída; parcelas sinalizadas.</Field>
        <Field l="Ocorrências relatadas">
          Lagartas nas parcelas 3 e 4.
          <span className="block text-[0.85em] text-[#5b6760]">Informou: pesquisador(a) responsável</span>
        </Field>
        <Field l="Observações diretas da equipe">Desfolha visível na bordadura do bloco 2.</Field>
        <Field l="Fotografias e documentos">
          <span className="mt-[0.2em] grid grid-cols-4 gap-[0.35em]">
            <Photo hue={95} />
            <Photo hue={80} />
            <Photo hue={110} />
            <span className="flex aspect-[4/3] flex-col items-center justify-center rounded-[0.5em] border border-[#e3e7dd] text-[0.75em] text-[#5b6760]">
              <FileText aria-hidden className="h-[1.3em] w-[1.3em]" /> PDF
            </span>
          </span>
        </Field>
      </div>

      <div className="mt-[0.75em] flex flex-wrap items-center gap-[0.5em] rounded-[0.6em] border border-[#9a5b07]/25 bg-[#fdf3df]/70 px-[0.7em] py-[0.5em] text-[0.86em]">
        <strong className="font-semibold">Próxima ação:</strong> Avaliação de desfolha
        <span className="text-[#5b6760]">· Resp.: Estudante 2 · prazo 21/11</span>
      </div>
    </div>
  );
}

function VisitTrail() {
  const rows: [string, string, string, boolean][] = [
    ["12 nov", "Visita de novembro", "Ficha conferida", true],
    ["15 out", "Visita de outubro", "Ficha finalizada", false],
    ["18 set", "Visita de setembro", "Ficha finalizada", false],
    ["21 ago", "Implantação do ensaio", "Ficha finalizada", false],
  ];
  return (
    <ol className="trail rise" aria-label="Histórico de visitas do experimento (exemplo fictício)">
      {rows.map(([d, t, s, on]) => (
        <li key={d} className={cx("trail-item", on && "on")}>
          <span className="trail-dot" aria-hidden />
          <span className="s-small block font-mono opacity-70">{d}</span>
          <span className="s-body block font-semibold leading-tight">{t}</span>
          <span className="s-small block opacity-70">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function FieldWork() {
  return (
    <div className="flex h-full flex-col gap-[2.4cqw]">
      <Head k="Acompanhamento de campo" t={<>Cada visita registrada. <em>Cada informação no lugar certo.</em></>} />
      <div className="field-grid flex-1">
        <div className="s-stack">
          <p className="s-lead rise">Consulte o histórico do experimento e continue de onde a última visita parou.</p>
          <VisitTrail />
        </div>
        <FieldRecordMock />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6 · Segurança e revisão científica
// ---------------------------------------------------------------------------
const FLOW: { n: string; t: string; d: string; i: Icon }[] = [
  { n: "1", t: "Registro", d: "com fonte, autoria e data identificadas", i: FileText },
  { n: "2", t: "Conferência", d: "por outra pessoa da equipe, não por quem escreveu", i: UserCheck },
  { n: "3", t: "Validação científica", d: "pelo responsável pelo estudo ou revisor delegado", i: Microscope },
  { n: "4", t: "Liberação", d: "revisão final autoriza cada canal de divulgação", i: Stamp },
];

function Review() {
  return (
    <div className="flex h-full flex-col justify-center gap-[2.6cqw]">
      <Head k="Segurança e revisão científica" t={<>Informação organizada também precisa de <em>controle</em>.</>} />
      <ol className="flow rise">
        {FLOW.map((s) => (
          <li key={s.t} className="flow-step">
            <span className="flow-n">{s.n}</span>
            <s.i aria-hidden className="flow-i" />
            <span className="flow-t block font-display font-semibold">{s.t}</span>
            <span className="s-body mt-[0.3cqw] block opacity-70">{s.d}</span>
          </li>
        ))}
      </ol>
      <ul className="rise flex flex-wrap gap-[0.8cqw]" aria-label="Benefícios">
        {["Origem das informações identificada", "Histórico dos registros", "Controle de responsáveis e acessos", "Situação de revisão visível", "Autorização para divulgação por canal"].map((t) => (
          <li key={t} className="s-pill">
            <CircleCheck aria-hidden className="h-[1.15em] w-[1.15em] shrink-0" /> {t}
          </li>
        ))}
      </ul>
      <p className="s-small rise opacity-65">Cada decisão fica registrada com data, responsável e versão. Se o conteúdo mudar, a revisão recomeça.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7 · Indicadores e gestão
// ---------------------------------------------------------------------------
function IndicatorBoard() {
  const maxF = Math.max(...DEMO.fases.map(([, n]) => n));
  return (
    <div className="mock board rise">
      <div className="mb-[0.7em] flex items-center justify-between">
        <span className="text-[0.95em] font-semibold">Visão geral · novembro</span>
        <DemoBadge>Valores demonstrativos</DemoBadge>
      </div>
      <div className="grid grid-cols-2 gap-[0.6em] @[760px]:grid-cols-3">
        <Stat label="Experimentos cadastrados" value={DEMO.experimentos} hint={`${DEMO.ativos} em acompanhamento ativo`} />
        <Stat label="Registros devidos no mês" value={`${DEMO.taxa.pct}%`} hint={`${DEMO.taxa.num} de ${DEMO.taxa.den} elegíveis`} />
        <Stat label="Visitas realizadas" value={DEMO.visitas.realizadas} hint={`${DEMO.visitas.previstas} previstas · ${DEMO.visitas.adiadas} adiada`} />
        <Stat label="Pendências abertas" value={DEMO.pendencias.abertas} />
        <Stat label="Pendências vencidas" value={DEMO.pendencias.vencidas} tone="danger" />
        <Stat label="Em revisão" value={DEMO.revisao.slice(0, 3).reduce((a, [, n]) => a + n, 0)} hint="conteúdos na fila" />
      </div>
      <div className="mt-[0.7em] grid gap-[0.7em] @[760px]:grid-cols-2">
        <div className="mock-card">
          <p className="mb-[0.55em] text-[0.88em] font-semibold">Experimentos por situação</p>
          <Bars data={DEMO.fases} max={maxF} />
        </div>
        <div className="mock-card">
          <p className="mb-[0.55em] text-[0.88em] font-semibold">Revisão de conteúdos</p>
          {DEMO.revisao.map(([l, n]) => (
            <p key={l} className="flex justify-between border-b border-[#eef0ea] py-[0.3em] text-[0.85em] last:border-0">
              {l} <strong className="tabular-nums">{n}</strong>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Indicators() {
  return (
    <div className="s-grid2 wide-right h-full">
      <div className="s-stack">
        <Head k="Indicadores e gestão" t={<>Mais visibilidade para quem <em>coordena</em> pesquisas.</>} />
        <Checks
          dark
          items={[
            ["Filtros", "período, área, cultura, responsável e fase"],
            ["Regra visível", "cada percentual mostra como é calculado"],
            ["Relatórios", "exportação em CSV e PDF"],
          ]}
        />
      </div>
      <IndicatorBoard />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8 · Públicos e aplicações
// ---------------------------------------------------------------------------
const AUDIENCES: { i: Icon; t: string; d: string; tags: string[] }[] = [
  { i: GraduationCap, t: "Universidades e fazendas-escola", d: "Estudantes registram as visitas; orientadores acompanham e revisam o que foi feito.", tags: ["Visitas", "Revisão"] },
  { i: Building2, t: "Estações experimentais", d: "Vários ensaios ao mesmo tempo, com local, fase e calendário de acompanhamento.", tags: ["Experimentos", "Agenda"] },
  { i: Microscope, t: "Centros e instituições de pesquisa", d: "Resultados registrados com fonte, validados pelo responsável e com histórico.", tags: ["Resultados", "Histórico"] },
  { i: Sprout, t: "Empresas de P&D agrícola", d: "Visão consolidada de estudos, responsáveis e pendências por área e cultura.", tags: ["Indicadores", "Pendências"] },
];

function Audiences() {
  return (
    <div className="flex h-full flex-col justify-center gap-[2.4cqw]">
      <Head k="Públicos e aplicações" t={<>Desenvolvido para quem pesquisa, acompanha e <em>produz conhecimento</em>.</>} />
      <div className="s-cards c4 rise">
        {AUDIENCES.map((a, k) => (
          <article key={a.t} className="s-card aud-card">
            <span className="flex items-center justify-between">
              <span className="s-icon">
                <a.i aria-hidden />
              </span>
              <span className="s-num text-[#2a8150]/25" style={{ fontSize: "clamp(22px,2.6cqw,38px)" }}>
                {String(k + 1).padStart(2, "0")}
              </span>
            </span>
            <h3 className="s-body mt-[1cqw] font-display font-semibold leading-snug" style={{ fontSize: "clamp(15px,1.5cqw,21px)" }}>
              {a.t}
            </h3>
            <p className="s-body mt-[0.6cqw] opacity-75">{a.d}</p>
            <span className="mt-auto flex flex-wrap gap-[0.4cqw] pt-[1cqw]">
              {a.tags.map((t) => (
                <Chip key={t} c="green">
                  {t}
                </Chip>
              ))}
            </span>
          </article>
        ))}
      </div>
      <p className="s-small rise opacity-60">Exemplos de aplicação da plataforma em cada contexto.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9 · Demonstração
// ---------------------------------------------------------------------------
function ScreenList() {
  const rows: [string, string, string, keyof typeof CHIP, string][] = [
    ["EA360-014", "Manejo de lagartas em soja", "Em andamento", "green", "12/11"],
    ["EA360-011", "Densidade de semeadura em milho", "Em andamento", "green", "10/11"],
    ["EA360-009", "Cobertura vegetal no algodão", "Em implantação", "amber", "07/11"],
    ["EA360-006", "Doses de potássio em soja", "Concluído", "gray", "28/10"],
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-display text-[1.2em] font-semibold">Experimentos</p>
        <span className="rounded-[0.5em] bg-[#165d3b] px-[0.7em] py-[0.25em] text-[0.8em] font-semibold text-white">Novo experimento</span>
      </div>
      <table className="mt-[0.6em] w-full text-left text-[0.82em]">
        <thead className="text-[0.85em] uppercase tracking-wide text-[#5b6760]">
          <tr>
            <th className="py-[0.3em] font-bold">Código</th>
            <th className="font-bold">Título</th>
            <th className="font-bold">Fase</th>
            <th className="text-right font-bold">Atualização</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([c, t, f, k, d]) => (
            <tr key={c} className="border-t border-[#eef0ea]">
              <td className="py-[0.45em] font-mono font-bold text-[#2a8150]">{c}</td>
              <td className="pr-[0.4em]">{t}</td>
              <td>
                <Chip c={k}>{f}</Chip>
              </td>
              <td className="text-right tabular-nums text-[#5b6760]">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ScreenTimeline() {
  return (
    <>
      <p className="font-mono text-[0.9em] font-bold text-[#2a8150]">EA360-014</p>
      <p className="font-display text-[1.15em] font-semibold">Linha do tempo</p>
      <ol className="mt-[0.6em] space-y-[0.5em] border-l-2 border-[#e2f0e4] pl-[0.9em] text-[0.85em]">
        {[
          ["21/08", "Implantação do ensaio", "Etapa concluída", true],
          ["18/09", "1ª avaliação", "Avaliação realizada", true],
          ["12/11", "Visita de novembro", "Ficha conferida", true],
          ["21/11", "Avaliação de desfolha", "Prevista", false],
        ].map(([d, t, s, ok]) => (
          <li key={t as string} className="relative">
            <span className={cx("absolute -left-[1.32em] top-[0.3em] h-[0.7em] w-[0.7em] rounded-full", ok ? "bg-[#2a8150]" : "border-2 border-[#a7d572] bg-white")} />
            <span className="font-mono text-[#5b6760]">{d as string}</span> · <strong className="font-semibold">{t as string}</strong>
            <span className="block text-[0.9em] text-[#5b6760]">{s as string}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function ScreenRecord() {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-display text-[1.15em] font-semibold">Ficha · EA360-014</p>
        <Chip c="amber">Em preenchimento</Chip>
      </div>
      <div className="mt-[0.6em] grid gap-[0.5em] text-[0.85em]">
        {[
          ["Etapa atual", "Avaliações em andamento"],
          ["Atividades realizadas desde a última visita", "Aplicação dos tratamentos"],
          ["Observações diretas", "Parcelas sinalizadas e fotografadas"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-[0.5em] border border-[#e3e7dd] px-[0.6em] py-[0.35em]">
            <p className="text-[0.8em] font-bold uppercase tracking-wide text-[#5b6760]">{l}</p>
            <p>{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-[0.6em] text-[0.8em] font-semibold">Roteiro da visita</p>
      {["Conferir sinalização das parcelas", "Registrar fotos com legenda", "Anotar ocorrências"].map((t, i) => (
        <p key={t} className="flex items-center gap-[0.45em] text-[0.82em]">
          <CircleCheck aria-hidden className={cx("h-[1.1em] w-[1.1em]", i < 2 ? "text-[#2a8150]" : "text-[#cdd4c6]")} /> {t}
        </p>
      ))}
    </>
  );
}

function ScreenReviewed() {
  return (
    <>
      <p className="font-display text-[1.15em] font-semibold">Revisões e aprovações</p>
      <p className="text-[0.8em] text-[#5b6760]">Nota técnica · Ensaio EA360-014 · versão 3</p>
      <div className="mt-[0.6em] flex flex-wrap gap-[0.35em]">
        {["Conferência", "Validação científica", "Revisão final"].map((s) => (
          <Chip key={s} c="green">
            <CircleCheck aria-hidden className="h-[1.05em] w-[1.05em]" /> {s}
          </Chip>
        ))}
        <Chip c="dark">Liberado para publicação</Chip>
      </div>
      <div className="mt-[0.7em] space-y-[0.4em] text-[0.82em]">
        {[
          ["Conferência interna", "aprovado · Estudante 2 · 05/11"],
          ["Validação científica", "aprovado · Pesquisador(a) responsável · 08/11"],
          ["Revisão final", "aprovado · Coordenação · 10/11"],
        ].map(([a, b]) => (
          <p key={a} className="flex flex-wrap justify-between gap-x-[0.6em] rounded-[0.5em] border border-[#e3e7dd] px-[0.6em] py-[0.35em]">
            <span className="font-semibold">{a}</span>
            <span className="text-[#5b6760]">{b}</span>
          </p>
        ))}
      </div>
    </>
  );
}

const STEPS: { t: string; d: string; path: string; active: string; screen: () => ReactNode }[] = [
  { t: "Painel de pesquisas", d: "todos os estudos, com fase e última atualização", path: "bento · Experimentos", active: "Experimentos", screen: ScreenList },
  { t: "Ficha do experimento", d: "etapas, avaliações e visitas em uma linha do tempo", path: "bento · Experimentos › EA360-014", active: "Experimentos", screen: ScreenTimeline },
  { t: "Registro do acompanhamento", d: "ficha preenchida durante a visita, com roteiro", path: "bento · Visitas › Visita de novembro", active: "Visitas", screen: ScreenRecord },
  { t: "Informações revisadas", d: "cada etapa de revisão registrada por versão", path: "bento · Aprovações", active: "Aprovações", screen: ScreenReviewed },
];
const STEP_MS = 5000;

function DemoTour() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const auto = !paused && !reduced;
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, i]);

  const s = STEPS[i];
  const Screen = s.screen;
  return (
    <div className="demo" ref={box} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(e) => !box.current?.contains(e.relatedTarget as Node) && setPaused(false)}>
      <ol className="demo-steps rise" aria-label="Etapas da demonstração">
        {STEPS.map((x, k) => (
          <li key={x.t}>
            <button type="button" className={cx("demo-step", k === i && "on")} aria-current={k === i ? "step" : undefined} onClick={() => setI(k)}>
              <span className="demo-n">{k + 1}</span>
              <span className="min-w-0">
                <span className="s-body block font-semibold leading-tight">{x.t}</span>
                <span className="s-small block opacity-70">{x.d}</span>
              </span>
              {k === i && auto && <span key={`p-${i}`} className="demo-progress" style={{ animationDuration: `${STEP_MS}ms` }} aria-hidden />}
            </button>
          </li>
        ))}
      </ol>
      <div className="demo-screen rise">
        <Window key={i} path={s.path} active={s.active} className="demo-win">
          <div className="demo-swap">
            <Screen />
          </div>
        </Window>
      </div>
    </div>
  );
}

function Demo() {
  const demo = linkComercial(CONTATO_COMERCIAL.demonstracao);
  return (
    <div className="flex h-full flex-col gap-[2cqw]">
      <div className="flex flex-wrap items-end justify-between gap-[1.5cqw]">
        <Head k="Demonstração" t={<>Conheça o Bento <em>funcionando</em>.</>} lead="Da organização dos estudos ao acompanhamento das atividades." />
        <div className="rise flex flex-wrap items-center gap-[1cqw]">
          <Cta href={demo} variant="primary">
            Agendar uma demonstração
          </Cta>
          <Link href="/login" className="s-cta s-cta-ghost">
            <LogIn aria-hidden className="h-[1.1em] w-[1.1em]" /> Acessar a plataforma
          </Link>
        </div>
      </div>
      <DemoTour />
      <p className="s-small rise opacity-60">Telas com dados fictícios. O acesso à plataforma é feito por convite, com login individual.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10 · Conversão
// ---------------------------------------------------------------------------
function Closing() {
  const demo = linkComercial(CONTATO_COMERCIAL.demonstracao);
  const piloto = linkComercial(CONTATO_COMERCIAL.piloto);
  return (
    <div className="flex h-full flex-col justify-between gap-[3cqw]">
      <Arcs className="-bottom-[14cqw] -right-[12cqw] h-[66cqw] w-[66cqw]" color="#ffffff" opacity={0.38} />
      <div className="rise flex items-center gap-[1.1cqw]">
        <BentoMark className="h-[4.6cqw] min-h-10 w-[4.6cqw] min-w-10" gap="#a7d572" />
        <span className="font-display text-[clamp(24px,3cqw,42px)] font-bold tracking-tight">Bento</span>
      </div>
      <div className="s-stack max-w-[70cqw]">
        <h2 className="s-hero rise" style={{ fontSize: "clamp(32px,5.2cqw,76px)" }}>
          Sua equipe pode ter uma visão mais organizada de <em>cada pesquisa</em>.
        </h2>
        <p className="s-lead rise">Conheça como o Bento pode ser aplicado à rotina da sua instituição.</p>
      </div>
      <div className="rise s-stack">
        <div className="flex flex-wrap items-center gap-[1.2cqw]">
          <Cta href={demo} variant="dark">
            Agendar uma demonstração
          </Cta>
          <Cta href={piloto} variant="secondary">
            Conhecer o projeto piloto
          </Cta>
        </div>
        <CtaNote />
        <p className="s-small opacity-60">Bento · gestão de pesquisas e experimentos · desenvolvido a partir do projeto Entomo Agro 360</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sequência
// ---------------------------------------------------------------------------
export const SLIDES: SlideDef[] = [
  { id: "bento", title: "Bento", tone: "dark", render: () => <Cover /> },
  { id: "problema", title: "O problema", tone: "light", render: () => <Problem /> },
  { id: "solucao", title: "A solução", tone: "dark", render: () => <Solution /> },
  { id: "experimentos", title: "Gestão de experimentos", tone: "light", render: () => <Experiments /> },
  { id: "campo", title: "Acompanhamento de campo", tone: "dark", render: () => <FieldWork /> },
  { id: "revisao", title: "Segurança e revisão científica", tone: "light", render: () => <Review /> },
  { id: "indicadores", title: "Indicadores e gestão", tone: "dark", render: () => <Indicators /> },
  { id: "publicos", title: "Públicos e aplicações", tone: "light", render: () => <Audiences /> },
  { id: "demonstracao", title: "Demonstração", tone: "dark", render: () => <Demo /> },
  { id: "contato", title: "Agende uma demonstração", tone: "lime", render: () => <Closing /> },
];

export const DURATION = "7 a 9 min";
