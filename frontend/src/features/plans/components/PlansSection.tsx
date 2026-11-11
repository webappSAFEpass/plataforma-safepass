"use client";

import { PlanCard } from "@/features/plans/components/PlanCard";
import { usePlans } from "@/features/plans/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export function PlansSection() {
  const { data: plans, isPending, isError, refetch } = usePlans();

  return (
    <section id="planos" className="scroll-mt-20 bg-brand-blue-soft/30 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-3 text-center font-display text-3xl font-bold text-brand-blue">
          A proteção que cabe no seu bolso
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-slate-500">
          Modelo Freemium, com mais acesso e economia para sua família.
        </p>
        {isPending ? (
          <div className="grid gap-6 md:grid-cols-3" aria-busy>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : isError ? (
          <p role="alert" className="text-center text-sm text-slate-500">
            Não foi possível carregar os planos.{" "}
            <button type="button" onClick={() => refetch()} className="font-semibold text-brand-blue underline">
              Tentar de novo
            </button>
          </p>
        ) : plans.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Os planos serão divulgados em breve.</p>
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
