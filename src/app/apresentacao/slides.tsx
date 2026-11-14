import type { ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  Camera,
  CheckSquare,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Crosshair,
  Database,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  FlaskConical,
  FolderOpen,
  Globe,
  GraduationCap,
  Hash,
  History,
  KeyRound,
  LayoutDashboard,
  Layers,
  Lightbulb,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Microscope,
  Navigation,
  Newspaper,
  PenLine,
  Quote,
  Repeat,
  Route,
  Scale,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sprout,
  Stamp,
  Target,
  Timer,
  Upload,
  UserCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { BentoMark } from "@/components/logo";
import { cx } from "@/components/ui";

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------
export interface Chapter {
  n: number;
  title: string;
  subtitle: string;
  icon: typeof Sprout;
}

export const CHAPTERS: Chapter[] = [
  { n: 1, title: "O Bento", subtitle: "Contexto e propósito", icon: Sprout },
  { n: 2, title: "Pessoas & princípios", subtitle: "Quem usa e como se registra", icon: Users },
  { n: 3, title: "Do campo ao registro", subtitle: "Experimentos, visitas e rotina", icon: FlaskConical },
  { n: 4, title: "Dados & evidências", subtitle: "Resultados e biblioteca", icon: Microscope },
  { n: 5, title: "Revisão & publicação", subtitle: "Do texto validado ao público", icon: ClipboardCheck },
  { n: 6, title: "Gestão do piloto", subtitle: "Indicadores, linha do tempo e equipe", icon: BarChart3 },
  { n: 7, title: "Confiança & segurança", subtitle: "Proteção, privacidade e campo", icon: ShieldCheck },
  { n: 8, title: "Começando", subtitle: "Primeiros passos e rotina", icon: Route },
];

export interface SlideDef {
  id: string;
  ch: number; // 0 = abertura
  title: string;
  keywords: string;
  tone: "dark" | "light" | "lime";
  render: () => ReactNode;
}

// ---------------------------------------------------------------------------
// Peças reutilizáveis
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

function Head({ k, t, lead }: { k: string; t: ReactNode; lead?: ReactNode }) {
  return (
    <div className="s-stack rise">
      <p className="s-kicker">{k}</p>
      <h2 className="s-title">{t}</h2>
      {lead && <p className="s-lead">{lead}</p>}
    </div>
  );
}

function Points({ items }: { items: { i: typeof Sprout; t: ReactNode; d?: ReactNode }[] }) {
  return (
    <ul className="s-stack rise" style={{ gap: "clamp(8px,1.2cqw,16px)" }}>
      {items.map((p, idx) => (
        <li key={idx} className="flex items-start gap-[1.1cqw]">
          <span className="s-icon">
            <p.i aria-hidden />
          </span>
          <span className="s-body">
            <strong className="font-semibold">{p.t}</strong>
            {p.d && <span className="block opacity-75">{p.d}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Card({ i: I, t, d, className }: { i: typeof Sprout; t: ReactNode; d?: ReactNode; className?: string }) {
  return (
    <div className={cx("s-card rise", className)}>
      <span className="s-icon">
        <I aria-hidden />
      </span>
      <p className="s-body mt-[0.9cqw] font-semibold">{t}</p>
      {d && <p className="s-small mt-[0.3cqw] opacity-75">{d}</p>}
    </div>
  );
}

const CHIP: Record<string, string> = {
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

function Flow({ steps, dark = true }: { steps: { i: typeof Sprout; t: string; d?: string }[]; dark?: boolean }) {
  return (
    <ol className="rise grid gap-[1cqw]" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
      {steps.map((s, idx) => (
        <li key={s.t} className="relative flex flex-col items-center text-center">
          <span
            className={cx(
              "relative z-10 flex h-[clamp(34px,4.4cqw,62px)] w-[clamp(34px,4.4cqw,62px)] items-center justify-center rounded-full",
              dark ? "bg-[#a7d572] text-[#0a2e1d]" : "bg-[#165d3b] text-[#a7d572]",
            )}
          >
            <s.i aria-hidden className="h-1/2 w-1/2" />
          </span>
          {idx < steps.length - 1 && (
            <span aria-hidden className={cx("absolute left-1/2 top-[clamp(17px,2.2cqw,31px)] h-[2px] w-full", dark ? "bg-white/25" : "bg-[#165d3b]/25")} />
          )}
          <span className="s-small mt-[0.8cqw] font-bold">{s.t}</span>
          {s.d && <span className="s-small opacity-70">{s.d}</span>}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Maquetes de interface
// ---------------------------------------------------------------------------
function MockPanel() {
  return (
    <div className="mock rise">
      <div className="mb-[1cqw] flex items-center justify-between">
        <span className="font-display text-[1.25em] font-semibold">Olá, Coordenação</span>
        <Chip c="dark">mês 3 de 6</Chip>
      </div>
      <div className="grid grid-cols-3 gap-[0.8cqw]">
        {[
          ["Experimentos", "12", "9 ativos"],
          ["Registros devidos", "83%", "10 de 12"],
          ["Pendências", "4", "1 vencida"],
        ].map(([l, v, h]) => (
          <div key={l} className="relative overflow-hidden rounded-[0.9cqw] border border-[#e3e7dd] p-[0.8cqw]">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#2a8150] to-[#a7d572]" />
            <p className="text-[0.75em] font-bold uppercase tracking-wide text-[#5b6760]">{l}</p>
            <p className="font-display text-[1.9em] font-semibold leading-tight">{v}</p>
            <p className="text-[0.75em] text-[#5b6760]">{h}</p>
          </div>
        ))}
      </div>
      <div className="mt-[1cqw] space-y-[0.6cqw]">
        {[
          ["Em andamento", 80],
          ["Em implantação", 45],
          ["Concluído", 20],
        ].map(([l, w]) => (
          <div key={l as string}>
            <div className="flex justify-between text-[0.85em]">
              <span>{l}</span>
              <span className="text-[#5b6760]">{Math.round((w as number) / 10)}</span>
            </div>
            <div className="mt-[0.2cqw] h-[0.5cqw] min-h-[4px] rounded-full bg-[#f1f3ec]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2a8150] to-[#a7d572]" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockExperiment() {
  return (
    <div className="mock rise">
      <div className="flex items-center gap-[0.8cqw]">
        <span className="font-mono text-[1.05em] font-bold text-[#2a8150]">EA360-014</span>
        <Chip c="green">Em andamento</Chip>
        <Chip c="blue">Fornecido</Chip>
      </div>
      <p className="mt-[0.5cqw] font-display text-[1.35em] font-semibold leading-snug">Ensaio ilustrativo · manejo de lagartas em soja</p>
      <div className="mt-[0.8cqw] flex flex-wrap gap-[0.4cqw]">
        {["Resumo", "Metodologia", "Linha do tempo", "Visitas", "Resultados", "Arquivos", "Pendências", "Conteúdos", "Histórico"].map((t, i) => (
          <span key={t} className={cx("rounded-[0.6cqw] px-[0.6cqw] py-[0.2cqw] text-[0.8em] font-semibold", i === 0 ? "bg-[#165d3b] text-white" : "bg-[#f1f3ec] text-[#5b6760]")}>
            {t}
          </span>
        ))}
      </div>
      <div className="mt-[1cqw] grid grid-cols-2 gap-[0.8cqw] text-[0.85em]">
        {[
          ["Cultura", "soja"],
          ["Responsável", "Pesquisador(a) responsável"],
          ["Delineamento", "DIC · 5 repetições"],
          ["Fonte", "Documento do pesquisador"],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-[0.75em] font-bold uppercase tracking-wide text-[#5b6760]">{l}</p>
            <p>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockMap() {
  return (
    <div className="mock rise relative overflow-hidden p-0">
      <svg viewBox="0 0 400 250" className="block w-full">
        <rect width="400" height="250" fill="#eef4e6" />
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M-20 ${40 + i * 26} Q 200 ${10 + i * 26} 420 ${60 + i * 24}`} stroke={i % 2 ? "#cfe3b8" : "#dcebc9"} strokeWidth="14" fill="none" />
        ))}
        <path d="M0 200 C 120 170, 220 230, 400 180" stroke="#fff" strokeWidth="6" fill="none" />
        {[
          [90, 90, "001"],
          [190, 130, "007"],
          [300, 80, "014"],
          [250, 190, "009"],
        ].map(([x, y, c], i) => (
          <g key={c as string} transform={`translate(${x} ${y})`}>
            <path d="M0 0 C -14 -16 -14 -34 0 -34 C 14 -34 14 -16 0 0 Z" fill={i === 2 ? "#165d3b" : "#3e9b5f"} />
            <circle cx="0" cy="-22" r="5.5" fill={i === 2 ? "#a7d572" : "#fff"} />
            <rect x="10" y="-36" width="40" height="16" rx="8" fill="#fff" />
            <text x="30" y="-24.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#165d3b" fontFamily="monospace">
              {c}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-between gap-[0.6cqw] border-t border-[#e3e7dd] p-[0.9cqw]">
        <div>
          <p className="font-mono text-[0.85em] font-bold text-[#2a8150]">EA360-014</p>
          <p className="text-[0.8em] text-[#5b6760]">12.084100° S, 45.795300° O · GPS do celular</p>
        </div>
        <span className="inline-flex items-center gap-[0.3cqw] rounded-[0.6cqw] bg-[#165d3b] px-[0.7cqw] py-[0.35cqw] text-[0.8em] font-bold text-white">
          <Navigation aria-hidden className="h-[1.1em] w-[1.1em]" /> Como chegar
        </span>
      </div>
    </div>
  );
}

function MockFicha() {
  return (
    <div className="mock rise">
      <div className="flex items-center justify-between">
        <span className="font-display text-[1.15em] font-semibold">Ficha · EA360-007</span>
        <Chip c="amber">Aguardando conferência</Chip>
      </div>
      <div className="mt-[0.9cqw] grid grid-cols-2 gap-[0.8cqw]">
        <div className="rounded-[0.8cqw] border border-[#1f5f8b]/25 bg-[#e5f0f8]/60 p-[0.8cqw]">
          <p className="text-[0.75em] font-bold uppercase tracking-wide text-[#1f5f8b]">Relato do pesquisador</p>
          <p className="mt-[0.3cqw] text-[0.85em]">“Avaliação de desfolha prevista para a próxima semana.”</p>
          <p className="mt-[0.3cqw] text-[0.72em] text-[#5b6760]">Informante identificado</p>
        </div>
        <div className="rounded-[0.8cqw] border border-[#9a5b07]/25 bg-[#fdf3df]/70 p-[0.8cqw]">
          <p className="text-[0.75em] font-bold uppercase tracking-wide text-[#9a5b07]">Observação da equipe</p>
          <p className="mt-[0.3cqw] text-[0.85em]">“Parcelas sinalizadas; fotos com legenda e autoria.”</p>
          <p className="mt-[0.3cqw] text-[0.72em] text-[#5b6760]">Registrado em campo</p>
        </div>
      </div>
      <div className="mt-[0.9cqw] space-y-[0.35cqw] text-[0.85em]">
        {["Etapa atual confirmada", "Ocorrências com informante", "Fotos com legenda e autorização", "Pendências com responsável e prazo"].map((t, i) => (
          <p key={t} className="flex items-center gap-[0.5cqw]">
            <CircleCheck aria-hidden className={cx("h-[1.2em] w-[1.2em]", i < 3 ? "text-[#2a8150]" : "text-[#cdd4c6]")} /> {t}
          </p>
        ))}
      </div>
    </div>
  );
}

function MockKanban() {
  const cols: [string, string[]][] = [
    ["A fazer", ["Confirmar calendário", "Fotos da parcela 3"]],
    ["Em andamento", ["Pauta: monitoramento"]],
    ["Aguardando terceiro", ["Retorno do pesquisador"]],
    ["Concluída", ["Ficha de outubro"]],
  ];
  return (
    <div className="mock rise grid grid-cols-4 gap-[0.7cqw] bg-[#f6f7f2]">
      {cols.map(([t, cards], i) => (
        <div key={t} className="rounded-[0.8cqw] bg-[#f1f3ec] p-[0.6cqw]">
          <p className="mb-[0.5cqw] text-[0.75em] font-bold">{t}</p>
          {cards.map((c) => (
            <div key={c} className={cx("mb-[0.5cqw] rounded-[0.6cqw] border bg-white p-[0.5cqw] text-[0.78em] shadow-sm", i === 0 && c.startsWith("Fotos") ? "border-[#b42318]/40" : "border-[#e3e7dd]")}>
              {c}
              <p className="mt-[0.2cqw] text-[0.85em] text-[#5b6760]">{i === 0 && c.startsWith("Fotos") ? "vencida" : "prazo 15/11"}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MockPipeline({ active = 3 }: { active?: number }) {
  const steps = ["Rascunho", "Conferência", "Validação científica", "Revisão final", "Liberado", "Publicado"];
  return (
    <div className="mock rise">
      <div className="flex flex-wrap gap-[0.5cqw]">
        {steps.map((s, i) => (
          <span key={s} className={cx("mock-chip", i < active ? "bg-[#e2f0e4] text-[#165d3b]" : i === active ? "bg-[#165d3b] text-white" : "bg-[#f1f3ec] text-[#5b6760]")}>
            {i < active && <CircleCheck aria-hidden className="h-[1.1em] w-[1.1em]" />}
            {s}
          </span>
        ))}
      </div>
      <div className="mt-[1cqw] space-y-[0.5cqw] text-[0.85em]">
        {[
          ["Conferência interna", "aprovado · Estudante 2 · v3"],
          ["Validação científica", "aprovado · Pesquisador responsável · v3"],
          ["Revisão final", "aguardando · Coordenação"],
        ].map(([a, b], i) => (
          <div key={a} className="flex items-center justify-between rounded-[0.6cqw] border border-[#e3e7dd] px-[0.7cqw] py-[0.45cqw]">
            <span className="font-semibold">{a}</span>
            <span className={cx("text-[0.9em]", i === 2 ? "text-[#9a5b07]" : "text-[#5b6760]")}>{b}</span>
          </div>
        ))}
      </div>
      <p className="mt-[0.8cqw] font-mono text-[0.72em] text-[#5b6760]">versão 3 · sha256 9f2c41ab… · imutável</p>
    </div>
  );
}

function MockPhone() {
  return (
    <div className="rise mx-auto w-[clamp(170px,22cqw,300px)] rounded-[2.6cqw] border-[0.6cqw] border-[#0a2e1d] bg-[#f6f7f2] p-[0.8cqw] text-[#14211a] shadow-2xl">
      <div className="mb-[0.8cqw] flex items-center gap-[0.6cqw]">
        <BentoMark className="h-[2.4cqw] min-h-5 w-[2.4cqw] min-w-5" />
        <span className="flex-1 rounded-full bg-white px-[0.8cqw] py-[0.35cqw] text-[clamp(8px,0.8cqw,11px)] text-[#5b6760]">Buscar…</span>
      </div>
      <p className="font-display text-[clamp(12px,1.4cqw,18px)] font-semibold">Visita de novembro</p>
      <div className="mt-[0.6cqw] space-y-[0.5cqw]">
        {["EA360-001 · ficha em preenchimento", "EA360-007 · enviada", "EA360-014 · conferida"].map((t, i) => (
          <div key={t} className="rounded-[0.8cqw] bg-white p-[0.6cqw] text-[clamp(8px,0.85cqw,11px)] shadow-sm">
            {t}
            <div className="mt-[0.3cqw] h-[0.35cqw] min-h-[3px] rounded-full bg-[#f1f3ec]">
              <div className="h-full rounded-full bg-[#3e9b5f]" style={{ width: `${[45, 80, 100][i]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-[1cqw] grid grid-cols-5 gap-[0.3cqw] rounded-[1.4cqw] bg-white p-[0.4cqw] shadow">
        {[LayoutDashboard, FlaskConical, CalendarCheck, CheckSquare, Layers].map((I, i) => (
          <span key={i} className={cx("flex aspect-square items-center justify-center rounded-[0.8cqw]", i === 2 ? "bg-[#165d3b] text-[#a7d572]" : "text-[#5b6760]")}>
            <I aria-hidden className="h-1/2 w-1/2" />
          </span>
        ))}
      </div>
    </div>
  );
}

function MockBulletin() {
  return (
    <div className="rise relative mx-auto aspect-[1/1.414] w-[clamp(150px,20cqw,280px)]">
      <div className="absolute inset-0 translate-x-[1.2cqw] translate-y-[1.2cqw] rotate-3 rounded-[0.8cqw] bg-white/60" />
      <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[0.8cqw] bg-gradient-to-b from-[#165d3b] to-[#0a2e1d] p-[1.4cqw] text-white shadow-2xl">
        <div className="flex items-center gap-[0.6cqw]">
          <BentoMark className="h-[2.2cqw] min-h-4 w-[2.2cqw] min-w-4" gap="#165d3b" />
          <span className="text-[clamp(7px,0.8cqw,11px)]">Entomo Agro 360</span>
        </div>
        <div>
          <p className="text-[clamp(7px,0.8cqw,11px)] font-bold tracking-widest text-[#a7d572]">BOLETIM Nº 1</p>
          <p className="font-display text-[clamp(13px,1.8cqw,24px)] font-bold leading-tight">Pesquisa em campo — 1º trimestre</p>
        </div>
        <p className="text-[clamp(6px,0.65cqw,9px)] text-white/60">versão 2 aprovada · sha256 · gerado pelo Bento</p>
      </div>
    </div>
  );
}

function Timeline() {
  const months = [
    ["Alinhamento", "escopo, cadastro inicial e teste do roteiro"],
    ["Visitas", "conferência e planejamento editorial"],
    ["1º boletim", "primeira edição após revisão"],
    ["Avaliação", "ajustes e rodízio de funções"],
    ["Devolutiva", "2ª edição em preparação"],
    ["Fechamento", "2º boletim, dossiê e relatório"],
  ];
  return (
    <ol className="rise grid gap-[1cqw]" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }}>
      {months.map(([t, d], i) => (
        <li key={t} className="relative">
          <span className="s-num block text-[#a7d572]" style={{ fontSize: "clamp(22px,3.2cqw,46px)" }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="mt-[0.4cqw] block h-[3px] rounded-full bg-gradient-to-r from-[#a7d572] to-transparent" />
          <span className="s-small mt-[0.6cqw] block font-bold">{t}</span>
          <span className="s-small block opacity-70">{d}</span>
        </li>
      ))}
    </ol>
  );
}

function Opener({ ch }: { ch: Chapter }) {
  return (
    <div className="flex h-full flex-col justify-between gap-[3cqw]">
      <Arcs className="-bottom-[10cqw] -right-[8cqw] h-[60cqw] w-[60cqw]" opacity={0.2} />
      <span className="s-icon rise" style={{ width: "clamp(44px,5cqw,72px)", height: "clamp(44px,5cqw,72px)" }}>
        <ch.icon aria-hidden />
      </span>
      <div className="rise">
        <p className="s-num text-[#a7d572]" style={{ fontSize: "clamp(56px,11cqw,160px)", opacity: 0.9 }}>
          {String(ch.n).padStart(2, "0")}
        </p>
        <h2 className="s-hero mt-[0.6cqw]">{ch.title}</h2>
        <p className="s-lead mt-[1cqw]">{ch.subtitle}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lâminas
// ---------------------------------------------------------------------------
const op = (n: number): SlideDef => {
  const ch = CHAPTERS[n - 1];
  return { id: `cap-${n}`, ch: n, title: `${String(n).padStart(2, "0")} · ${ch.title}`, keywords: ch.subtitle, tone: "dark", render: () => <Opener ch={ch} /> };
};

export const SLIDES: SlideDef[] = [
  {
    id: "capa",
    ch: 0,
    title: "Bento — gestão científica do Entomo Agro 360",
    keywords: "capa início apresentação",
    tone: "dark",
    render: () => (
      <div className="flex h-full flex-col justify-between gap-[3cqw]">
        <Arcs className="-bottom-[14cqw] -right-[10cqw] h-[70cqw] w-[70cqw]" opacity={0.22} />
        <div className="rise flex items-center gap-[1.2cqw]">
          <BentoMark className="h-[5cqw] min-h-10 w-[5cqw] min-w-10" gap="#165d3b" />
          <span className="s-small font-semibold tracking-[0.2em] text-white/70">GESTÃO CIENTÍFICA | ENTOMO AGRO 360</span>
        </div>
        <div className="s-stack">
          <p className="s-kicker rise">Apresentação da plataforma</p>
          <h1 className="s-hero rise">
            Do campo à <em>publicação</em>,
            <br />
            com rastreabilidade.
          </h1>
          <p className="s-lead rise max-w-[56cqw]">Como o Bento organiza experimentos, visitas, resultados e a divulgação científica do projeto — e quem faz o quê em cada etapa.</p>
        </div>
        <div className="rise flex flex-wrap gap-[1.4cqw] s-small text-white/70">
          <span>8 capítulos</span>·<span>{SLIDES.length} lâminas</span>·<span>Fazenda Meraki · Luís Eduardo Magalhães/BA</span>
        </div>
      </div>
    ),
  },
  {
    id: "indice",
    ch: 0,
    title: "Índice",
    keywords: "índice sumário capítulos agenda",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full" style={{ alignItems: "start" }}>
        <Head k="Índice" t={<>O que você vai <em>conhecer</em></>} lead="Navegue com as setas do teclado, deslize no celular ou abra o sumário a qualquer momento." />
        <ol className="rise grid grid-cols-1 gap-[0.6cqw] @[560px]:grid-cols-2">
          {CHAPTERS.map((c) => (
            <li key={c.n} className="s-card flex items-center gap-[1cqw]" style={{ padding: "clamp(10px,1.1cqw,16px)" }}>
              <span className="s-num text-[#2a8150]" style={{ fontSize: "clamp(18px,2.2cqw,32px)" }}>
                {String(c.n).padStart(2, "0")}
              </span>
              <span>
                <span className="s-body block font-semibold">{c.title}</span>
                <span className="s-small block opacity-65">{c.subtitle}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },

  // 01 · O Bento
  op(1),
  {
    id: "projeto",
    ch: 1,
    title: "O projeto Entomo Agro 360",
    keywords: "projeto fazenda meraki uneb piloto boletim dossiê",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <Head
          k="O contexto"
          t={<>Um projeto de <em>acompanhamento</em> e divulgação científica</>}
          lead="Estudantes acompanham pesquisas agrícolas na Fazenda Meraki, em Luís Eduardo Magalhães (BA), e transformam o que é validado em boletins, dossiê e conteúdos."
        />
        <div className="s-cards rise">
          {[
            ["6", "meses de piloto", "com visitas mensais"],
            ["2", "boletins", "no 3º e no 6º mês"],
            ["1", "dossiê", "técnico-científico ao final"],
            ["∞", "culturas", "não só entomologia"],
          ].map(([n, t, d]) => (
            <div key={t} className="s-card">
              <p className="s-num text-[#2a8150]">{n}</p>
              <p className="s-body font-semibold">{t}</p>
              <p className="s-small opacity-70">{d}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "desafio",
    ch: 1,
    title: "O desafio",
    keywords: "problema planilhas whatsapp fotos aprovações espalhado",
    tone: "dark",
    render: () => (
      <div className="s-grid2 h-full">
        <Head k="O desafio" t={<>Informação de pesquisa costuma ficar <em>espalhada</em></>} lead="E quando chega a hora de divulgar, ninguém sabe ao certo o que foi conferido — nem quem autorizou." />
        <div className="s-cards rise">
          <Card i={FileSpreadsheet} t="Planilhas soltas" d="versões diferentes em cada computador" />
          <Card i={Camera} t="Fotos sem contexto" d="sem legenda, autoria ou autorização" />
          <Card i={Mail} t="Aprovações por mensagem" d="sem registro de versão ou data" />
          <Card i={EyeOff} t="Sem visão do todo" d="o que está atrasado? o que já foi feito?" />
        </div>
      </div>
    ),
  },
  {
    id: "o-que-e",
    ch: 1,
    title: "O que é o Bento",
    keywords: "definição pilares organizar validar comunicar",
    tone: "light",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="A plataforma" t={<>O Bento é a <em>base de acompanhamento e comunicação</em> do projeto</>} />
        <div className="s-cards c3 rise">
          <Card i={Layers} t="Organizar" d="experimentos, visitas, arquivos e tarefas em um só lugar, com código único e histórico" />
          <Card i={BadgeCheck} t="Validar" d="nada é divulgado sem conferência, validação do pesquisador e autorização final" />
          <Card i={Megaphone} t="Comunicar" d="boletins, dossiê, Instagram e portal gerados a partir do que foi aprovado" />
        </div>
      </div>
    ),
  },
  {
    id: "nao-e",
    ch: 1,
    title: "O que o Bento não é",
    keywords: "limites caderno de campo interpretação estatística",
    tone: "lime",
    render: () => (
      <div className="flex h-full flex-col justify-center gap-[2cqw]">
        <Quote aria-hidden className="rise h-[5cqw] min-h-8 w-[5cqw] min-w-8 opacity-60" />
        <p className="s-title rise max-w-[80cqw]">
          O Bento <em>não substitui</em> o caderno de campo, a condução do experimento nem as análises dos pesquisadores.
        </p>
        <div className="s-cards c3 rise">
          <Card i={Scale} t="Não interpreta" d="sem rankings, médias recalculadas ou conclusões automáticas" />
          <Card i={PenLine} t="Não completa dados" d="o que não foi informado fica “Não informado”" />
          <Card i={Send} t="Não publica sozinho" d="toda publicação é registrada por uma pessoa, com data e canal" />
        </div>
      </div>
    ),
  },

  // 02 · Pessoas & princípios
  op(2),
  {
    id: "principios",
    ch: 2,
    title: "7 princípios de registro",
    keywords: "princípios fonte autoria não informado original autorização",
    tone: "light",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Como registramos" t={<>7 princípios que valem para <em>todo</em> registro</>} />
        <ol className="rise grid gap-[0.8cqw] @[760px]:grid-cols-2">
          {[
            "Fonte, autoria, data, conferência e última atualização sempre identificadas",
            "Relato do pesquisador ≠ observação direta da equipe ≠ conteúdo editorial",
            "Nada de estimativa: “Não informado” ou “A confirmar”",
            "Código Bento sempre ligado ao código institucional original",
            "Arquivos originais nunca são alterados — novas versões com motivo",
            "Material público só com informação e imagens aprovadas para aquele uso",
            "Restrições de acesso respeitadas em buscas, exportações e PDFs",
          ].map((t, i) => (
            <li key={t} className="s-card flex items-start gap-[1cqw]" style={{ padding: "clamp(10px,1.1cqw,16px)" }}>
              <span className="s-num text-[#2a8150]" style={{ fontSize: "clamp(18px,2.1cqw,30px)" }}>
                {i + 1}
              </span>
              <span className="s-body">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: "papeis",
    ch: 2,
    title: "Quem usa: papéis",
    keywords: "papéis permissões administrador coordenação pesquisador estudante editor leitor visitante",
    tone: "dark",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Quem usa" t={<>Cada pessoa vê e faz <em>só o que lhe cabe</em></>} />
        <div className="s-cards c3 rise">
          <Card i={Settings} t="Administração" d="equipe, convites e configurações — sem aprovar conteúdo" />
          <Card i={GraduationCap} t="Coordenação / orientador" d="panorama, revisão final e liberação para publicação" />
          <Card i={Microscope} t="Pesquisador responsável" d="vê seus estudos e valida o que é deles" />
          <Card i={Users} t="Estudantes / equipe" d="cadastram, visitam, registram e preparam conteúdos" />
          <Card i={PenLine} t="Editor" d="pautas e edição; revisão final só com delegação" />
          <Card i={Eye} t="Leitor e visitante" d="consulta o que foi compartilhado ou publicado" />
        </div>
      </div>
    ),
  },
  {
    id: "acesso",
    ch: 2,
    title: "Acesso por experimento",
    keywords: "proprietário colaborador revisor visualizador nível de acesso privado",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <Head
          k="Além do papel"
          t={<>O acesso também depende do <em>vínculo com cada experimento</em></>}
          lead="Um pesquisador não enxerga automaticamente os resultados reservados de outro estudo."
        />
        <div className="s-stack rise">
          {[
            [UserCheck, "Proprietário", "responsável pelo estudo: edita e valida"],
            [Users, "Colaborador", "contribui com o cadastro e os registros"],
            [BadgeCheck, "Revisor delegado", "valida cientificamente por delegação"],
            [Eye, "Visualizador", "somente leitura"],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Sprout;
            return (
              <div key={t as string} className="s-card flex items-center gap-[1cqw]" style={{ padding: "clamp(10px,1.1cqw,16px)" }}>
                <span className="s-icon">
                  <Icon aria-hidden />
                </span>
                <span className="s-body">
                  <strong>{t as string}</strong> — {d as string}
                </span>
              </div>
            );
          })}
          <p className="s-small opacity-70">Níveis do experimento: privado (gestão + membros) ou equipe e colaboradores. Nenhum nível torna dados públicos.</p>
        </div>
      </div>
    ),
  },

  // 03 · Do campo ao registro
  op(3),
  {
    id: "mapa-modulos",
    ch: 3,
    title: "Mapa da plataforma",
    keywords: "módulos menu visão geral experimentos visitas atividades resultados biblioteca aprovações editorial relatórios equipe configurações",
    tone: "light",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Mapa da plataforma" t={<>12 módulos, uma <em>única base</em></>} />
        <div className="s-cards c4 rise">
          {[
            [LayoutDashboard, "Visão geral"],
            [FlaskConical, "Experimentos"],
            [CalendarCheck, "Visitas"],
            [CheckSquare, "Atividades"],
            [Sprout, "Resultados"],
            [FolderOpen, "Biblioteca"],
            [ClipboardCheck, "Aprovações"],
            [Newspaper, "Editorial"],
            [BarChart3, "Relatórios"],
            [Users, "Equipe"],
            [Settings, "Configurações"],
            [Globe, "Portal público"],
          ].map(([I, t]) => {
            const Icon = I as typeof Sprout;
            return (
              <div key={t as string} className="s-card flex items-center gap-[0.8cqw]" style={{ padding: "clamp(9px,1cqw,14px)" }}>
                <span className="s-icon">
                  <Icon aria-hidden />
                </span>
                <span className="s-body font-semibold">{t as string}</span>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    id: "visao-geral",
    ch: 3,
    title: "Visão geral",
    keywords: "painel dashboard indicadores agenda piloto pendências",
    tone: "dark",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="Visão geral" t={<>Um painel de <em>ação</em>, com números reais</>} />
          <Points
            items={[
              { i: Target, t: "Registros devidos no mês", d: "com numerador, denominador e regra visíveis" },
              { i: Clock, t: "Agenda dos próximos 7 e 30 dias", d: "no fuso da Bahia" },
              { i: Bell, t: "Pendências e revisões", d: "o que está vencido e quem precisa agir" },
            ]}
          />
        </div>
        <MockPanel />
      </div>
    ),
  },
  {
    id: "experimentos",
    ch: 3,
    title: "Experimentos",
    keywords: "cadastro código ea360 abas fonte rascunho arquivar",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="Experimentos" t={<>Cada pesquisa com <em>código único</em> e história completa</>} />
          <Points
            items={[
              { i: Hash, t: "Código EA360-001 gerado pelo banco", d: "nunca reutilizado, ligado ao código institucional" },
              { i: PenLine, t: "Rascunho parcial permitido", d: "o essencial é exigido só ao ativar o acompanhamento" },
              { i: Archive, t: "Arquivar sem apagar", d: "histórico e autoria preservados" },
            ]}
          />
        </div>
        <MockExperiment />
      </div>
    ),
  },
  {
    id: "coordenadas",
    ch: 3,
    title: "Coordenadas e mapa",
    keywords: "coordenadas gps mapa localização como chegar google maps",
    tone: "dark",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="Novo · Localização" t={<>Encontre qualquer experimento <em>no campo</em></>} />
          <Points
            items={[
              { i: Crosshair, t: "GPS do celular", d: "um toque na hora da visita captura a posição" },
              { i: MapPin, t: "Colar do Google Maps", d: "link ou “latitude, longitude” — o Bento entende" },
              { i: Navigation, t: "Mapa e “Como chegar”", d: "todos os experimentos localizados em uma tela" },
              { i: Lock, t: "Uso interno", d: "coordenadas nunca vão para materiais públicos" },
            ]}
          />
        </div>
        <MockMap />
      </div>
    ),
  },
  {
    id: "importar",
    ch: 3,
    title: "Importar e exportar",
    keywords: "importação planilha modelo csv xlsx exportação duplicatas",
    tone: "light",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Planilhas" t={<>Traga cadastros existentes com o <em>modelo oficial</em></>} lead="Baixe o modelo, preencha uma linha por experimento e importe — com prévia, validação e desfazer lote." />
        <Flow
          dark={false}
          steps={[
            { i: Download, t: "Baixar modelo", d: "31 colunas" },
            { i: FileSpreadsheet, t: "Preencher", d: "CSV ou XLSX" },
            { i: Upload, t: "Enviar e mapear", d: "colunas reconhecidas" },
            { i: Search, t: "Prévia", d: "duplicata só por código" },
            { i: CircleCheck, t: "Confirmar", d: "lote registrado" },
          ]}
        />
        <p className="s-small rise opacity-70">Colunas extras não são descartadas: ficam nas observações. Exportações respeitam as permissões de quem baixa.</p>
      </div>
    ),
  },
  {
    id: "visitas",
    ch: 3,
    title: "Visitas: do agendamento à ficha",
    keywords: "visitas fluxo agendar realizar preencher conferir finalizar calendário",
    tone: "dark",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Visitas" t={<>Uma visita, várias fichas — <em>uma por experimento</em></>} />
        <Flow
          steps={[
            { i: CalendarCheck, t: "Planejar", d: "data, local e experimentos" },
            { i: MapPin, t: "Realizar", d: "visita adiada nunca vira realizada" },
            { i: PenLine, t: "Preencher", d: "relato × observação" },
            { i: UserCheck, t: "Conferir", d: "por outra pessoa" },
            { i: FileCheck2, t: "Finalizar", d: "PDF da ficha" },
          ]}
        />
        <p className="s-small rise opacity-70">Calendário mensal e semanal, aviso de visita devida no mês e roteiro (checklist) configurável.</p>
      </div>
    ),
  },
  {
    id: "ficha",
    ch: 3,
    title: "A ficha de acompanhamento",
    keywords: "ficha relato pesquisador observação estudantes roteiro pendência tarefa pdf",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="A ficha" t={<>Quem disse o quê fica <em>sempre claro</em></>} />
          <Points
            items={[
              { i: Quote, t: "Relato do pesquisador", d: "com o informante identificado" },
              { i: Eye, t: "Observação direta da equipe", d: "em campo separado" },
              { i: ListChecks, t: "Pendência vira tarefa", d: "com responsável, prazo e vínculo à visita" },
            ]}
          />
        </div>
        <MockFicha />
      </div>
    ),
  },
  {
    id: "atividades",
    ch: 3,
    title: "Atividades e pendências",
    keywords: "atividades tarefas kanban quadro rotinas recorrentes prazos notificações",
    tone: "dark",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Atividades" t={<>Um quadro que <em>salva de verdade</em></>} lead="Arraste, mude a situação e o banco registra. Rotinas mensais são geradas sem duplicar." />
        <MockKanban />
      </div>
    ),
  },

  // 04 · Dados & evidências
  op(4),
  {
    id: "resultados",
    ch: 4,
    title: "Resultados recebidos",
    keywords: "resultados síntese conferência validação escopo canal versão interpretação",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <Head k="Resultados" t={<>Registro <em>descritivo</em> do que o pesquisador forneceu</>} lead="O Bento guarda a síntese recebida, a fonte, as limitações e a situação da análise — sem recalcular nada." />
        <div className="s-stack rise">
          {[
            ["1", "Registro", "estudante copia a síntese como recebida", "gray"],
            ["2", "Conferência", "outra pessoa da equipe confere", "blue"],
            ["3", "Validação", "o responsável pelo estudo valida", "green"],
            ["4", "Escopo", "escolhe onde pode ser divulgado: boletim, dossiê, Instagram, portal", "lime"],
          ].map(([n, t, d, c]) => (
            <div key={t} className="s-card flex items-center gap-[1cqw]" style={{ padding: "clamp(10px,1.1cqw,16px)" }}>
              <Chip c={c as keyof typeof CHIP}>{n}</Chip>
              <span className="s-body">
                <strong>{t}</strong> — {d}
              </span>
            </div>
          ))}
          <p className="s-small opacity-70">Mudou a interpretação? Nova versão, e a validação anterior deixa de valer.</p>
        </div>
      </div>
    ),
  },
  {
    id: "biblioteca",
    ch: 4,
    title: "Biblioteca",
    keywords: "biblioteca arquivos fotos documentos versões autorização privado link temporário",
    tone: "dark",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Biblioteca" t={<>Fotos e documentos <em>privados por padrão</em></>} />
        <div className="s-cards c4 rise">
          <Card i={Camera} t="Foto com legenda" d="autoria e data obrigatórias" />
          <Card i={History} t="Versões" d="original nunca sobrescrito; motivo da troca" />
          <Card i={Stamp} t="Autorização de uso" d="interno ou divulgação por canal" />
          <Card i={KeyRound} t="Link temporário" d="só após checar a permissão" />
        </div>
        <p className="s-small rise opacity-70">Upload múltiplo com progresso, links externos para arquivos institucionais e download auditável.</p>
      </div>
    ),
  },

  // 05 · Revisão & publicação
  op(5),
  {
    id: "tres-chaves",
    ch: 5,
    title: "As três chaves",
    keywords: "revisão aprovação conferência validação científica revisão final liberação",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="Motor de revisão" t={<>Três chaves antes de <em>qualquer</em> publicação</>} />
          <Points
            items={[
              { i: UserCheck, t: "Conferência interna", d: "por alguém que não escreveu a versão" },
              { i: Microscope, t: "Validação científica", d: "pelo responsável pelos estudos citados" },
              { i: Stamp, t: "Revisão final", d: "coordenação autoriza canal por canal" },
            ]}
          />
        </div>
        <MockPipeline />
      </div>
    ),
  },
  {
    id: "versao",
    ch: 5,
    title: "Versão imutável",
    keywords: "snapshot versão imutável hash editar reabre ciclo",
    tone: "dark",
    render: () => (
      <div className="flex h-full flex-col justify-center gap-[2.4cqw]">
        <Head k="Versões" t={<>O que foi aprovado é <em>exatamente</em> o que será publicado</>} />
        <div className="s-cards c3 rise">
          <Card i={FileLock2} t="Snapshot imutável" d="ao enviar para revisão, o texto é congelado com hash" />
          <Card i={Repeat} t="Editou? Novo ciclo" d="qualquer mudança relevante exige nova revisão" />
          <Card i={History} t="Histórico completo" d="quem decidiu, quando, em qual versão e para qual canal" />
        </div>
      </div>
    ),
  },
  {
    id: "boletins",
    ch: 5,
    title: "Boletins",
    keywords: "boletim edição seções pdf capa meta trimestral",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="Boletins" t={<>Edições montadas a partir do que foi <em>validado</em></>} />
          <Points
            items={[
              { i: ListChecks, t: "7 seções do pré-projeto", d: "apresentação, panorama, destaque, resultados, entomologia, agenda e créditos" },
              { i: FileText, t: "PDF real", d: "capa, numeração, versão, hash e data de geração" },
              { i: Target, t: "Meta do piloto", d: "2 edições — nada gerado automaticamente" },
            ]}
          />
        </div>
        <MockBulletin />
      </div>
    ),
  },
  {
    id: "dossie",
    ch: 5,
    title: "Dossiê técnico-científico",
    keywords: "dossiê assistente período seleção lacunas aprovação pdf",
    tone: "dark",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Dossiê" t={<>Um assistente em <em>5 etapas</em>, com seleção humana</>} />
        <Flow
          steps={[
            { i: CalendarCheck, t: "Período", d: "e escopo" },
            { i: ListChecks, t: "Seleção", d: "dos experimentos" },
            { i: Search, t: "Lacunas", d: "fontes e autorizações" },
            { i: PenLine, t: "Síntese", d: "só o verificável" },
            { i: FileCheck2, t: "Aprovação", d: "e PDF final" },
          ]}
        />
        <p className="s-small rise opacity-70">A versão de divulgação nunca incorpora contatos, coordenadas ou campos privados.</p>
      </div>
    ),
  },
  {
    id: "instagram",
    ch: 5,
    title: "Instagram",
    keywords: "instagram pauta legenda checklist publicação manual métricas dúvidas",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <Head
          k="Instagram"
          t={<>Gestão editorial — <em>sem automação</em> escondida</>}
          lead="Calendário de feed, carrossel, reels e stories; legenda com contador; aprovação por versão; publicação manual registrada com link e data."
        />
        <div className="mock rise">
          {[
            ["Autorização de imagem", true],
            ["Fonte e referências", true],
            ["Revisão científica", true],
            ["Revisão institucional", true],
            ["Créditos", true],
            ["Publicação registrada", false],
          ].map(([t, ok]) => (
            <p key={t as string} className="flex items-center gap-[0.6cqw] border-b border-[#e3e7dd] py-[0.5cqw] text-[1.05em] last:border-0">
              <CircleCheck aria-hidden className={cx("h-[1.2em] w-[1.2em]", ok ? "text-[#2a8150]" : "text-[#cdd4c6]")} />
              {t as string}
            </p>
          ))}
          <p className="mt-[0.6cqw] text-[0.8em] text-[#5b6760]">Métricas inseridas manualmente, com data de referência.</p>
        </div>
      </div>
    ),
  },
  {
    id: "portal",
    ch: 5,
    title: "Portal público",
    keywords: "portal público site publicações feedback transparência desativado",
    tone: "dark",
    render: () => (
      <div className="s-grid2 h-full">
        <Head k="Portal público" t={<>Ligado só com <em>autorização institucional</em></>} lead="Até lá, a página inicial mostra apenas uma apresentação genérica." />
        <div className="s-stack rise">
          <Points
            items={[
              { i: Globe, t: "Só o que foi liberado para o portal", d: "a partir do snapshot aprovado" },
              { i: Repeat, t: "Revogou? Some na hora", d: "com errata quando necessário" },
              { i: Mail, t: "Feedback com consentimento", d: "anônimo, moderado e com limite anti-spam" },
            ]}
          />
        </div>
      </div>
    ),
  },

  // 06 · Gestão do piloto
  op(6),
  {
    id: "indicadores",
    ch: 6,
    title: "Relatórios e indicadores",
    keywords: "relatórios indicadores percentual mensal registros devidos csv pdf",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <div className="s-stack">
          <Head k="Indicadores" t={<>Medir o piloto com <em>regras explícitas</em></>} />
          <Points
            items={[
              { i: FlaskConical, t: "Experimentos e visitas", d: "cadastrados, ativos, acompanhados, fichas conferidas" },
              { i: Newspaper, t: "Conteúdos e boletins", d: "produzidos, validados, liberados, publicados × meta" },
              { i: Download, t: "CSV e PDF", d: "exportações respeitando permissões" },
            ]}
          />
        </div>
        <div className="s-card rise text-center" style={{ padding: "clamp(16px,2.4cqw,36px)" }}>
          <p className="s-small font-bold uppercase tracking-widest opacity-60">Registros devidos atualizados no mês</p>
          <p className="s-num mt-[1cqw] text-[#2a8150]">83%</p>
          <p className="s-body mt-[1cqw] font-mono">10 atualizados ÷ 12 previstos × 100</p>
          <p className="s-small mt-[1cqw] opacity-70">Exclui pesquisas encerradas sem atualização devida — e mostra a regra junto do número.</p>
        </div>
      </div>
    ),
  },
  {
    id: "linha-do-tempo",
    ch: 6,
    title: "Linha do tempo do piloto",
    keywords: "linha do tempo meses piloto marcos cronograma",
    tone: "dark",
    render: () => (
      <div className="flex h-full flex-col justify-center gap-[3cqw]">
        <Head k="Seis meses" t={<>A linha do tempo do <em>piloto</em></>} lead="Início real configurado pela administração — com marcos editáveis e possibilidade de prorrogação." />
        <Timeline />
      </div>
    ),
  },
  {
    id: "equipe",
    ch: 6,
    title: "Equipe, convites e rodízio",
    keywords: "equipe convite papel rodízio frentes articulação registros comunicação suspensão",
    tone: "light",
    render: () => (
      <div className="s-grid2 h-full">
        <Head k="Equipe" t={<>Contas só por <em>convite</em>, funções que giram</>} lead="O link do convite vale 7 dias e é exibido uma única vez. Suspender um acesso não apaga a autoria histórica." />
        <div className="s-cards rise">
          <Card i={Building2} t="Articulação" d="agenda, interlocutores e pendências" />
          <Card i={FolderOpen} t="Registros" d="fichas, fotos e consistência" />
          <Card i={Megaphone} t="Comunicação" d="pautas, boletins e Instagram" />
          <Card i={Repeat} t="Rodízio trimestral" d="com histórico de cada período" />
        </div>
      </div>
    ),
  },

  // 07 · Confiança & segurança
  op(7),
  {
    id: "seguranca",
    ch: 7,
    title: "Segurança em camadas",
    keywords: "segurança rls permissões banco storage privado auditoria convite",
    tone: "dark",
    render: () => (
      <div className="s-grid2 h-full">
        <Head k="Segurança" t={<>Esconder um botão <em>não é</em> controle de acesso</>} lead="As regras vivem no banco de dados: mesmo uma requisição direta não consegue pular etapas." />
        <div className="s-stack rise">
          {[
            [Database, "Regras no banco (RLS)", "cada linha checada por organização, papel e vínculo"],
            [Fingerprint, "Fluxos protegidos", "situações só mudam pelas etapas de revisão"],
            [FileLock2, "Arquivos privados", "links temporários após checar a permissão"],
            [History, "Auditoria", "quem alterou o quê e quando"],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Sprout;
            return (
              <div key={t as string} className="s-card flex items-center gap-[1cqw]" style={{ padding: "clamp(10px,1.1cqw,16px)" }}>
                <span className="s-icon">
                  <Icon aria-hidden />
                </span>
                <span className="s-body">
                  <strong>{t as string}</strong> — <span className="opacity-75">{d as string}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    id: "privacidade",
    ch: 7,
    title: "Privacidade e LGPD",
    keywords: "privacidade lgpd dados pessoais contatos minimização consentimento",
    tone: "light",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Privacidade" t={<>Dados mínimos, <em>finalidade clara</em></>} />
        <div className="s-cards c4 rise">
          <Card i={Lock} t="Contatos restritos" d="nunca vão para o portal" />
          <Card i={MapPin} t="Coordenadas internas" d="fora de qualquer divulgação" />
          <Card i={Mail} t="Feedback anônimo" d="sem guardar IP; com consentimento" />
          <Card i={Scale} t="Correção e exclusão" d="respeitando a integridade científica" />
        </div>
      </div>
    ),
  },
  {
    id: "celular",
    ch: 7,
    title: "No campo, no celular",
    keywords: "celular mobile campo barra inferior gps rascunho conexão",
    tone: "dark",
    render: () => (
      <div className="s-grid2 reverse h-full">
        <MockPhone />
        <div className="s-stack">
          <Head k="Em campo" t={<>Feito para usar <em>durante a visita</em></>} />
          <Points
            items={[
              { i: Smartphone, t: "Barra de navegação no rodapé", d: "e o restante na folha “Mais”" },
              { i: Crosshair, t: "GPS em um toque", d: "para a coordenada do experimento" },
              { i: WifiOff, t: "Sinal fraco?", d: "o formulário guarda um rascunho na aba até você salvar" },
            ]}
          />
        </div>
      </div>
    ),
  },

  // 08 · Começando
  op(8),
  {
    id: "primeiros-passos",
    ch: 8,
    title: "Primeiros passos",
    keywords: "começar onboarding primeiros passos configurar convidar cadastrar",
    tone: "light",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Primeiros passos" t={<>8 passos para colocar o projeto <em>em operação</em></>} />
        <ol className="rise grid gap-[0.7cqw] @[760px]:grid-cols-4 grid-cols-2">
          {[
            "Configurar o início do piloto",
            "Convidar a equipe",
            "Cadastrar fazenda e áreas",
            "Cadastrar o 1º experimento",
            "Agendar uma visita",
            "Registrar a ficha",
            "Solicitar revisão",
            "Preparar a publicação",
          ].map((t, i) => (
            <li key={t} className="s-card" style={{ padding: "clamp(10px,1.1cqw,16px)" }}>
              <span className="s-num block text-[#2a8150]" style={{ fontSize: "clamp(18px,2.2cqw,32px)" }}>
                {i + 1}
              </span>
              <span className="s-body mt-[0.4cqw] block font-semibold">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: "rotina",
    ch: 8,
    title: "Uma rotina mensal",
    keywords: "rotina mensal ciclo visita ficha conferência resultado conteúdo",
    tone: "dark",
    render: () => (
      <div className="s-stack h-full justify-center">
        <Head k="Ritmo do projeto" t={<>Um mês típico no <em>Bento</em></>} />
        <Flow
          steps={[
            { i: Repeat, t: "Gerar rotinas", d: "início do mês" },
            { i: CalendarCheck, t: "Visitar", d: "e preencher fichas" },
            { i: UserCheck, t: "Conferir", d: "em dupla" },
            { i: Sprout, t: "Resultados", d: "validados pelo responsável" },
            { i: Newspaper, t: "Conteúdos", d: "pautas e boletim" },
            { i: BarChart3, t: "Indicadores", d: "fechamento do mês" },
          ]}
        />
      </div>
    ),
  },
  {
    id: "fim",
    ch: 8,
    title: "Vamos começar",
    keywords: "encerramento acesso login contato",
    tone: "lime",
    render: () => (
      <div className="flex h-full flex-col justify-between gap-[3cqw]">
        <Arcs className="-bottom-[12cqw] -right-[10cqw] h-[64cqw] w-[64cqw]" color="#ffffff" opacity={0.35} />
        <div className="rise flex items-center gap-[1cqw]">
          <BentoMark className="h-[4.4cqw] min-h-10 w-[4.4cqw] min-w-10" gap="#a7d572" />
          <span className="s-small font-semibold tracking-[0.2em]">BENTO · ENTOMO AGRO 360</span>
        </div>
        <div className="s-stack">
          <p className="s-hero rise">
            Pesquisa organizada,
            <br />
            divulgação <em>com confiança</em>.
          </p>
          <p className="s-lead rise max-w-[60cqw]">Acesse com o link do seu convite. Dúvidas sobre papéis e fluxos? O Guia de uso dentro da plataforma acompanha você em cada tela.</p>
        </div>
        <div className="rise flex flex-wrap items-center gap-[1.4cqw]">
          <Link href="/login" className="inline-flex items-center gap-[0.6cqw] rounded-full bg-[#0a2e1d] px-[2cqw] py-[1cqw] s-body font-semibold text-white">
            Acessar o Bento <ArrowRight aria-hidden className="h-[1.2em] w-[1.2em]" />
          </Link>
          <span className="s-small inline-flex items-center gap-[0.4cqw] font-semibold">
            <BookOpen aria-hidden className="h-[1.2em] w-[1.2em]" /> Guia de uso dentro da plataforma
          </span>
          <span className="s-small inline-flex items-center gap-[0.4cqw] font-semibold">
            <Lightbulb aria-hidden className="h-[1.2em] w-[1.2em]" /> Situação institucional: em alinhamento
          </span>
        </div>
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------
// Trilhas personalizadas, mural e quiz
// ---------------------------------------------------------------------------
export const ROLES = [
  { id: "estudante", label: "Estudante / equipe", d: "Vou cadastrar, visitar e registrar", icon: Users },
  { id: "pesquisador", label: "Pesquisador(a)", d: "Quero acompanhar e validar meus estudos", icon: Microscope },
  { id: "coordenacao", label: "Coordenação / orientador", d: "Acompanho o projeto e autorizo publicações", icon: GraduationCap },
  { id: "gestao", label: "Administração", d: "Cuido de acessos e configurações", icon: Settings },
  { id: "visitante", label: "Só quero conhecer", d: "Uma visão geral rápida", icon: Eye },
] as const;
export type RoleId = (typeof ROLES)[number]["id"];

const ESSENTIAL: Record<RoleId, string[]> = {
  estudante: ["capa", "o-que-e", "principios", "papeis", "experimentos", "coordenadas", "visitas", "ficha", "atividades", "resultados", "biblioteca", "tres-chaves", "celular", "rotina", "fim"],
  pesquisador: ["capa", "o-que-e", "nao-e", "acesso", "experimentos", "ficha", "resultados", "tres-chaves", "versao", "privacidade", "fim"],
  coordenacao: ["capa", "projeto", "o-que-e", "papeis", "visao-geral", "tres-chaves", "versao", "boletins", "dossie", "portal", "indicadores", "linha-do-tempo", "equipe", "fim"],
  gestao: ["capa", "o-que-e", "papeis", "acesso", "equipe", "seguranca", "privacidade", "portal", "primeiros-passos", "fim"],
  visitante: ["capa", "projeto", "desafio", "o-que-e", "nao-e", "mapa-modulos", "tres-chaves", "portal", "fim"],
};
const CHAPTERS_BY_ROLE: Record<RoleId, number[]> = {
  estudante: [1, 2, 3, 4, 8],
  pesquisador: [1, 2, 4, 5, 7],
  coordenacao: [1, 2, 5, 6, 7],
  gestao: [1, 2, 6, 7, 8],
  visitante: [1, 3, 5],
};

export function buildTrail(role: RoleId, mode: "rapida" | "detalhada"): number[] {
  const idx = (id: string) => SLIDES.findIndex((s) => s.id === id);
  if (mode === "rapida") return ESSENTIAL[role].map(idx).filter((i) => i >= 0);
  const chs = new Set(CHAPTERS_BY_ROLE[role]);
  return SLIDES.map((s, i) => ({ s, i }))
    .filter(({ s }) => s.id === "capa" || s.id === "indice" || s.id === "fim" || chs.has(s.ch))
    .map(({ i }) => i);
}

export const MURAL: { tema: string; sem: string; com: string; i: typeof Sprout }[] = [
  { tema: "Cadastro", sem: "Cada experimento numa planilha diferente, com nomes que mudam.", com: "Código EA360 único, vinculado ao código institucional e com histórico.", i: FlaskConical },
  { tema: "Localização", sem: "“É no talhão perto da estrada” — e ninguém acha a parcela.", com: "Coordenadas com GPS em um toque, mapa e “Como chegar”.", i: MapPin },
  { tema: "Visitas", sem: "Anotações soltas, sem saber quem informou o quê.", com: "Ficha por experimento: relato do pesquisador separado da observação da equipe.", i: CalendarCheck },
  { tema: "Fotos", sem: "Imagens no celular, sem legenda nem autorização.", com: "Biblioteca privada com legenda, autoria e autorização por canal.", i: Camera },
  { tema: "Resultados", sem: "Números circulando antes de o pesquisador conferir.", com: "Registro descritivo, conferido e validado pelo responsável.", i: Sprout },
  { tema: "Aprovação", sem: "“Pode publicar” numa mensagem — sem saber de qual versão.", com: "Três chaves registradas por versão imutável, com data e responsável.", i: ClipboardCheck },
  { tema: "Boletim", sem: "Montado na última hora, copiando trechos de vários lugares.", com: "Seções a partir do que foi validado e PDF final com hash.", i: Newspaper },
  { tema: "Acompanhamento", sem: "Não dá para saber o que está atrasado.", com: "Painel com pendências, agenda e registros devidos no mês.", i: Timer },
];

export const QUIZ: { q: string; opts: string[]; a: number; why: string }[] = [
  {
    q: "Uma estudante escreveu um texto para o boletim. Ela mesma pode liberá-lo para publicação?",
    opts: ["Sim, se estiver revisado", "Não: a conferência e a liberação são feitas por outras pessoas", "Sim, se for administradora"],
    a: 1,
    why: "Quem redige uma versão não confere nem libera. E administração não concede aprovação.",
  },
  {
    q: "Quem faz a validação científica de um resultado?",
    opts: ["A coordenação", "Qualquer pesquisador da organização", "O responsável pelo experimento (ou revisor delegado)"],
    a: 2,
    why: "Validação científica depende do vínculo com o estudo — não do cargo.",
  },
  {
    q: "O pesquisador não informou a data de início. O que registrar?",
    opts: ["Estimar uma data próxima", "Deixar em branco (“Não informado”)", "Usar a data da visita"],
    a: 1,
    why: "Dados científicos nunca são completados por estimativa.",
  },
  {
    q: "Um texto já aprovado foi editado depois. O que acontece?",
    opts: ["Nada, a aprovação continua valendo", "Volta para rascunho e precisa de nova revisão", "É publicado automaticamente"],
    a: 1,
    why: "A aprovação vale para uma versão exata. Mudou o texto, recomeça o ciclo.",
  },
  {
    q: "As coordenadas de um experimento aparecem no portal público?",
    opts: ["Sim, sempre", "Só se o experimento estiver publicado", "Não: são de uso interno"],
    a: 2,
    why: "Coordenadas ajudam a equipe a achar o experimento, mas nunca entram em material público.",
  },
  {
    q: "Gerar o PDF final do boletim significa que ele foi publicado?",
    opts: ["Sim", "Não: a publicação é registrada à parte, com canal, data e link", "Só se for enviado por e-mail"],
    a: 1,
    why: "“Publicado” exige confirmação explícita de quem divulgou, onde e quando.",
  },
];

export const MINUTES_PER_SLIDE = 0.45;
