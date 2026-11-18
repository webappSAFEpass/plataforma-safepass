import { apiFetch } from "@/lib/api/client";
import type { Subscription } from "@/features/subscriptions/types";

export interface SubscribeInput {
  plan_code: string;
  accept_terms: boolean;
}

export function subscribe(input: SubscribeInput): Promise<Subscription> {
  return apiFetch("/subscriptions", { method: "POST", body: input });
}
