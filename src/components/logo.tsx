// Marca provisória "Bento": símbolo original de módulos/camadas de pesquisa (substituível por marca aprovada).
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Bento">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--brand-800)" />
      <rect x="7" y="7" width="8" height="8" rx="2" fill="var(--brand-100)" />
      <rect x="17" y="7" width="8" height="8" rx="2" fill="var(--accent-500)" />
      <rect x="7" y="17" width="18" height="3" rx="1.5" fill="var(--brand-100)" opacity="0.9" />
      <rect x="7" y="22" width="12" height="3" rx="1.5" fill="var(--brand-100)" opacity="0.6" />
    </svg>
  );
}

export function Logo({ assinatura = "Gestão científica | Entomo Agro 360", compact = false }: { assinatura?: string; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight text-brand-900">Bento</span>
        {!compact && <span className="text-[11px] text-muted">{assinatura}</span>}
      </span>
    </span>
  );
}
