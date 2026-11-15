"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { PrescriptionFormValues } from "../schemas";

type PrescriptionItemFieldsProps = {
  index: number;
  register: UseFormRegister<PrescriptionFormValues>;
  errors: FieldErrors<PrescriptionFormValues>;
  needsReview: boolean;
  period: string;
  continuous: boolean;
  onRemove?: () => void;
};

/** Um medicamento da receita: dados lidos + quando começa a tomar e por quantos dias. */
export function PrescriptionItemFields({
  index,
  register,
  errors,
  needsReview,
  period,
  continuous,
  onRemove,
}: PrescriptionItemFieldsProps) {
  const itemErrors = errors.medications?.[index];
  const field = (
    name: "name" | "dose" | "posology" | "duration_days" | "start_date" | "first_dose",
  ) => register(`medications.${index}.${name}`);

  return (
    <fieldset
      className={cn(
        "space-y-4 rounded-2xl border p-4",
        needsReview && "border-warning bg-warning-soft/40",
      )}
    >
      <div className="flex items-center justify-between">
        <legend className="font-semibold text-primary">Medicamento {index + 1}</legend>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remover
          </Button>
        )}
      </div>
      {needsReview && (
        <p className="text-xs font-semibold text-warning">Confira este medicamento com a foto.</p>
      )}
      <Field label="Medicamento" error={itemErrors?.name?.message}>
        <Input placeholder="Ex.: Amoxicilina" {...field("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dosagem">
          <Input placeholder="Ex.: 500 mg" {...field("dose")} />
        </Field>
        <Field label="Posologia">
          <Input placeholder="Ex.: 8/8h" {...field("posology")} />
        </Field>
        <Field label="Por quantos dias?" error={itemErrors?.duration_days?.message}>
          <Input type="number" min={1} disabled={continuous} {...field("duration_days")} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register(`medications.${index}.continuous`)}
          />
          Uso contínuo (avisa até você encerrar)
        </label>
        <Field label="Data da 1ª dose" error={itemErrors?.start_date?.message}>
          <Input type="date" {...field("start_date")} />
        </Field>
        <Field label="Hora da 1ª dose" error={itemErrors?.first_dose?.message}>
          <Input type="time" {...field("first_dose")} />
        </Field>
      </div>
      {period && <p className="text-xs text-muted-foreground">Na receita: {period}</p>}
    </fieldset>
  );
}
