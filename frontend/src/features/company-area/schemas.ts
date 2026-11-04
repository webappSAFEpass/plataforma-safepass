import { z } from "zod";

export const employeeInviteSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do colaborador."),
  email: z.email("Informe um e-mail corporativo válido."),
  area: z.string().trim().min(1, "Informe a área."),
});
export type EmployeeInviteValues = z.infer<typeof employeeInviteSchema>;
