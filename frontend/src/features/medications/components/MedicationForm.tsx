"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useCreateMedication, useUpdateMedication } from "../hooks/useMedications";
import { medicationSchema, orNull, type MedicationFormValues } from "../schemas";
import type { Medication } from "../types";
import { todayISO } from "../utils";

import { OwnerSelect } from "./OwnerSelect";

const DEFAULT_FIRST_DOSE = "08:00";

function defaults(med?: Medication): MedicationFormValues {
  return {
    name: med?.name ?? "",
    dose: med?.dose ?? "",
    posology: med?.posology ?? "",
    start_date: med?.start_date ?? todayISO(),
    first_dose: med?.first_dose ?? DEFAULT_FIRST_DOSE,
    duration_days: med?.duration_days ? String(med.duration_days) : "",
    continuous: med ? med.duration_days === null : false,
    dependent_id: med?.dependent_id ?? "",
  };
}

/** Cadastro do medicamento manual; com `medication`, edita (inclusive o que veio de receita). */
export function MedicationForm({
  medication,
  onDone,
}: {
  medication?: Medication;
  onDone: () => void;
}) {
  const create = useCreateMedication();
  const update = useUpdateMedication();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: defaults(medication),
  });
  const continuous = useWatch({ control, name: "continuous" });

  const onSubmit = handleSubmit(async (v) => {
    const input = {
      name: v.name,
      dose: orNull(v.dose),
      posology: orNull(v.posology),
      start_date: v.start_date,
      first_dose: v.first_dose,
      duration_days: v.continuous ? null : Number(v.duration_days),
      dependent_id: orNull(v.dependent_id),
    };
    try {
      if (medication) await update.mutateAsync({ id: medication.id, patch: input });
      else await create.mutateAsync(input);
      toast.success(medication ? "Medicamento atualizado" : "Medicamento cadastrado");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <Field label="Medicamento" error={errors.name?.message}>
        <Input placeholder="Ex.: Losartana" {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dosagem">
          <Input placeholder="Ex.: 50 mg" {...register("dose")} />
        </Field>
        <Field label="Posologia">
          <Input placeholder="Ex.: 8/8h, 2x ao dia" {...register("posology")} />
        </Field>
        <Field label="Início" error={errors.start_date?.message}>
          <Input type="date" {...register("start_date")} />
        </Field>
        <Field label="Hora da 1ª dose" error={errors.first_dose?.message}>
          <Input type="time" {...register("first_dose")} />
        </Field>
        <Field label="Por quantos dias?" error={errors.duration_days?.message}>
          <Input type="number" min={1} disabled={continuous} {...register("duration_days")} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink">
          <input type="checkbox" className="size-4 accent-primary" {...register("continuous")} />
          Uso contínuo
        </label>
      </div>
      <Field label="De quem é">
        <OwnerSelect {...register("dependent_id")} />
      </Field>
      <Button type="submit" size="full" disabled={isSubmitting}>
        {medication ? "Salvar alterações" : "Salvar medicamento"}
      </Button>
    </form>
  );
}
