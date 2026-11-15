"use client";

import type { ComponentProps } from "react";

import { Select } from "@/components/ui/select";

import { useDependents } from "../hooks/useDependents";

type OwnerSelectProps = ComponentProps<typeof Select> & { selfLabel?: string };

/** "De quem é": o próprio usuário (valor vazio) ou um dependente da conta. */
export function OwnerSelect({ selfLabel = "Eu", ...props }: OwnerSelectProps) {
  const { data: dependents = [] } = useDependents();
  return (
    <Select {...props}>
      <option value="">{selfLabel}</option>
      {dependents.map((d) => (
        <option key={d.id} value={d.id}>
          {d.bond ? `${d.name} (${d.bond})` : d.name}
        </option>
      ))}
    </Select>
  );
}
