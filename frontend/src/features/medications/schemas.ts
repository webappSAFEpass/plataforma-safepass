import { z } from "zod";

const TIME = /^\d{2}:\d{2}$/;

const optionalText = z.string().trim().max(120);

export const medicationSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o medicamento.").max(120),
    dose: optionalText,
    posology: optionalText,
    start_date: z.string().min(1, "Informe a data de início."),
    first_dose: z.string().regex(TIME, "Informe a hora da 1ª dose."),
    duration_days: z.string(),
    continuous: z.boolean(),
    dependent_id: z.string(),
  })
  .refine((v) => v.continuous || Number(v.duration_days) >= 1, {
    path: ["duration_days"],
    message: "Informe por quantos dias ou marque uso contínuo.",
  });

export type MedicationFormValues = z.infer<typeof medicationSchema>;

export const vaccineSchema = z
  .object({
    name: z.string().trim().min(1, "Informe a vacina.").max(120),
    dose: optionalText,
    applied_on: z.string().min(1, "Informe a data da aplicação."),
    next_dose_on: z.string(),
    dependent_id: z.string(),
  })
  .refine((v) => !v.next_dose_on || v.next_dose_on > v.applied_on, {
    path: ["next_dose_on"],
    message: "A próxima dose deve ser depois da aplicação.",
  });

export type VaccineFormValues = z.infer<typeof vaccineSchema>;

/** Campo vazio do formulário vira null na API. */
export const orNull = (value: string): string | null => value.trim() || null;
