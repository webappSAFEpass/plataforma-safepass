import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  HeartPulse,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/ui/bar-chart";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatNumber, formatPercent } from "@/lib/utils";

import { ENGAGEMENT } from "../constants";
import { companyMetrics, engagementByMonth } from "../data";
import { CompanyHighlight } from "./CompanyHighlight";

const QUICK_ACTIONS = [
  { label: "Adicionar colaborador", icon: UserPlus, href: "/empresa/colaboradores" },
  { label: "Ver benefícios ativos", icon: HeartPulse, href: "/empresa/beneficios" },
  { label: "Organizar atestados", icon: FileText, href: "/empresa/atestados" },
];

export function CompanyDashboard() {
  return (
    <>
      <CompanyHighlight />
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
        <StatCard
          icon={UsersRound}
          label="Colaboradores"
          value={formatNumber(companyMetrics.enrolledEmployees)}
          foot={`${companyMetrics.awaitingInvite} aguardando convite`}
        />
        <StatCard
          icon={HeartPulse}
          label="Utilização"
          value={formatPercent(ENGAGEMENT)}
          foot="+9% neste trimestre"
        />
        <StatCard
          icon={CalendarDays}
          label="Atendimentos"
          value={formatNumber(companyMetrics.appointmentsThisMonth)}
          foot="Neste mês"
        />
        <StatCard
          icon={FileText}
          label="Atestados"
          value={formatNumber(companyMetrics.certificatesToReview)}
          foot="Para revisar"
          tone="warning"
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Saúde do benefício"
            description="Engajamento dos últimos seis meses."
            action={<Badge>EM CRESCIMENTO</Badge>}
          />
          <BarChart
            bars={engagementByMonth}
            label="Engajamento mensal, de abril a setembro"
            describe={(bar) => `${bar.label}: ${bar.value}% de engajamento`}
            className="mt-8 h-40 px-2"
          />
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Ações rápidas"
            action={<ArrowUpRight className="size-4 text-primary" aria-hidden="true" />}
          />
          <ul className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 transition hover:bg-muted/50"
                >
                  <IconTile icon={action.icon} size="sm" />
                  <span className="flex-1 text-sm font-bold text-primary">{action.label}</span>
                  <ArrowUpRight className="size-4 text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
  );
}
