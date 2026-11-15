"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "../api";
import type { VaccineInput } from "../types";

import { remindersQueryKey } from "./useReminders";

export const vaccinesQueryKey = ["vaccines"] as const;

export function useVaccines() {
  return useQuery({ queryKey: vaccinesQueryKey, queryFn: api.listVaccines });
}

function useInvalidateVaccines() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: vaccinesQueryKey }),
      queryClient.invalidateQueries({ queryKey: remindersQueryKey }),
    ]);
}

export function useSaveVaccine() {
  const invalidate = useInvalidateVaccines();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: VaccineInput }) =>
      id ? api.updateVaccine(id, input) : api.createVaccine(input),
    onSuccess: invalidate,
  });
}

export function useDeleteVaccine() {
  const invalidate = useInvalidateVaccines();
  return useMutation({ mutationFn: api.deleteVaccine, onSuccess: invalidate });
}
