"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAdminDashboard,
  fetchAdminPlans,
  fetchAdminReferrals,
  listPlatformReviews,
  replyToReview,
  setReviewPublished,
  updateAdminPlan,
  updateAdminReferralStatus,
  type AdminPlanUpdate,
  type ListReviewsParams,
} from "@/features/admin/api";
import type { ReferralStatus } from "@/features/admin/types";

const reviewsKey = ["admin", "platform-reviews"] as const;
const dashboardKey = ["admin", "dashboard"] as const;
const plansKey = ["admin", "plans"] as const;
const referralsKey = ["admin", "referrals"] as const;

export function useAdminReviews(params: ListReviewsParams) {
  return useQuery({
    queryKey: [...reviewsKey, params],
    queryFn: () => listPlatformReviews(params),
    placeholderData: keepPreviousData,
  });
}

export function useReplyToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToReview(id, reply),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewsKey }),
  });
}

export function useSetReviewPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      setReviewPublished(id, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsKey });
      queryClient.invalidateQueries({ queryKey: ["platform-reviews", "featured"] });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useAdminDashboard() {
  return useQuery({ queryKey: dashboardKey, queryFn: fetchAdminDashboard, staleTime: 30_000 });
}

export function useAdminPlans() {
  return useQuery({ queryKey: plansKey, queryFn: fetchAdminPlans, staleTime: 30_000 });
}

export function useUpdateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, changes }: { code: string; changes: AdminPlanUpdate }) =>
      updateAdminPlan(code, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKey });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useAdminReferrals(page: number, size: number) {
  return useQuery({
    queryKey: [...referralsKey, page, size],
    queryFn: () => fetchAdminReferrals(page, size),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminReferralStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReferralStatus }) =>
      updateAdminReferralStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralsKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
