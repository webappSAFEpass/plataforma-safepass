import { Sparkles } from "lucide-react";

import { formatNumber, formatPercent } from "@/lib/utils";

import { ACTIVE_ADOPTION } from "../constants";
import { companyMetrics } from "../data";

export function CompanyHighlight() {
  return (
    <section className="relative overflow-hidden rounded-[22px] bg-primary p-6 text-primary-foreground shadow-hero sm:p-7">
      <div className="absolute -top-16 -right-8 size-48 rounded-full border-[20px] border-accent/15" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-3 flex items-center gap-2 text-[10px] font-extrabold tracking-[.12em] text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> BENEFÍCIO EM AÇÃO
          </p>
          <h2 className="font-display text-2xl font-extrabold tracking-[-.05em]">
            Cuidar do time também é estratégia.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-border">
            {formatNumber(companyMetrics.enrolledEmployees)} colaboradores já podem aproveitar a
            rede SAFEpass. Sua adesão está acima da média do setor.
          </p>
        </div>
        <dl className="flex gap-8 rounded-2xl border border-white/10 bg-primary/75 px-5 py-4">
          <div className="flex flex-col-reverse">
            <dt className="mt-1 text-[10px] font-bold tracking-[.07em] text-border uppercase">
              Adesão ativa
            </dt>
            <dd className="font-display text-2xl font-extrabold text-accent">
              {formatPercent(ACTIVE_ADOPTION)}
            </dd>
          </div>
          <div className="h-10 w-px bg-white/15" />
          <div className="flex flex-col-reverse">
            <dt className="mt-1 text-[10px] font-bold tracking-[.07em] text-border uppercase">
              No último mês
            </dt>
            <dd className="font-display text-2xl font-extrabold">+{companyMetrics.newLastMonth}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
