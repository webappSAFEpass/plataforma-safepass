import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ToastButton } from "@/components/ui/toast-button";

import { weekAgenda } from "../data";
import type { AppointmentStatus } from "../types";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
};

export function WeekAgenda() {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        title="Sua semana"
        description="Agenda e oportunidades recentes"
        action={
          <ToastButton variant="link" size="inline" message="Agenda completa em breve">
            Ver agenda
          </ToastButton>
        }
      />
      <ul className="grid gap-2">
        {weekAgenda.map((item) => (
          <li
            key={`${item.day}-${item.time}`}
            className="flex items-center gap-3 rounded-xl border p-3 transition hover:bg-muted/50"
          >
            <div className="w-12 text-center">
              <p className="text-[10px] font-extrabold text-primary uppercase">{item.day}</p>
              <p className="font-display text-sm font-extrabold text-primary">{item.time}</p>
            </div>
            <div className="h-9 w-px bg-border" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-primary">{item.service}</p>
              <p className="mt-0.5 text-xs text-primary">{item.patient}</p>
            </div>
            <Badge
              tone={item.status === "confirmed" ? "success" : "warning"}
              className="hidden sm:inline-flex"
            >
              {STATUS_LABEL[item.status]}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
