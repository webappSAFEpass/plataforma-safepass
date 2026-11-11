"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPublicStats } from "@/features/stats/api";

export function usePublicStats() {
  return useQuery({ queryKey: ["stats", "public"], queryFn: fetchPublicStats, staleTime: 5 * 60_000 });
}
