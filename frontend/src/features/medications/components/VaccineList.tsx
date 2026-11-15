"use client";

import { Plus, Syringe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconTile } from "@/components/ui/icon-tile";
import { formatDate } from "@/lib/utils";

import { useDependents } from "../hooks/useDependents";
import { useDeleteVaccine, useVaccines } from "../hooks/useVaccines";
import type { Vaccine } from "../types";
import { ownerName } from "../utils";

import { QueryState } from "./QueryState";
import { VaccineForm } from "./VaccineForm";

export function VaccineList() {
  const query = useVaccines();
  const { data: dependents = [] } = useDependents();
  const remove = useDeleteVaccine();
  const [editing, setEditing] = useState<Vaccine | "new" | null>(null);
  const vaccines = query.data?.items ?? [];

  const onDelete = (v: Vaccine) => {
    if (!window.confirm(`Excluir o registro da vacina ${v.name}?`)) return;
    remove.mutate(v.id, {
      onSuccess: () => toast.success("Vacina excluída"),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" /> Registrar vacina
        </Button>
      </div>

      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={vaccines.length === 0}
        onRetry={() => query.refetch()}
        empty="Nenhuma vacina registrada ainda."
      >
        <Card className="divide-y">
          {vaccines.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-4 p-4">
              <IconTile icon={Syringe} tone="brand" />
              <div className="min-w-48 flex-1">
                <p className="font-semibold text-ink">
                  {[v.name, v.dose].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ownerName(v.dependent_id, dependents)} · aplicada em {formatDate(v.applied_on)}
                </p>
              </div>
              {v.next_dose_on && (
                <Badge tone="warning">Próxima dose: {formatDate(v.next_dose_on)}</Badge>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(v)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </QueryState>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing === "new" ? "Registrar vacina" : "Editar vacina"}</DialogTitle>
          {editing && (
            <VaccineForm
              vaccine={editing === "new" ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
