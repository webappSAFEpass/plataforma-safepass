import { z } from "zod";

export const feedbackSchema = z.object({
  author_name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
  reviewer_profile: z.enum(["visitor", "user", "provider", "company"], {
    errorMap: () => ({ message: "Selecione seu perfil." }),
  }),
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comment: z.string().trim().max(1000, "Máximo de 1000 caracteres.").optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
