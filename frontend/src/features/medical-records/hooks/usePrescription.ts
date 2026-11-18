"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { medicationsQueryKey, remindersQueryKey } from "@/features/medications";

import * as api from "../api";

import { documentsQueryKey } from "./useDocuments";

export function useExtractPrescription() {
  return useMutation({ mutationFn: api.extractPrescription });
}

/** Salvar a receita cria o documento e um medicamento por item: as três listas mudam. */
export function useSavePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.savePrescription,
    onSuccess: () =>
      Promise.all(
        [documentsQueryKey, medicationsQueryKey, remindersQueryKey].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
