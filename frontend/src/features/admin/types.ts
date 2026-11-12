import type { PublicReview } from "@/features/platform-reviews/types";

// TEMPORÁRIO: espelha os schemas admin do backend (ver nota em plans/types.ts).
export interface AdminReview extends PublicReview {
  is_published: boolean;
  admin_reply: string | null;
  replied_at: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface AdminDashboard {
  active_users: number;
  providers: number;
  companies: number;
  active_subscriptions: number;
  total_reviews: number;
  pending_reviews: number;
  total_referrals: number;
  new_referrals: number;
}

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  tier: number;
  max_dependents: number | null;
  monthly_review_limit: number | null;
  points_multiplier: number;
  highlighted: boolean;
  features: { label: string; included: boolean }[];
  sort_order: number;
  is_active: boolean;
}

export type ReferralStatus = "new" | "contacted" | "registered" | "rejected";

export interface AdminReferral {
  id: string;
  professional_name: string;
  specialty: string | null;
  contact: string | null;
  status: ReferralStatus;
  created_at: string;
}
