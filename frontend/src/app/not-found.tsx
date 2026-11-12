import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-[10px] font-extrabold tracking-[.16em] text-primary">ERRO 404</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.055em] text-primary">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-primary">O endereço pode ter mudado ou não existe mais.</p>
        <Button asChild className="mt-6">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
