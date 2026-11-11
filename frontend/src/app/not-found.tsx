import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-brand-blue">Página não encontrada</h1>
      <p className="mt-3 text-slate-500">O endereço pode ter mudado ou não existir mais.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-brand-blue underline">
        Voltar para o início
      </Link>
    </div>
  );
}
