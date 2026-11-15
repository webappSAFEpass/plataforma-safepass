import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().default("/api/v1"),
  // "enabled" liga os handlers MSW no navegador (endpoints que ainda não existem no backend).
  NEXT_PUBLIC_API_MOCKING: z.enum(["enabled", "disabled"]).default("disabled"),
});

// Só variáveis NEXT_PUBLIC_ podem ser lidas no navegador.
export const env = schema.parse({
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
});
