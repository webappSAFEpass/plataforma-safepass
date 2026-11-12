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
  return `Liberar Benefícios ${plan.name.replace("SAFEpass ", "")}`;
}

export function PlanCard({ plan }: { plan: Plan }) {
  const { data: me } = useMe();
  const { openDialog } = useDialogs();
  const isFree = plan.price_cents === 0;
  const variant = plan.highlighted ? "default" : "outline";

  return (
    <article
      className={cn(
        "relative rounded-2xl border-2 bg-white p-6 shadow-sm",
        plan.highlighted ? "border-destructive shadow-xl shadow-destructive/10" : "border-accent",
      )}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-destructive px-4 py-1 text-xs font-bold text-white">
          <Star className="h-3 w-3 fill-warning text-warning" aria-hidden /> MAIS POPULAR
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-500">{plan.name}</h3>
      <p className="mt-1 mb-5 flex items-end gap-1">
        <span className="font-display text-3xl font-bold text-primary">
          {isFree ? "Grátis" : formatCents(plan.price_cents)}
        </span>
        {isFree ? null : <span className="mb-1 text-sm text-slate-400">/mês</span>}
      </p>
      <ul className="mb-5 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              "flex items-center gap-2.5 text-sm",
              !feature.included && "text-slate-400",
            )}
          >
            {feature.included ? (
              <Check
                className="h-4 w-4 shrink-0 rounded-full bg-success-soft p-0.5 text-success"
                aria-label="Incluído"
              />
            ) : (
              <X
                className="h-4 w-4 shrink-0 rounded-full bg-slate-100 p-0.5 text-slate-400"
                aria-label="Não incluído"
              />
            )}
            {feature.label}
          </li>
        ))}
      </ul>
      <p className="mb-5 flex items-center gap-2 border-t border-accent pt-4 text-sm font-semibold text-primary">
        <Coins className="h-4 w-4 text-warning" aria-hidden />
        Pontuação x{plan.points_multiplier} por avaliação
      </p>
      {isFree ? (
        me ? (
          <Link href="/painel" className={cn(buttonVariants({ variant, size: "full" }))}>
            Ir para meu painel
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
