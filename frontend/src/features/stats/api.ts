import { apiFetch } from "@/lib/api/client";
import type { PublicStats } from "@/features/stats/types";

export function fetchPublicStats(): Promise<PublicStats> {
  return apiFetch("/stats/public");
}
