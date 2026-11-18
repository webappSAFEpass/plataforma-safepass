"use client";

import { Check, Coins, Star, X } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import type { Plan } from "@/features/plans/types";
import { cn, formatCents } from "@/lib/utils";

function ctaLabel(plan: Plan): string {
  if (plan.price_cents === 0) return "Começar Grátis";
  return `Conhecer ${plan.name.replace("SAFEpass ", "")}`;
}

export function PlanCard({ plan }: { plan: Plan }) {
  const { data: me } = useMe();
  const { openDialog } = useDialogs();
  const isFree = plan.price_cents === 0;
  const variant = plan.highlighted ? "cta" : "outline";

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg",
        plan.highlighted ? "border-destructive shadow-xl shadow-destructive/10" : "border-accent",
      )}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-destructive px-4 py-1 text-xs font-bold whitespace-nowrap text-white shadow">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden /> MAIS POPULAR
        </span>
      ) : null}
      <h3 className="text-sm font-bold text-slate-500">{plan.name}</h3>
      <p className="mt-2 mb-6 flex min-h-14 items-end gap-1">
        <span className="font-display text-4xl leading-none font-bold text-primary sm:text-5xl">
          {isFree ? "Grátis" : formatCents(plan.price_cents)}
        </span>
        {isFree ? null : <span className="mb-1 text-sm font-medium text-slate-400">/mês</span>}
      </p>
      <ul className="mb-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              "flex items-start gap-2.5 text-sm leading-relaxed",
              !feature.included && "text-slate-400",
            )}
          >
            {feature.included ? (
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-success-soft p-0.5 text-success"
                aria-label="Incluído"
              />
            ) : (
              <X
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-slate-100 p-0.5 text-slate-400"
                aria-label="Não incluído"
              />
            )}
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>
      <p className="mb-6 flex min-h-12 items-center gap-2 border-t border-accent pt-4 text-sm font-semibold text-primary">
        <Coins className="h-5 w-5 shrink-0 text-warning" aria-hidden />
        Pontuação x{plan.points_multiplier} por avaliação
      </p>
      {isFree ? (
        me ? (
          <Link href="/painel" className={cn(buttonVariants({ variant, size: "full" }))}>
            Ir para meu dashboard
          </Link>
        ) : (
          <Button
            variant={variant}
            size="full"
            onClick={() => openDialog("register", { accountType: "user" })}
          >
            {ctaLabel(plan)}
          </Button>
        )
      ) : (
        <Link
          href={`/planos/${plan.code}`}
          className={cn(buttonVariants({ variant, size: "full" }))}
        >
          {ctaLabel(plan)}
        </Link>
      )}
    </article>
  );
}
