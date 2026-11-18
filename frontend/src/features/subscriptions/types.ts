import type { Plan } from "@/features/plans/types";

// TEMPORÁRIO: espelha SubscriptionOut do backend (ver nota em plans/types.ts).
export interface Subscription {
  id: string;
  status: "pending" | "active" | "past_due" | "canceled";
  started_at: string;
  current_period_end: string | null;
  /** "simulated" enquanto o gateway real não estiver integrado. */
  gateway_provider: string | null;
  plan: Plan;
}
