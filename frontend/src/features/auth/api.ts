import { ApiError, apiFetch } from "@/lib/api/client";
import type { ForgotPasswordInput, LoginInput, RegisterInput } from "@/features/auth/schemas";
import type { Me, User } from "@/features/auth/types";

export function login(input: LoginInput): Promise<{ user: User }> {
  return apiFetch("/auth/login", { method: "POST", body: input });
}

export function register(input: RegisterInput): Promise<{ user: User }> {
  return apiFetch("/auth/register", { method: "POST", body: input });
}

export function logout(): Promise<void> {
  return apiFetch("/auth/logout", { method: "POST" });
}

export function forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  return apiFetch("/auth/forgot-password", { method: "POST", body: input });
}

export function resetPassword(input: { token: string; new_password: string }): Promise<void> {
  return apiFetch("/auth/reset-password", { method: "POST", body: input });
}

/** Retorna null quando não há sessão (visitante), em vez de lançar erro. */
export async function fetchMe(): Promise<Me | null> {
  try {
    return await apiFetch<Me>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
