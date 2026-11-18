import { Heart, ShieldCheck } from "lucide-react";
import Image from "next/image";

const HERO_IMAGE = "/images/family-care.webp";

export function Hero() {
  return (
    <section className="grid min-h-[calc(100vh-4rem)] overflow-hidden bg-white lg:grid-cols-[0.92fr_1.08fr]">
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16 xl:px-20">
        <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-accent/60 px-4 py-2 text-xs font-semibold tracking-wide text-primary uppercase">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Cuidado que acompanha você
        </span>
        <h1 className="mb-5 max-w-xl font-display text-4xl leading-tight font-bold text-ink sm:text-5xl xl:text-6xl">
          Juntos para proteger tudo que mais <span className="text-success">importa</span> para você
        </h1>
        <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Conectamos você a serviços de saúde, proteção e bem-estar com confiança, benefícios reais
          e tudo em um só lugar.
        </p>
        <ul className="flex flex-wrap gap-3">
          <li className="flex items-center gap-2 rounded-full border border-accent bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> Proteção confiável
          </li>
          <li className="flex items-center gap-2 rounded-full border border-success-soft bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <Heart className="h-5 w-5 fill-success/10 text-success" aria-hidden /> Bem-estar
            integral
          </li>
        </ul>
      </div>
      <div className="relative min-h-[22rem] overflow-hidden bg-accent sm:min-h-[30rem] lg:min-h-[calc(100vh-4rem)]">
        <Image
          src={HERO_IMAGE}
          alt="Família de diferentes gerações reunida em um abraço, representando cuidado e proteção familiar"
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
      </div>
    </section>
  );
}
