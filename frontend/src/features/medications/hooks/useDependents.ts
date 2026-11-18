"use client";

import { useQuery } from "@tanstack/react-query";

import * as api from "../api";

export const dependentsQueryKey = ["dependents"] as const;

/** Dependentes ativos da conta (donos possíveis de documento, medicamento e vacina). */
export function useDependents() {
  return useQuery({
    queryKey: dependentsQueryKey,
    queryFn: api.listDependents,
    select: (page) => page.items.filter((d) => d.active),
    staleTime: 60_000,
  });
}
