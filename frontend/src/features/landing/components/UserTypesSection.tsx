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
  hover: string;
  iconIdle: string;
  ctaColor: string;
}

const CARDS: TypeCard[] = [
  {
    accountType: "user",
    title: "Sou Usuário",
    description:
      "Proteção familiar com descontos em consultas, exames, vacinas e pets. Acumule pontos por cada avaliação e troque por benefícios.",
    cta: "Cadastrar agora",
    icon: Heart,
    hover: "hover:border-primary hover:bg-primary",
    iconIdle: "bg-accent text-primary",
    ctaColor: "text-primary",
  },
  {
    accountType: "provider",
    title: "Sou Prestador",
    description:
      "Aumente sua visibilidade, apresente seus serviços e conecte-se a pessoas que buscam cuidado e confiança.",
    cta: "Seja um parceiro",
    icon: UserPlus,
    hover: "hover:border-success hover:bg-success",
    iconIdle: "bg-success-soft text-success",
    ctaColor: "text-success",
  },
  {
    accountType: "company",
    title: "Sou Empresa",
    description:
      "Ofereça o SAFEpass como benefício para seus colaboradores e fortaleça o cuidado com sua equipe.",
    cta: "Solicitar proposta",
    icon: Briefcase,
    hover: "hover:border-warning hover:bg-warning",
    iconIdle: "bg-warning-soft text-warning",
    ctaColor: "text-warning",
  },
];

export function UserTypesSection() {
  const { openDialog } = useDialogs();

  return (
    <section className="bg-accent/30 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center font-display text-3xl font-bold text-primary sm:text-4xl">
          Sua jornada de proteção começa aqui
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center leading-relaxed text-slate-600">
          Desbloqueie todo o potencial do SAFEpass: encontre cuidado para você e sua família,
          conheça os benefícios e escolha o perfil ideal para começar.
        </p>
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {CARDS.map(
            ({ accountType, title, description, cta, icon: Icon, hover, iconIdle, ctaColor }) => (
              <article
                key={accountType}
                className={cn(
                  "group flex min-h-[20rem] flex-col rounded-2xl border-2 border-accent bg-white p-6 shadow-sm transition duration-300 focus-within:ring-2 focus-within:ring-primary/30 hover:-translate-y-1 hover:shadow-xl",
                  hover,
                )}
              >
                <span
                  className={cn(
                    "mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:bg-white/20 group-hover:text-white",
                    iconIdle,
                  )}
                >
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <h3 className="mb-2 font-display text-xl font-bold text-primary transition group-hover:text-white">
                  {title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-slate-600 transition group-hover:text-white/90">
                  {description}
                </p>
                <button
                  type="button"
                  onClick={() => openDialog("register", { accountType })}
                  className={cn(
                    "mt-7 inline-flex min-h-11 w-fit items-center gap-2 border-b-2 border-current pb-1 text-sm font-bold transition group-hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none",
                    ctaColor,
                  )}
                >
                  {cta} <Sun className="h-4 w-4" aria-hidden />
                </button>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
