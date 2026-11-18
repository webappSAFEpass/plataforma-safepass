// Tipos derivados do OpenAPI do backend (lib/api/schema.d.ts, gerado com `pnpm api:types`).
import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

/** Envelope das listas paginadas do backend: {items, total, page, size}. */
export type Page<T> = { items: T[]; total: number; page: number; size: number };

export type Dependent = Schemas["DependentOut"];
export type Medication = Schemas["MedicationOut"];
export type MedicationInput = Schemas["MedicationIn"];
export type MedicationPatch = Schemas["MedicationPatch"];
export type Vaccine = Schemas["VaccineOut"];
export type VaccineInput = Schemas["VaccineIn"];
export type VaccinePatch = Schemas["VaccinePatch"];
export type Reminder = Schemas["ReminderOut"];
export type Dose = Schemas["DoseIn"] & { medication_id: string };
