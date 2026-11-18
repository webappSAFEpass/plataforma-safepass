"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { meQueryKey } from "@/features/auth/hooks";
import { subscribe } from "@/features/subscriptions/api";

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}
