"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-brand-blue">Algo deu errado</h1>
      <p className="mt-3 text-slate-500">Tente novamente em instantes.</p>
      <Button className="mt-6" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
