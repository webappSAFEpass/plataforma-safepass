import { Heart, ShieldCheck } from "lucide-react";
import Image from "next/image";

// TODO(Rev1): trocar a foto por uma que transmita cuidado e proteção da família
// (a atual lembra uma confraternização). Sugestão: colocar o arquivo em /public.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1649730828859-73efaff40d04?w=1200&h=900&fit=crop&auto=format";

export function Hero() {
  return (
    <section className="grid min-h-[calc(100vh-4rem)] overflow-hidden lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
        <h1 className="mb-5 max-w-xl font-display text-4xl font-bold leading-tight text-ink lg:text-5xl">
          Juntos para proteger tudo que mais <span className="text-brand-green">importa</span> para você
        </h1>
        <p className="mb-8 max-w-md leading-relaxed text-slate-500">
          Conectamos você a serviços de saúde, proteção e bem-estar com confiança, benefícios reais e
          tudo em um só lugar.
        </p>
        <ul className="flex flex-wrap gap-3">
          <li className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-brand-blue" aria-hidden /> Proteção Confiável
          </li>
          <li className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <Heart className="h-5 w-5 text-brand-green" aria-hidden /> Bem-estar Integral
          </li>
        </ul>
      </div>
      <div className="relative min-h-72 bg-slate-100">
        <Image
          src={HERO_IMAGE}
          alt="Família caminhando ao ar livre"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
