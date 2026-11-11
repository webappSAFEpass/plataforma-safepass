"use client";

import { usePublicStats } from "@/features/stats/hooks";
import { formatStat } from "@/lib/utils";

/** Faixa de largura total com números dinâmicos vindos do banco (Rev1 + layout). */
export function StatsBar() {
  const { data, isPending, isError } = usePublicStats();

  const items = data
    ? [
        { value: `${formatStat(data.active_users)}`, label: "Usuários ativos" },
        { value: `${formatStat(data.providers)}`, label: "Prestadores" },
        { value: `${formatStat(data.benefits)}`, label: "Benefícios" },
        { value: `R$${formatStat(Math.round(data.savings_cents / 100))}`, label: "Economizados" },
      ]
    : [];

  if (isError) return null; // faixa decorativa: sem dados, simplesmente não aparece

  return (
    <section aria-label="Números da plataforma" className="bg-brand-blue">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
        {isPending
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-8">
                <div className="mx-auto h-8 w-20 animate-pulse rounded bg-white/20" />
              </div>
            ))
          : items.map((item) => (
              <div key={item.label} className="border-white/10 px-4 py-8 text-center md:border-r md:last:border-r-0">
                <dd className="font-display text-3xl font-bold text-white">{item.value}</dd>
                <dt className="mt-1 text-xs font-medium uppercase tracking-widest text-white/60">
                  {item.label}
                </dt>
              </div>
            ))}
      </dl>
    </section>
  );
}
