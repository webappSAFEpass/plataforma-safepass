"use client";

import { Check, Clock, Syringe } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeader } from "@/components/ui/section-header";
import { formatDate } from "@/lib/utils";

import { useDependents } from "../hooks/useDependents";
import { useDose, useReminders } from "../hooks/useReminders";
import type { Reminder } from "../types";
import { ownerName, reminderLabel } from "../utils";

import { QueryState } from "./QueryState";

/** Agenda de hoje: doses com "Tomei"/"Desfazer" e as próximas vacinas. */
export function ReminderList() {
  const query = useReminders();
  const { data: dependents = [] } = useDependents();
  const dose = useDose();
  const reminders = query.data ?? [];
  const doses = reminders.filter((r) => r.kind === "medication");
  const vaccines = reminders.filter((r) => r.kind === "vaccine");

  const toggle = (r: Reminder) =>
    dose.mutate(
      { dose: { medication_id: r.medication_id!, date: r.date, time: r.time! }, taken: !r.taken },
      { onError: (error) => toast.error(error.message) },
    );

  return (
    <QueryState
      isPending={query.isPending}
      isError={query.isError}
      isEmpty={reminders.length === 0}
      onRetry={() => query.refetch()}
      empty="Nenhum lembrete para hoje. Eles aparecem quando há medicamento ativo ou vacina pendente."
    >
      <div className="space-y-6">
        {doses.length > 0 && (
          <Card className="p-5">
            <SectionHeader icon={Clock} title="Doses de hoje" />
            <ul className="divide-y">
              {doses.map((r) => (
                <li key={`${r.medication_id}-${r.time}`} className="flex items-center gap-4 py-3">
                  <span className="w-14 font-display text-lg font-extrabold text-primary">
                    {r.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{reminderLabel(r)}</p>
                    <p className="text-xs text-muted-foreground">
                      {ownerName(r.dependent_id, dependents)}
                      {r.last_day && " · último dia do tratamento"}
                    </p>
                  </div>
                  {r.taken && (
                    <Badge tone="success">
                      <Check aria-hidden="true" /> Tomada
                    </Badge>
                  )}
                  <Button
                    variant={r.taken ? "ghost" : "default"}
                    size="sm"
                    onClick={() => toggle(r)}
                    aria-label={`${r.taken ? "Desfazer" : "Tomei"}: ${reminderLabel(r)} às ${r.time}`}
                  >
                    {r.taken ? "Desfazer" : "Tomei"}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {vaccines.length > 0 && (
          <Card className="p-5">
            <SectionHeader icon={Syringe} title="Próximas vacinas" />
            <ul className="divide-y">
              {vaccines.map((r) => (
                <li key={r.vaccine_id} className="flex items-center gap-4 py-3">
                  <IconTile icon={Syringe} tone="warning" size="sm" />
                  <p className="flex-1 font-semibold text-ink">
                    {reminderLabel(r)}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {ownerName(r.dependent_id, dependents)}
                    </span>
                  </p>
                  <span className="text-sm text-primary">{formatDate(r.date)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </QueryState>
  );
}
