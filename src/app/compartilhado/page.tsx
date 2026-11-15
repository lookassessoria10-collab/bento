import type { Metadata } from "next";
import { SharedView } from "./view";

// Página pública do link compartilhado. Não lê nada no servidor: o token fica no fragmento (#) da URL, que o
// navegador não envia ao servidor; o painel é buscado por POST em /api/compartilhado.
export const metadata: Metadata = {
  title: "Painel compartilhado",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function CompartilhadoPage() {
  return <SharedView />;
}
