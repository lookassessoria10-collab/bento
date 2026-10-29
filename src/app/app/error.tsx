"use client";

import { Alert, buttonClass } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Alert tone="danger" title="Não foi possível carregar esta página">
        Ocorreu um erro inesperado. Seus dados salvos não foram afetados. Tente novamente; se persistir, avise a administração.
      </Alert>
      <button className={buttonClass("primary", "md", "mt-4")} onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
