import { describe, expect, it } from "vitest";

import { medicationSchema, orNull, vaccineSchema } from "../schemas";

const medication = {
  name: "Losartana",
  dose: "",
  posology: "1x ao dia",
  start_date: "2026-11-15",
  first_dose: "08:00",
  duration_days: "",
  continuous: false,
  dependent_id: "",
};

describe("medicationSchema", () => {
  it("exige a duração quando não é uso contínuo", () => {
    const result = medicationSchema.safeParse(medication);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Informe por quantos dias ou marque uso contínuo.",
    );
  });

  it("aceita uso contínuo sem duração", () => {
    expect(medicationSchema.safeParse({ ...medication, continuous: true }).success).toBe(true);
  });

  it("recusa hora da 1ª dose fora do formato", () => {
    expect(
      medicationSchema.safeParse({ ...medication, continuous: true, first_dose: "8h" }).success,
    ).toBe(false);
  });
});

describe("vaccineSchema", () => {
  const vaccine = {
    name: "Influenza",
    dose: "",
    applied_on: "2026-11-15",
    next_dose_on: "",
    dependent_id: "",
  };

  it("recusa próxima dose antes da aplicação", () => {
    expect(vaccineSchema.safeParse({ ...vaccine, next_dose_on: "2026-11-01" }).success).toBe(false);
    expect(vaccineSchema.safeParse({ ...vaccine, next_dose_on: "2027-11-15" }).success).toBe(true);
  });
});

it("orNull troca texto vazio por null", () => {
  expect(orNull("  ")).toBeNull();
  expect(orNull(" 50 mg ")).toBe("50 mg");
});
