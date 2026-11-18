import { RefreshCw, Search, Star, UserPlus, type LucideIcon } from "lucide-react";

import { ReferralBanner } from "@/features/landing/components/ReferralBanner";

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: UserPlus,
    title: "Cadastre-se Grátis",
    description: "Crie sua conta em poucos passos e conheça a plataforma.",
  },
  {
    icon: Search,
    title: "Encontre o Melhor",
    description: "Conheça opções de cuidado e serviços disponíveis.",
  },
  {
    icon: Star,
    title: "Avalie e Pontue",
    description: "Compartilhe sua experiência e acumule pontos.",
  },
  {
    icon: RefreshCw,
    title: "Resgate Benefícios",
    description: "Use seus pontos para aproveitar benefícios exclusivos.",
  },
];

export function JourneySection() {
  return (
    <section className="bg-white px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-20 text-center font-display text-3xl font-bold text-primary sm:text-4xl">
          Como entrar no universo SAFE?
        </h2>
        <ol className="mb-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="group flex flex-col items-center text-center">
              <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary transition duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                <Icon className="h-7 w-7" aria-hidden />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white opacity-0 shadow transition group-hover:opacity-100">
                  {index + 1}
                </span>
              </span>
              <h3 className="mb-2 font-display text-lg font-bold text-primary">{title}</h3>
              <p className="max-w-[15rem] text-sm leading-relaxed text-slate-500">{description}</p>
            </li>
          ))}
        </ol>
        <ReferralBanner />
      </div>
    </section>
  );
}
