import { apiFetch } from "@/lib/api/client";

import type {
  Dependent,
  Dose,
  Medication,
  MedicationInput,
  MedicationPatch,
  Page,
  Reminder,
  Vaccine,
  VaccineInput,
} from "./types";

/** O suficiente para listar tudo de uma conta numa tela (máximo do backend). */
export const LIST_SIZE = 100;

export function listDependents(): Promise<Page<Dependent>> {
  return apiFetch("/dependentes", { query: { size: LIST_SIZE } });
}

export function listMedications(query: { active?: boolean; size?: number } = {}) {
  return apiFetch<Page<Medication>>("/medications", { query: { size: LIST_SIZE, ...query } });
}

export function createMedication(input: MedicationInput): Promise<Medication> {
  return apiFetch("/medications", { method: "POST", body: input });
}

export function updateMedication(id: string, patch: MedicationPatch): Promise<Medication> {
  return apiFetch(`/medications/${id}`, { method: "PATCH", body: patch });
}

export function listVaccines(): Promise<Page<Vaccine>> {
  return apiFetch("/vaccines", { query: { size: LIST_SIZE } });
}

export function createVaccine(input: VaccineInput): Promise<Vaccine> {
  return apiFetch("/vaccines", { method: "POST", body: input });
}

export function updateVaccine(id: string, patch: Partial<VaccineInput>): Promise<Vaccine> {
  return apiFetch(`/vaccines/${id}`, { method: "PATCH", body: patch });
}

export function deleteVaccine(id: string): Promise<void> {
  return apiFetch(`/vaccines/${id}`, { method: "DELETE" });
}

/** Agenda de hoje (não é paginada). */
export function listReminders(): Promise<Reminder[]> {
  return apiFetch("/reminders");
}

/** "Tomei". `date` é o dia do horário avisado, não o de agora (dose das 23:00 marcada à 00:10). */
export function registerDose({ medication_id, date, time }: Dose): Promise<unknown> {
  return apiFetch(`/medications/${medication_id}/doses`, {
    method: "POST",
    body: { date, time },
  });
}

export function undoDose({ medication_id, date, time }: Dose): Promise<void> {
  return apiFetch(`/medications/${medication_id}/doses`, {
    method: "DELETE",
    query: { date, time },
  });
}
