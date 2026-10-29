import { BrandLoader } from "@/components/splash";

// Tela de carregamento em tela cheia (ex.: entrada no app após o login).
export default function Loading() {
  return <BrandLoader full label="Preparando seu espaço…" />;
}
