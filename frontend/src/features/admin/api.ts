import { apiFetch } from "@/lib/api/client";
import type {
  AdminDashboard,
  AdminPlan,
  AdminReferral,
  AdminReview,
  Page,
  ReferralStatus,
} from "@/features/admin/types";

export interface ListReviewsParams {
  rating?: number;
  page: number;
  size: number;
}

export function listPlatformReviews({ rating, page, size }: ListReviewsParams): Promise<Page<AdminReview>> {
  return apiFetch("/admin/platform-reviews", { query: { rating, page, size } });
}

export function replyToReview(id: string, reply: string): Promise<AdminReview> {
  return apiFetch(`/admin/platform-reviews/${id}/reply`, { method: "POST", body: { reply } });
}

export function setReviewPublished(id: string, isPublished: boolean): Promise<AdminReview> {
  return apiFetch(`/admin/platform-reviews/${id}`, { method: "PATCH", body: { is_published: isPublished } });
}

export function fetchAdminDashboard(): Promise<AdminDashboard> {
  return apiFetch("/admin/dashboard");
}

export interface AdminPlanUpdate {
  name: string;
  price_cents: number;
  max_dependents: number | null;
  monthly_review_limit: number | null;
  points_multiplier: number;
  highlighted: boolean;
  features: { label: string; included: boolean }[];
  is_active: boolean;
  sort_order: number;
}

export function fetchAdminPlans(): Promise<AdminPlan[]> {
  return apiFetch("/admin/plans");
}

export function updateAdminPlan(code: string, changes: AdminPlanUpdate): Promise<AdminPlan> {
  return apiFetch(`/admin/plans/${code}`, { method: "PATCH", body: changes });
}

export function fetchAdminReferrals(page: number, size: number): Promise<Page<AdminReferral>> {
  return apiFetch("/admin/referrals", { query: { page, size } });
}

export function updateAdminReferralStatus(
  id: string,
  status: ReferralStatus,
): Promise<AdminReferral> {
  return apiFetch(`/admin/referrals/${id}`, { method: "PATCH", body: { status } });
}
