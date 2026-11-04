import { Pencil, Sparkles } from "lucide-react";
import Link from "next/link";

import { ProgressRing } from "@/components/ui/progress-ring";

import { PROFILE_COMPLETION, PROFILE_MISSING_ITEMS } from "../constants";

export function ProfileHighlight() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-[22px] bg-primary px-6 py-6 text-primary-foreground shadow-hero sm:px-7">
      <div className="absolute -top-20 -right-20 size-64 rounded-full bg-accent/15 blur-2xl" />
      <div className="absolute right-[20%] bottom-[-80px] size-48 rounded-full border border-white/10" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1 text-[11px] font-bold text-border">
            <Sparkles className="size-3.5 text-accent" aria-hidden="true" /> PERFIL EM DESTAQUE
          </p>
          <h2 className="font-display text-2xl font-extrabold tracking-[-.05em] sm:text-[28px]">
            Sua clínica está pronta para ser encontrada.
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 font-medium text-border">
            Complete a galeria do espaço e aumente a confiança de novos pacientes.
          </p>
          <Link
            href="/prestador/perfil"
            className="mt-5 inline-flex items-center gap-2 rounded-md text-sm font-extrabold text-accent transition hover:text-primary-foreground"
          >
            <Pencil className="size-4" aria-hidden="true" /> Completar meu perfil
          </Link>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-primary/60 px-5 py-4 backdrop-blur-sm">
          <ProgressRing
            ratio={PROFILE_COMPLETION}
            label="Perfil completo"
            className="size-[72px]"
            indicatorClassName="stroke-accent"
            trackClassName="stroke-primary-foreground/15"
            textClassName="text-xl"
          />
          <div>
            <p className="text-sm font-bold">Perfil completo</p>
            <p className="mt-1 text-xs text-border">Faltam apenas {PROFILE_MISSING_ITEMS} itens</p>
          </div>
        </div>
      </div>
    </section>
  );
}
