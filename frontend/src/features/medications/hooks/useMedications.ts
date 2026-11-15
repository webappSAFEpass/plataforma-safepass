"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "../api";
import type { MedicationInput, MedicationPatch } from "../types";

import { remindersQueryKey } from "./useReminders";

export const medicationsQueryKey = ["medications"] as const;

export function useMedications(query: { active?: boolean } = {}) {
  return useQuery({
    queryKey: [...medicationsQueryKey, query],
    queryFn: () => api.listMedications(query),
  });
}

/** Medicamento mudou: a lista e a agenda do dia (lembretes) precisam ser buscadas de novo. */
function useInvalidateMedications() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: medicationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: remindersQueryKey }),
    ]);
}

export function useCreateMedication() {
  const invalidate = useInvalidateMedications();
  return useMutation({
    mutationFn: (input: MedicationInput) => api.createMedication(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMedication() {
  const invalidate = useInvalidateMedications();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MedicationPatch }) =>
      api.updateMedication(id, patch),
    onSuccess: invalidate,
  });
}
