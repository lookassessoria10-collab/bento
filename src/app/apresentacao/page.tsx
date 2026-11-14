import type { Metadata, Viewport } from "next";
import { Deck } from "./deck";
import "./deck.css";

// Página pública (fora de /app, sem login): só conteúdo explicativo e exemplos ilustrativos, nenhum dado do banco.
export const metadata: Metadata = {
  title: "Apresentação do Bento",
  description: "Como funciona o Bento, a plataforma de gestão científica do Entomo Agro 360: funções, papéis, fluxos de revisão e publicação.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0A2E1D" };

export default function ApresentacaoPage() {
  return <Deck />;
}
