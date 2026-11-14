import type { Metadata, Viewport } from "next";
import { Deck } from "./deck";
import "./deck.css";

// Página pública (fora de /app, sem login): apresentação comercial com telas ilustrativas e dados fictícios.
// Nenhum dado do banco é lido aqui.
export const metadata: Metadata = {
  title: "Bento · Gestão de pesquisas e experimentos",
  description: "Conheça o Bento: organize estudos, acompanhe visitas e atividades e mantenha as informações da sua equipe de pesquisa centralizadas.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0A2E1D" };

export default function ApresentacaoPage() {
  return <Deck />;
}
