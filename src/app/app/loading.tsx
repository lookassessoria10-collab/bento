export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-64 rounded bg-surface-muted" />
      <div className="h-4 w-96 max-w-full rounded bg-surface-muted" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-muted" />
    </div>
  );
}
