"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "../api";
import type { Dose } from "../types";

export const remindersQueryKey = ["reminders"] as const;

/** Agenda de hoje. `refetchInterval` mantém a lista viva (receita nova, virada do dia). */
export function useReminders(refetchInterval?: number) {
  return useQuery({ queryKey: remindersQueryKey, queryFn: api.listReminders, refetchInterval });
}

export function useDose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dose, taken }: { dose: Dose; taken: boolean }) =>
      taken ? api.registerDose(dose) : api.undoDose(dose),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersQueryKey }),
  });
}
