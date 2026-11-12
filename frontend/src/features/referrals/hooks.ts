"use client";

import { useMutation } from "@tanstack/react-query";

import { createReferral } from "@/features/referrals/api";

export function useCreateReferral() {
  return useMutation({ mutationFn: createReferral });
}
