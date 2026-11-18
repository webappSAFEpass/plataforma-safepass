"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { createReview, fetchFeaturedReviews } from "@/features/platform-reviews/api";

export function useFeaturedReviews() {
  return useQuery({
    queryKey: ["platform-reviews", "featured"],
    queryFn: fetchFeaturedReviews,
    staleTime: 5 * 60_000,
  });
}

export function useCreateReview() {
  return useMutation({ mutationFn: createReview });
}
