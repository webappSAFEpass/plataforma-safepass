import { z } from "zod";

const MAX_CODE_LENGTH = 20;

export const DISCOUNT_TYPES = { percent: "Percentual", fixed: "Valor fixo" } as const;
export type DiscountType = keyof typeof DISCOUNT_TYPES;

const positiveInteger = (field: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `Informe ${field} com números inteiros.`)
    .transform(Number)
    .refine(
      (value) => value > 0,
      `${field[0]!.toUpperCase()}${field.slice(1)} precisa ser maior que zero.`,
    );

export const couponFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Informe o código do benefício.")
    .max(MAX_CODE_LENGTH, `Use até ${MAX_CODE_LENGTH} caracteres.`)
    .regex(/^[A-Za-z0-9]+$/, "Use apenas letras e números."),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: positiveInteger("o valor"),
  service: z.string().trim().min(1, "Informe o serviço aplicável."),
  validUntil: z.iso.date("Informe uma data válida."),
  limit: positiveInteger("o limite"),
});
export type CouponFormInput = z.input<typeof couponFormSchema>;
export type CouponFormValues = z.output<typeof couponFormSchema>;

export const couponCodeSchema = z.object({
  code: z.string().trim().min(1, "Digite o código apresentado pelo paciente."),
});
export type CouponCodeValues = z.infer<typeof couponCodeSchema>;

export const reviewReplySchema = z.object({
  reply: z.string().trim().min(1, "Escreva uma resposta antes de enviar."),
});
export type ReviewReplyValues = z.infer<typeof reviewReplySchema>;

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(1, "Informe o nome de exibição."),
  specialty: z.string().trim().min(1, "Informe a especialidade."),
  about: z.string().trim().max(600, "Use até 600 caracteres."),
  clinic: z.string().trim().min(1, "Informe a clínica ou consultório."),
  registry: z.string().trim().min(1, "Informe o registro profissional."),
  phone: z.string().trim().min(1, "Informe um telefone."),
  email: z.email("Informe um e-mail válido."),
  address: z.string().trim(),
  website: z.string().trim(),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
