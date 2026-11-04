import { ArrowUpRight, ClipboardCheck, HeartPulse, UserCog } from "lucide-react";

import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ToastButton } from "@/components/ui/toast-button";
import { formatNumber } from "@/lib/utils";

import { ENGAGEMENT, PLAN_NAME } from "../constants";
import { companyMetrics } from "../data";

const PILLARS = [
  {
    title: "Rede de cuidado",
    description: "Consultas, exames e especialidades com condições exclusivas.",
    icon: HeartPulse,
  },
  {
    title: "Apoio emocional",
    description: "Acesso facilitado a psicologia e bem-estar mental.",
    icon: UserCog,
  },
  {
    title: "Gestão inteligente",
    description: "Indicadores para apoiar decisões de pessoas e cultura.",
    icon: ClipboardCheck,
  },
];

export function BenefitsOverview() {
  const plan = [
    {
      label: "Colaboradores",
      value: formatNumber(companyMetrics.enrolledEmployees),
      foot: `do total de ${companyMetrics.seatLimit}`,
    },
    {
      label: "Rede disponível",
      value: `+${formatNumber(companyMetrics.networkProviders)}`,
      foot: "prestadores parceiros",
    },
    { label: "Renovação", value: companyMetrics.renewal, foot: "renovação automática" },
  ];
  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] text-accent">
                  PLANO EMPRESARIAL
                </span>
                <h2 className="mt-5 font-display text-2xl font-extrabold tracking-[-.05em]">
                  {PLAN_NAME}
                </h2>
                <p className="mt-2 text-sm text-border">
                  Saúde acessível e rede qualificada para todo o time.
                </p>
              </div>
              <IconTile icon={HeartPulse} tone="brand" size="lg" className="size-11" />
            </div>
          </div>
          <dl className="grid divide-y p-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {plan.map((item) => (
              <div key={item.label} className="flex flex-col py-3 sm:px-5 sm:py-0 first:sm:pl-0">
                <dt className="order-1 text-[10px] font-extrabold tracking-[.08em] text-primary uppercase">
                  {item.label}
                </dt>
                <dd className="order-2 mt-1 font-display text-2xl font-extrabold text-primary">
                  {item.value}
                </dd>
                <dd className="order-3 mt-1 text-xs font-semibold text-primary">{item.foot}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-6">
          <p className="text-[11px] font-extrabold tracking-[.1em] text-primary uppercase">
            Engajamento
          </p>
          <div className="mt-4 flex items-center gap-4">
            <ProgressRing ratio={ENGAGEMENT} label="Engajamento" textClassName="text-primary" />
            <div>
              <p className="font-display text-xl font-extrabold tracking-[-.04em] text-primary">
                Acima da média
              </p>
              <p className="mt-1 text-xs leading-5 text-primary">
                Uso consistente da rede e dos programas preventivos.
              </p>
            </div>
          </div>
        </Card>
      </section>
      <section className="mt-5 grid gap-5 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title} className="p-5">
            <IconTile icon={pillar.icon} size="lg" />
            <h3 className="mt-5 font-display font-extrabold tracking-[-.04em] text-primary">
              {pillar.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-primary">{pillar.description}</p>
            <ToastButton
              variant="link"
              size="inline"
              className="mt-4"
              message={pillar.title}
              description={pillar.description}
            >
              Entender benefício <ArrowUpRight aria-hidden="true" />
            </ToastButton>
          </Card>
        ))}
      </section>
    </>
  );
}
