"use client";

import { usePublicStats } from "@/features/stats/hooks";
import { formatStat } from "@/lib/utils";

const LABELS = ["Usuários ativos", "Prestadores", "Benefícios", "Economizados"];

/** Faixa de largura total com números dinâmicos vindos do banco (Rev1 + layout). */
export function StatsBar() {
  const { data, isPending, isError } = usePublicStats();

  if (isError) return null; // faixa decorativa: sem dados, simplesmente não aparece

  const items = data
    ? [
        { value: formatStat(data.active_users), label: LABELS[0] },
        { value: formatStat(data.providers), label: LABELS[1] },
        { value: formatStat(data.benefits), label: LABELS[2] },
        { value: `R$ ${formatStat(Math.round(data.savings_cents / 100))}`, label: LABELS[3] },
      ]
    : [];

  return (
    <section aria-label="Números da plataforma" className="w-full bg-primary text-white">
      <dl className="grid w-full grid-cols-2 divide-x divide-y divide-white/15 md:grid-cols-4 md:divide-y-0">
        {isPending
          ? LABELS.map((label) => (
              <div key={label} className="px-4 py-8 text-center sm:py-10" aria-busy="true">
                <div className="mx-auto h-10 w-24 animate-pulse rounded bg-white/15" />
                <dt className="mt-3 text-xs font-semibold tracking-[0.16em] text-white/75 uppercase">
                  {label}
                </dt>
              </div>
            ))
          : items.map((item) => (
              <div key={item.label} className="px-4 py-8 text-center sm:py-10">
                <dd className="font-display text-4xl leading-none font-bold text-white sm:text-5xl">
                  {item.value}
                </dd>
                <dt className="mt-3 text-[0.68rem] font-semibold tracking-[0.16em] text-white/75 uppercase sm:text-xs">
                  {item.label}
                </dt>
              </div>
            ))}
      </dl>
    </section>
  );
}
