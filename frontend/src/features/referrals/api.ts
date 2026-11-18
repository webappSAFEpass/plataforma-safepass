import { apiFetch } from "@/lib/api/client";
import type { ReferralInput } from "@/features/referrals/schemas";

export function createReferral(input: ReferralInput): Promise<{ id: string }> {
  return apiFetch("/referrals", {
    method: "POST",
    body: {
      professional_name: input.professional_name,
      specialty: input.specialty || undefined,
      contact: input.contact || undefined,
    },
  });
}
