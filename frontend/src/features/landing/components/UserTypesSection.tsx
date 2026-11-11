"use client";

import { Briefcase, Heart, Sun, UserPlus, type LucideIcon } from "lucide-react";

import { useDialogs, type RegisterAccountType } from "@/features/dialogs/dialogs-context";
import { cn } from "@/lib/utils";

interface TypeCard {
  accountType: RegisterAccountType;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  /** Classes completas (o Tailwind só gera classes escritas por extenso). */
  hover: string;
  iconIdle: string;
  cta_color: string;
}

// Pares cor/fundo do manual da marca: azul, verde e amarelo.
const CARDS: TypeCard[] = [
  {
    accountType: "user",
    title: "Sou Usuário",
    description:
      "Proteção familiar com descontos em consultas, exames, vacinas e pets. Acumule pontos por cada avaliação e troque por benefícios.",
    cta: "Cadastrar agora",
    icon: Heart,
    hover: "hover:border-brand-blue hover:bg-brand-blue",
    iconIdle: "bg-brand-blue-soft text-brand-blue",
    cta_color: "text-brand-blue",
  },
  {
    accountType: "provider",
    title: "Sou Prestador",
    description:
      "Aumente sua visibilidade, gerencie seu corpo clínico e ofereça cupons exclusivos sem burocracia de convênios.",
    cta: "Seja um parceiro",
    icon: UserPlus,
    hover: "hover:border-brand-green hover:bg-brand-green",
    iconIdle: "bg-brand-green-soft text-brand-green",
    cta_color: "text-brand-green",
  },
  {
    accountType: "company",
    title: "Sou Empresa",
    description:
      "Ofereça o SAFEpass como benefício para seus colaboradores e gerencie atestados com total controle digital.",
    cta: "Solicitar proposta",
    icon: Briefcase,
    hover: "hover:border-brand-amber hover:bg-brand-amber",
    iconIdle: "bg-brand-amber-soft text-brand-amber",
    cta_color: "text-brand-amber",
  },
];

export function UserTypesSection() {
  const { openDialog } = useDialogs();

  return (
    <section className="bg-brand-blue-soft/30 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-3 text-center font-display text-3xl font-bold text-brand-blue">
          Sua jornada de proteção começa aqui
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center leading-relaxed text-slate-500">
          Desbloqueie todo o potencial do SAFEpass: gerencie a saúde da sua família, acumule benefícios e
          acesse cupons exclusivos com o plano ideal para você.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map(({ accountType, title, description, cta, icon: Icon, hover, iconIdle, cta_color }) => (
            <article
              key={accountType}
              className={cn(
                "group rounded-2xl border-2 border-brand-blue-soft bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
                hover,
              )}
            >
              <span
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:bg-white/25 group-hover:text-white",
                  iconIdle,
                )}
              >
                <Icon className="h-7 w-7" aria-hidden />
              </span>
              <h3 className="mb-2 font-display text-lg font-bold text-brand-blue transition group-hover:text-white">
                {title}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-500 transition group-hover:text-white/85">
                {description}
              </p>
              <button
                type="button"
                onClick={() => openDialog("register", { accountType })}
                className={cn(
                  "inline-flex items-center gap-2 text-sm font-semibold transition group-hover:text-white focus-visible:ring-2 focus-visible:ring-brand-blue",
                  cta_color,
                )}
              >
                {cta} <Sun className="h-4 w-4" aria-hidden />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
