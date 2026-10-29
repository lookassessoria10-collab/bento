import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { portalState } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

// Somente publicações ativas no portal habilitado; nada privado ou preliminar.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  try {
    const st = await portalState();
    if (!st.active) return [];
    const { data } = await st.sb.from("public_publications").select("slug, published_at").eq("organization_id", st.org.id);
    return [{ url: `${base}/` }, ...(data ?? []).map((p) => ({ url: `${base}/publicacoes/${p.slug}`, lastModified: p.published_at }))];
  } catch {
    return [];
  }
}
