import { RefreshCw, Search, Star, UserPlus, type LucideIcon } from "lucide-react";

import { ReferralBanner } from "@/features/landing/components/ReferralBanner";

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: UserPlus, title: "Cadastre-se Grátis", description: "Crie sua conta em segundos e acesse a plataforma." },
  { icon: Search, title: "Encontre o Melhor", description: "Filtre por preço, especialidade e localização real." },
  { icon: Star, title: "Avalie e Pontue", description: "Vá ao agendamento, avalie o atendimento e ganhe pontos." },
  { icon: RefreshCw, title: "Resgate Benefícios", description: "Acumule pontos e troque por benefícios exclusivos SAFE." },
];

export function JourneySection() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-16 text-center font-display text-3xl font-bold text-brand-blue">
          Como entrar no universo SAFE?
        </h2>
        <ol className="mb-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="group flex flex-col items-center text-center">
              <span className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue transition duration-300 group-hover:scale-110 group-hover:bg-brand-blue group-hover:text-white">
                <Icon className="h-7 w-7" aria-hidden />
                {/* O número aparece ao passar o mouse, como no layout aprovado */}
                <span className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white group-hover:flex">
                  {index + 1}
                </span>
              </span>
              <h3 className="mb-1 font-display text-sm font-bold text-brand-blue">{title}</h3>
              <p className="text-xs leading-relaxed text-slate-400">{description}</p>
            </li>
          ))}
        </ol>
        <ReferralBanner />
      </div>
    </section>
  );
}
