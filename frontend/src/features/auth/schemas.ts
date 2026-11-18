import { z } from "zod";

const email = z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

const newPassword = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(128, "Use no máximo 128 caracteres.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "A senha precisa ter letras e números.");

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
  email,
  password: newPassword,
  account_type: z.enum(["user", "provider", "company"]),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
