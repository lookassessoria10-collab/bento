import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import { requireContext } from "@/lib/auth";
import { PHASE_LABELS } from "@/lib/labels";
import { directionsUrl, fmtCoord, mapsUrl, osmEmbedUrl } from "@/lib/geo";
import { Alert, Card, CardBody, CardHeader, DemoBadge, EmptyState, LinkButton, PageHeader, StatusBadge, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Mapa dos experimentos" };

export default async function ExperimentsMapPage({ searchParams }: PageProps<"/app/experimentos/mapa">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  // a RLS limita aos experimentos que o usuário pode ver
  const { data } = await ctx.supabase
    .from("experiments")
    .select("id, codigo, titulo, titulo_curto, fase, culturas, local_descricao, latitude, longitude, coordenadas_fonte, is_demo")
    .eq("organization_id", ctx.orgId)
    .is("archived_at", null)
    .order("codigo_seq");
  const all = data ?? [];
  const withCoords = all.filter((e) => e.latitude != null && e.longitude != null).map((e) => ({ ...e, lat: Number(e.latitude), lng: Number(e.longitude) }));
  const without = all.filter((e) => e.latitude == null || e.longitude == null);
  const selected = withCoords.find((e) => e.id === sp.id) ?? withCoords[0];

  return (
    <>
      <PageHeader
        title="Mapa dos experimentos"
        breadcrumbs={[{ href: "/app/experimentos", label: "Experimentos" }, { label: "Mapa" }]}
        description="Localize os experimentos em campo. As coordenadas são de uso interno e nunca aparecem no portal público."
      />
      {!withCoords.length ? (
        <EmptyState title="Nenhum experimento com coordenadas ainda." action={<LinkButton href="/app/experimentos">Ir para experimentos</LinkButton>}>
          Edite um experimento e preencha as coordenadas — dá para colar do Google Maps ou usar o GPS do celular em campo.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <Card className="order-2 lg:order-1">
            <CardHeader title={`${withCoords.length} experimento(s) localizado(s)`} description="Toque para ver no mapa." />
            <ul className="max-h-[560px] divide-y divide-border/70 overflow-y-auto">
              {withCoords.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/app/experimentos/mapa?id=${e.id}`}
                    scroll={false}
                    aria-current={e.id === selected?.id ? "true" : undefined}
                    className={cx("flex items-start gap-3 px-5 py-3 transition-colors", e.id === selected?.id ? "bg-brand-50" : "hover:bg-surface-muted/60")}
                  >
                    <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", e.id === selected?.id ? "bg-brand-800 text-accent-500" : "bg-brand-50 text-brand-700")}>
                      <MapPin aria-hidden className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs font-semibold text-brand-700">{e.codigo}</span>
                      <span className="block truncate text-sm font-medium">{e.titulo_curto || e.titulo}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <StatusBadge status={e.fase} label={PHASE_LABELS[e.fase]} />
                        {e.is_demo && <DemoBadge />}
                        {e.local_descricao}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <div className="order-1 space-y-4 lg:order-2">
            <Card className="overflow-hidden">
              <iframe
                title={selected ? `Mapa — ${selected.codigo}` : "Mapa dos experimentos"}
                src={osmEmbedUrl(withCoords, selected ? { lat: selected.lat, lng: selected.lng } : undefined)}
                className="h-[360px] w-full border-0 sm:h-[460px]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              {selected && (
                <CardBody className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-brand-700">{selected.codigo}</p>
                    <p className="truncate font-display text-[15px] font-semibold text-brand-950">{selected.titulo}</p>
                    <p className="text-xs tabular text-muted">
                      {fmtCoord(selected.lat, selected.lng)}
                      {selected.coordenadas_fonte ? ` · ${selected.coordenadas_fonte}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LinkButton size="sm" href={`/app/experimentos/${selected.id}`}>
                      Abrir experimento
                    </LinkButton>
                    <a className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-800 px-3 text-[13px] font-semibold text-white hover:bg-brand-900" href={directionsUrl(selected.lat, selected.lng)} target="_blank" rel="noopener noreferrer">
                      <Navigation aria-hidden className="h-4 w-4" /> Como chegar
                    </a>
                    <a className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[13px] font-semibold hover:bg-brand-50" href={mapsUrl(selected.lat, selected.lng)} target="_blank" rel="noopener noreferrer">
                      <MapPin aria-hidden className="h-4 w-4" /> Google Maps
                    </a>
                  </div>
                </CardBody>
              )}
            </Card>
            <p className="text-xs text-muted">Mapa base © colaboradores do OpenStreetMap. O enquadramento mostra todos os experimentos localizados; o marcador indica o selecionado.</p>
          </div>
        </div>
      )}
      {without.length > 0 && (
        <div className="mt-5">
          <Alert tone="info" title={`${without.length} experimento(s) ainda sem coordenadas`}>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {without.slice(0, 12).map((e) => (
                <Link key={e.id} className="font-mono text-xs font-semibold text-brand-700 underline" href={`/app/experimentos/${e.id}/editar`}>
                  {e.codigo}
                </Link>
              ))}
              {without.length > 12 && <span className="text-xs">e mais {without.length - 12}</span>}
            </span>
          </Alert>
        </div>
      )}
    </>
  );
}
