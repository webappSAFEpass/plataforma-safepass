import { CalendarDays, HeartPulse, Search, Star } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { formatNumber, formatRating } from "@/lib/utils";

import { AVERAGE_RATING, REVIEW_COUNT } from "../constants";
import { dashboardMetrics } from "../data";

export function ProviderMetrics() {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
      <StatCard
        icon={Search}
        label="Visitas no perfil"
        value={formatNumber(dashboardMetrics.profileVisits)}
        foot="+12% este mês"
      />
      <StatCard
        icon={CalendarDays}
        label="Agendamentos"
        value={formatNumber(dashboardMetrics.appointments)}
        foot="+8 esta semana"
      />
      <StatCard
        icon={Star}
        label="Avaliação média"
        value={formatRating(AVERAGE_RATING)}
        foot={`${REVIEW_COUNT} avaliações`}
        tone="warning"
      />
      <StatCard
        icon={HeartPulse}
        label="Pacientes atendidos"
        value={formatNumber(dashboardMetrics.patientsServed)}
        foot="+18% no período"
      />
    </section>
  );
}
