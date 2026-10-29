import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-xl font-semibold text-brand-900">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted">O endereço não existe, foi despublicado ou você não tem acesso a este registro.</p>
      <Link className="text-brand-700 underline" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
