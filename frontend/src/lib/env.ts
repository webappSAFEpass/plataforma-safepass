import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().default("/api/v1"),
});

// Só variáveis NEXT_PUBLIC_ podem ser lidas no navegador.
export const env = schema.parse({
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
});
