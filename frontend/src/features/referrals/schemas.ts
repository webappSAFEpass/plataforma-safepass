import { z } from "zod";

export const referralSchema = z.object({
  professional_name: z.string().trim().min(2, "Informe o nome do profissional.").max(120),
  specialty: z.string().trim().max(120).optional(),
  contact: z.string().trim().max(160).optional(),
});

export type ReferralInput = z.infer<typeof referralSchema>;
