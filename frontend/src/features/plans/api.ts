import { apiFetch } from "@/lib/api/client";
import type { Plan } from "@/features/plans/types";

export function fetchPlans(): Promise<Plan[]> {
  return apiFetch("/plans");
}
