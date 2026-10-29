import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/publicacoes/"], disallow: ["/app", "/login", "/convite", "/auth", "/recuperar-acesso", "/redefinir-senha"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
