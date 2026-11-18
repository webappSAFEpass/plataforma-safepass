import type { Role } from "@/features/auth/types";

/** Para onde ir logo depois de entrar. */
export function homePathFor(role: Role): string {
  return role === "admin" ? "/admin" : "/painel";
}
