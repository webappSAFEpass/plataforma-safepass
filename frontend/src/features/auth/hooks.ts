"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "@/features/auth/api";

export const meQueryKey = ["auth", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: api.fetchMe,
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.register,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      // Remove qualquer dado da sessão anterior antes de marcar o visitante como deslogado.
      queryClient.clear();
      queryClient.setQueryData(meQueryKey, null);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: api.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: api.resetPassword });
}
