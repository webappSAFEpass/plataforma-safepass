import { z } from "zod";

import { DOCUMENT_FILE_TYPES, MAX_FILE_BYTES } from "./utils";

const documentType = z.enum(["prescription", "exam", "consultation", "vaccine", "certificate"]);

export const documentEditSchema = z.object({
  type: documentType,
  title: z.string().trim().min(1, "Informe o título.").max(160),
  document_date: z.string(),
  dependent_id: z.string(),
});

export type DocumentEditValues = z.infer<typeof documentEditSchema>;

export const documentUploadSchema = documentEditSchema.extend({
  file: z
    .instanceof(File, { message: "Escolha o arquivo." })
    .refine((f) => DOCUMENT_FILE_TYPES.includes(f.type), "Envie JPG, PNG ou PDF.")
    .refine((f) => f.size <= MAX_FILE_BYTES, "O arquivo passa de 10 MB."),
});

export type DocumentUploadValues = z.infer<typeof documentUploadSchema>;

const prescriptionItem = z
  .object({
    name: z.string().trim().min(1, "Informe o medicamento.").max(120),
    dose: z.string().trim().max(120),
    posology: z.string().trim().max(120),
    period: z.string(), // texto lido da receita, só para conferência
    duration_days: z.string(),
    continuous: z.boolean(),
    start_date: z.string().min(1, "Informe a data da 1ª dose."),
    first_dose: z.string().regex(/^\d{2}:\d{2}$/, "Informe a hora da 1ª dose."),
    needs_review: z.boolean(),
  })
  .refine((v) => v.continuous || Number(v.duration_days) >= 1, {
    path: ["duration_days"],
    message: "Informe por quantos dias ou marque uso contínuo.",
  });

export const prescriptionSchema = z.object({
  doctor: z.string().trim().max(160),
  prescription_date: z.string(),
  dependent_id: z.string(),
  medications: z.array(prescriptionItem).min(1, "Adicione ao menos um medicamento."),
});

export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;
export type PrescriptionItemValues = PrescriptionFormValues["medications"][number];
