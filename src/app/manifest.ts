import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bento — Gestão científica | Entomo Agro 360",
    short_name: "Bento",
    description: "Plataforma de gestão científica do projeto Entomo Agro 360.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F6F7F2",
    theme_color: "#165D3B",
    lang: "pt-BR",
    icons: [
      { src: "/brand/bento-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/bento-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
