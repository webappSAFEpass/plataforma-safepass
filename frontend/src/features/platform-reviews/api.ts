import { apiFetch } from "@/lib/api/client";
import type { FeedbackInput } from "@/features/platform-reviews/schemas";
import type { PublicReview } from "@/features/platform-reviews/types";

export function fetchFeaturedReviews(): Promise<PublicReview[]> {
  return apiFetch("/platform-reviews/featured");
}

export function createReview(input: FeedbackInput): Promise<PublicReview> {
  return apiFetch("/platform-reviews", {
    method: "POST",
    body: { ...input, comment: input.comment || undefined },
  });
}
