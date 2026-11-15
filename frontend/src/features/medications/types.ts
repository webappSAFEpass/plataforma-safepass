// TEMPORÁRIO: espelha o contrato combinado com o backend do Squad 44 (rotas /api/v1 de
// medicamentos, vacinas, lembretes e doses). Quando o OpenAPI subir, trocar por tipos derivados
// de lib/api/schema.d.ts (`pnpm api:types`).

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/** Só o que o histórico médico usa de /api/v1/dependentes (módulo dependents do PR #6). */
export interface Dependent {
  id: string;
  type: "person" | "pet";
  name: string;
  bond: string | null;
  active: boolean;
}

export interface Medication {
  id: string;
  source: "manual" | "prescription";
  prescription_id: string | null;
  dependent_id: string | null;
  name: string;
  dose: string | null;
  posology: string | null;
  start_date: string; // AAAA-MM-DD
  duration_days: number | null; // null = uso contínuo
  first_dose: string; // HH:MM
  ended_on: string | null;
  schedule: string[]; // horários do dia, HH:MM
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationInput {
  name: string;
  dose?: string | null;
  posology?: string | null;
  start_date?: string;
  duration_days?: number | null;
  first_dose?: string;
  dependent_id?: string | null;
}

export type MedicationPatch = Partial<MedicationInput> & { ended_on?: string | null };

export interface Vaccine {
  id: string;
  dependent_id: string | null;
  name: string;
  dose: string | null;
  applied_on: string;
  next_dose_on: string | null;
  document_id: string | null;
  shared_with_assistant: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaccineInput {
  name: string;
  dose?: string | null;
  applied_on: string;
  next_dose_on?: string | null;
  dependent_id?: string | null;
}

export interface Reminder {
  kind: "medication" | "vaccine";
  medication_id: string | null;
  vaccine_id: string | null;
  name: string;
  dose: string | null;
  dependent_id: string | null;
  date: string; // hoje (medicamento) ou próxima dose (vacina)
  time: string | null; // HH:MM; null em vacina
  taken: boolean;
  last_day: boolean;
}

export interface Dose {
  medication_id: string;
  date: string;
  time: string;
}
