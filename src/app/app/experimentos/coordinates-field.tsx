"use client";

import { useRef, useState } from "react";
import { Crosshair, ExternalLink, MapPin } from "lucide-react";
import { buttonClass, cx } from "@/components/ui";
import { parseCoordinates } from "@/lib/validation";
import { mapsUrl } from "@/lib/geo";

const input =
  "block h-11 w-full rounded-xl border border-border-strong bg-surface px-3.5 text-sm shadow-soft focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";

/** Latitude/longitude do experimento: digitar, colar do Google Maps ou capturar o GPS do celular em campo. */
export function CoordinatesField({ lat, lng, fonte }: { lat?: number | null; lng?: number | null; fonte?: string | null }) {
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const fonteRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);
  const [busy, setBusy] = useState(false);

  function apply(c: { lat: number; lng: number }, origem: string) {
    if (latRef.current) latRef.current.value = String(c.lat);
    if (lngRef.current) lngRef.current.value = String(c.lng);
    if (fonteRef.current && !fonteRef.current.value) fonteRef.current.value = origem;
    // avisa o formulário (rascunho local) que houve alteração
    latRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    setPreview(c);
  }

  function useGps() {
    if (!("geolocation" in navigator)) return setMsg({ ok: false, text: "Este navegador não oferece localização." });
    setBusy(true);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const c = { lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 };
        apply(c, `GPS do celular (precisão ~${Math.round(pos.coords.accuracy)} m)`);
        setMsg({ ok: true, text: `Localização capturada (precisão aproximada de ${Math.round(pos.coords.accuracy)} m). Confira antes de salvar.` });
      },
      (err) => {
        setBusy(false);
        setMsg({ ok: false, text: err.code === err.PERMISSION_DENIED ? "Permissão de localização negada no navegador." : "Não foi possível obter a localização agora." });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground/90">
          <MapPin aria-hidden className="h-4 w-4 text-brand-600" /> Coordenadas do experimento
        </p>
        <button type="button" onClick={useGps} disabled={busy} className={buttonClass("secondary", "sm")}>
          <Crosshair aria-hidden className={cx("h-4 w-4", busy && "animate-spin")} /> {busy ? "Localizando…" : "Usar minha localização"}
        </button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Colar do Google Maps (link ou “-12.0841, -45.7953”)</span>
        <input
          className={input}
          placeholder="Cole aqui um link do mapa ou as coordenadas"
          aria-label="Colar coordenadas ou link do mapa"
          onChange={(e) => {
            const v = e.target.value;
            if (!v.trim()) return setMsg(null);
            const c = parseCoordinates(v);
            if (c) {
              apply(c, "Colado de mapa/coordenadas");
              setMsg({ ok: true, text: `Entendido: ${c.lat}, ${c.lng}` });
            } else setMsg({ ok: false, text: "Formato não reconhecido. Use “latitude, longitude” em graus decimais." });
          }}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-foreground/90">Latitude</span>
          <input ref={latRef} name="latitude" inputMode="decimal" className={input} defaultValue={lat ?? ""} placeholder="-12.084100" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-foreground/90">Longitude</span>
          <input ref={lngRef} name="longitude" inputMode="decimal" className={input} defaultValue={lng ?? ""} placeholder="-45.795300" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-foreground/90">Origem da coordenada</span>
          <input ref={fonteRef} name="coordenadas_fonte" className={input} defaultValue={fonte ?? ""} placeholder="GPS, croqui, pesquisador…" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {msg && <span className={msg.ok ? "text-brand-700" : "text-danger-600"}>{msg.text}</span>}
        {preview && (
          <a href={mapsUrl(preview.lat, preview.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
            Conferir no mapa <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        )}
        <span className="text-muted">Uso interno: coordenadas nunca vão para o portal público nem para materiais de divulgação.</span>
      </div>
    </div>
  );
}
