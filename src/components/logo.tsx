import { useId } from "react";
import { cx } from "@/components/ui";

// Marca Bento em vetor: "B" com folha e faixas de cultivo (paleta #165D3B · #3E9B5F · #A7D572).
// `gap` é a cor dos frisos entre as formas — use a cor do fundo onde a marca está aplicada.
const B_SHAPE = "M24 8H62V54H80C98 54 112 67 112 84C112 100 98 112 80 112H24C15 112 8 105 8 96V24C8 15 15 8 24 8Z";
const LEAF = "M58 56C58 30 76 12 108 10C110 40 90 56 58 56Z";

export function BentoMark({ className = "h-9 w-9", gap = "#ffffff", title = "Bento" }: { className?: string; gap?: string; title?: string }) {
  // ids únicos: gradientes/recortes definidos em um SVG oculto (display:none) não funcionam em outro
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (n: string) => `bm-${n}-${uid}`;
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={id("base")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F7A4C" />
          <stop offset="1" stopColor="#0F4A2E" />
        </linearGradient>
        <linearGradient id={id("leaf")} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#7DBF4E" />
          <stop offset="1" stopColor="#B8DD84" />
        </linearGradient>
        <linearGradient id={id("band")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#86C556" />
          <stop offset="1" stopColor="#A7D572" />
        </linearGradient>
        <clipPath id={id("clip")}>
          <path d={B_SHAPE} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id("clip")})`}>
        <rect width="120" height="120" fill={`url(#${id("base")})`} />
        <ellipse cx="6" cy="120" rx="110" ry="70" fill={`url(#${id("band")})`} />
        <ellipse cx="6" cy="120" rx="86.9" ry="55.3" fill={gap} />
        <ellipse cx="6" cy="120" rx="84.15" ry="53.55" fill="#3E9B5F" />
        <ellipse cx="6" cy="120" rx="66" ry="42" fill={gap} />
        <ellipse cx="6" cy="120" rx="63.25" ry="40.25" fill="#2A7F4F" />
        <ellipse cx="6" cy="120" rx="47.3" ry="30.1" fill={gap} />
        <ellipse cx="6" cy="120" rx="44.55" ry="28.35" fill="#1D6B42" />
        <ellipse cx="6" cy="120" rx="29.7" ry="18.9" fill={gap} />
        <ellipse cx="6" cy="120" rx="26.95" ry="17.15" fill="#165D3B" />
      </g>
      <path className="bm-leaf" d={LEAF} fill={`url(#${id("leaf")})`} stroke={gap} strokeWidth="4" paintOrder="stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({
  tone = "dark",
  size = "md",
  assinatura,
  className,
}: {
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  assinatura?: string | false;
  className?: string;
}) {
  const mark = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-14 w-14" }[size];
  const word = { sm: "text-lg", md: "text-[22px]", lg: "text-4xl" }[size];
  const gap = tone === "light" ? "#0F4A2E" : "#ffffff";
  return (
    <span className={cx("flex items-center gap-2.5", className)}>
      <BentoMark className={mark} gap={gap} />
      <span className="flex flex-col leading-none">
        <span className={cx("font-display font-bold tracking-tight", word, tone === "light" ? "text-white" : "text-brand-900")}>Bento</span>
        {assinatura !== false && (
          <span className={cx("mt-1 whitespace-nowrap text-[10px] font-medium tracking-wide", tone === "light" ? "text-white/60" : "text-muted")}>
            {assinatura ?? "Gestão científica | Entomo Agro 360"}
          </span>
        )}
      </span>
    </span>
  );
}
