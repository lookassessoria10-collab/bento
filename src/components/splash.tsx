import { BentoMark } from "@/components/logo";
import { cx } from "@/components/ui";

/** Tela de carregamento com a marca. `full` ocupa a tela inteira (entrada no app). */
export function BrandLoader({ full = false, label = "Carregando…" }: { full?: boolean; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cx(
        "flex flex-col items-center justify-center gap-6",
        full ? "fixed inset-0 z-[60] bg-[radial-gradient(900px_500px_at_50%_30%,rgb(167_213_114/0.18),transparent_60%)] bg-background" : "min-h-[55vh]",
      )}
    >
      <div className="relative animate-bento-pop">
        <span aria-hidden className="absolute inset-0 -m-6 rounded-full bg-accent-500/30 blur-2xl animate-bento-glow" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-surface shadow-float ring-1 ring-border/70">
          <BentoMark className="h-14 w-14 animate-bento-leaf" />
        </span>
      </div>
      <div className="flex flex-col items-center gap-3 animate-bento-fade">
        {full && <span className="font-display text-2xl font-bold tracking-tight text-brand-900">Bento</span>}
        <div className="h-1 w-40 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 animate-bento-bar" />
        </div>
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {full && <span className="text-[11px] tracking-wide text-muted/70">Gestão científica | Entomo Agro 360</span>}
      </div>
    </div>
  );
}
