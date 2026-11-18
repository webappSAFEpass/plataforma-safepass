"use client";

import { Pill } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

import type { Medication } from "../types";
import { medicationPeriod, medicationStatus } from "../utils";

type MedicationCardProps = {
  medication: Medication;
  owner: string;
  onEdit: () => void;
  onToggleEnded: () => void;
};

export function MedicationCard({
  medication: med,
  owner,
  onEdit,
  onToggleEnded,
}: MedicationCardProps) {
  const details = [
    { label: "Dosagem", value: med.dose || "—" },
    { label: "Frequência", value: med.posology || "—" },
    { label: "Período", value: medicationPeriod(med) },
    { label: "Horários", value: med.schedule.join(" · ") || "Conforme necessário" },
  ];

  return (
    <Card className={cn("p-5", !med.active && "opacity-70")}>
      <div className="flex items-start gap-4">
        <IconTile icon={Pill} tone="brand" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">
              {[med.name, med.dose].filter(Boolean).join(" ")}
              <span className="font-normal text-muted-foreground"> · {owner}</span>
            </h3>
            <Badge tone={med.active ? "success" : "neutral"}>{medicationStatus(med)}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="mt-0.5 font-medium text-ink">{d.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {med.source === "prescription" ? "Da receita" : "Cadastrado manualmente"}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                Editar
              </Button>
              {(med.active || med.ended_on) && (
                <Button variant="outline" size="sm" onClick={onToggleEnded}>
                  {med.ended_on ? "Reabrir" : "Encerrar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
