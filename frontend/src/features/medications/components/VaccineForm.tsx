"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useSaveVaccine } from "../hooks/useVaccines";
import { orNull, vaccineSchema, type VaccineFormValues } from "../schemas";
import type { Vaccine } from "../types";
import { todayISO } from "../utils";

import { OwnerSelect } from "./OwnerSelect";

export function VaccineForm({ vaccine, onDone }: { vaccine?: Vaccine; onDone: () => void }) {
  const save = useSaveVaccine();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VaccineFormValues>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: {
      name: vaccine?.name ?? "",
      dose: vaccine?.dose ?? "",
      applied_on: vaccine?.applied_on ?? todayISO(),
      next_dose_on: vaccine?.next_dose_on ?? "",
      dependent_id: vaccine?.dependent_id ?? "",
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        id: vaccine?.id,
        input: {
          name: v.name,
          dose: orNull(v.dose),
          applied_on: v.applied_on,
          next_dose_on: orNull(v.next_dose_on),
          dependent_id: orNull(v.dependent_id),
        },
      });
      toast.success(vaccine ? "Vacina atualizada" : "Vacina registrada");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <Field label="Vacina" error={errors.name?.message}>
        <Input placeholder="Ex.: Influenza" {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dose">
          <Input placeholder="Ex.: 1ª dose, reforço" {...register("dose")} />
        </Field>
        <Field label="De quem é">
          <OwnerSelect {...register("dependent_id")} />
        </Field>
        <Field label="Aplicada em" error={errors.applied_on?.message}>
          <Input type="date" {...register("applied_on")} />
        </Field>
        <Field label="Próxima dose (opcional)" error={errors.next_dose_on?.message}>
          <Input type="date" {...register("next_dose_on")} />
        </Field>
      </div>
      <Button type="submit" size="full" disabled={isSubmitting}>
        {vaccine ? "Salvar alterações" : "Registrar vacina"}
      </Button>
    </form>
  );
}
