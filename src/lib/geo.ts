// Utilitários de localização (sem chaves nem serviços pagos).

export function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function fmtCoord(lat: number, lng: number) {
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(6)}° ${v < 0 ? neg : pos}`;
  return `${f(lat, "N", "S")}, ${f(lng, "L", "O")}`;
}

/** Caixa que envolve todos os pontos, com margem (para o mapa embutido do OpenStreetMap). */
export function bbox(points: { lat: number; lng: number }[], padDeg = 0.01) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const pad = (a: number, b: number) => Math.max(padDeg, (b - a) * 0.15);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    minLat: minLat - pad(minLat, maxLat),
    maxLat: maxLat + pad(minLat, maxLat),
    minLng: minLng - pad(minLng, maxLng),
    maxLng: maxLng + pad(minLng, maxLng),
  };
}

export function osmEmbedUrl(points: { lat: number; lng: number }[], marker?: { lat: number; lng: number }) {
  const b = bbox(points.length ? points : marker ? [marker] : []);
  const params = new URLSearchParams({ bbox: `${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`, layer: "mapnik" });
  if (marker) params.set("marker", `${marker.lat},${marker.lng}`);
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

/** Distância aproximada em km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
