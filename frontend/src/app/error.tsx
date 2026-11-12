"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-[-.05em] text-primary">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-primary">Tente novamente em alguns instantes.</p>
        <Button className="mt-6" onClick={reset}>
          Tentar de novo
        </Button>
      </div>
    </main>
  );
}
