import type { Subscription } from "@/features/subscriptions/types";

// TEMPORÁRIO: espelha os schemas do módulo auth do backend (ver nota em plans/types.ts).
export type Role = "user" | "dependent" | "provider" | "company" | "admin";
export type AccountType = "user" | "provider" | "company";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export interface Me {
  user: User;
  subscription: Subscription | null;
}
