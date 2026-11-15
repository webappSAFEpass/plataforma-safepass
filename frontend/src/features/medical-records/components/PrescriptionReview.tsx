"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { nextFullHour, OwnerSelect } from "@/features/medications";

import { useSavePrescription } from "../hooks/usePrescription";
import {
  prescriptionSchema,
  type PrescriptionFormValues,
  type PrescriptionItemValues,
} from "../schemas";
import type { ExtractedMedication, Extraction } from "../types";

import { PrescriptionItemFields } from "./PrescriptionItemFields";

export const MEDICATIONS_HREF = "/historico-medico/medicamentos";

function toItem(m?: ExtractedMedication): PrescriptionItemValues {
  const first = nextFullHour();
  return {
    name: m?.name ?? "",
    dose: m?.dose ?? "",
    posology: m?.posology ?? "",
    period: m?.period ?? "",
    duration_days: m?.duration_days ? String(m.duration_days) : "",
    continuous: false,
    start_date: first.date,
    first_dose: first.time,
    needs_review: m?.needs_review ?? false,
  };
}

const orNull = (v: string) => v.trim() || null;

/** Revisão da leitura (ou preenchimento manual, sem `extraction`) antes de salvar a receita. */
export function PrescriptionReview({
  extraction,
  onCancel,
}: {
  extraction?: Extraction;
  onCancel: () => void;
}) {
  const router = useRouter();
  const save = useSavePrescription();
  const read = extraction?.medications ?? [];
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      doctor: extraction?.doctor ?? "",
      prescription_date: extraction?.prescription_date ?? "",
      dependent_id: "",
      medications: read.length ? read.map(toItem) : [toItem()],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "medications" });
  const items = useWatch({ control, name: "medications" });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        ocr_reading_id: extraction?.ocr_reading_id ?? null,
        dependent_id: orNull(v.dependent_id),
        doctor: orNull(v.doctor),
        prescription_date: orNull(v.prescription_date),
        medications: v.medications.map((m) => ({
          name: m.name,
          dose: orNull(m.dose),
          posology: orNull(m.posology),
          start_date: m.start_date,
          first_dose: m.first_dose,
          duration_days: m.continuous ? null : Number(m.duration_days),
        })),
      });
      toast.success("Receita salva");
      router.push(MEDICATIONS_HREF);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a receita.");
    }
  });

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <h2 className="font-display text-2xl font-extrabold text-primary">
          {extraction?.medications.length ? "Revisar informações" : "Preencher receita"}
        </h2>
        {fields.map((f, index) => (
          <PrescriptionItemFields
            key={f.id}
            index={index}
            register={register}
            errors={errors}
            needsReview={f.needs_review}
            period={f.period}
            continuous={items[index]?.continuous ?? false}
            onRemove={fields.length > 1 ? () => remove(index) : undefined}
          />
        ))}
        <Button variant="outline" size="full" onClick={() => append(toItem())}>
          <Plus aria-hidden="true" /> Adicionar medicamento
        </Button>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Médico">
            <Input placeholder="Ex.: Dra. Marina Duarte" {...register("doctor")} />
          </Field>
          <Field label="Data da receita">
            <Input type="date" {...register("prescription_date")} />
          </Field>
        </div>
        <Field label="De quem é">
          <OwnerSelect selfLabel="Minha" {...register("dependent_id")} />
        </Field>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Confirmar e salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
