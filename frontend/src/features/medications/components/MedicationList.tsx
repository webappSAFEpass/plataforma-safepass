"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { useDependents } from "../hooks/useDependents";
import { useMedications, useUpdateMedication } from "../hooks/useMedications";
import type { Medication } from "../types";
import { ownerName, todayISO } from "../utils";

import { MedicationCard } from "./MedicationCard";
import { MedicationForm } from "./MedicationForm";
import { QueryState } from "./QueryState";

/** Tela de medicamentos: lista, cadastro/edição e encerrar/reabrir (pausar = encerrar e reabrir). */
export function MedicationList() {
  const query = useMedications();
  const { data: dependents = [] } = useDependents();
  const update = useUpdateMedication();
  const [editing, setEditing] = useState<Medication | "new" | null>(null);
  const medications = query.data?.items ?? [];

  const toggleEnded = (med: Medication) =>
    update.mutate(
      { id: med.id, patch: { ended_on: med.ended_on ? null : todayISO() } },
      { onError: (error) => toast.error(error.message) },
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {medications.filter((m) => m.active).length} medicamentos ativos
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" /> Novo medicamento
        </Button>
      </div>

      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={medications.length === 0}
        onRetry={() => query.refetch()}
        empty="Nenhum medicamento ainda. Cadastre aqui ou envie uma receita em Documentos."
      >
        <div className="space-y-3">
          {medications.map((med) => (
            <MedicationCard
              key={med.id}
              medication={med}
              owner={ownerName(med.dependent_id, dependents)}
              onEdit={() => setEditing(med)}
              onToggleEnded={() => toggleEnded(med)}
            />
          ))}
        </div>
      </QueryState>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing === "new" ? "Novo medicamento" : "Editar medicamento"}</DialogTitle>
          <DialogDescription>Os horários do dia contam a partir da 1ª dose.</DialogDescription>
          {editing && (
            <MedicationForm
              medication={editing === "new" ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
