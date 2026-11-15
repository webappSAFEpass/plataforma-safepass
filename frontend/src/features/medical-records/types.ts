// TEMPORÁRIO: espelha o contrato combinado com o backend do Squad 44 (/api/v1/documents e
// /api/v1/prescriptions). Quando o OpenAPI subir, trocar por tipos de lib/api/schema.d.ts.
import type { Medication } from "@/features/medications";

export type DocumentType = "prescription" | "exam" | "consultation" | "vaccine" | "certificate";

export interface MedicalDocument {
  id: string;
  dependent_id: string | null;
  type: DocumentType;
  title: string;
  document_date: string | null;
  mime_type: string | null;
  size: number | null;
  has_file: boolean;
  ocr_reading_id: string | null;
  shared_with_assistant: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentFilters {
  type?: DocumentType;
  q?: string;
  dependent_id?: string;
  size?: number;
}

export type DocumentPatch = Partial<
  Pick<
    MedicalDocument,
    "title" | "type" | "document_date" | "dependent_id" | "shared_with_assistant"
  >
>;

export interface DocumentUpload {
  file: File;
  type: DocumentType;
  title: string;
  document_date: string | null;
  dependent_id: string | null;
}

export interface ExtractedMedication {
  name: string;
  dose: string | null;
  posology: string | null;
  period: string | null;
  duration_days: number | null;
  needs_review: boolean;
}

export interface Extraction {
  ocr_reading_id: string;
  source: "gemini" | "tesseract";
  needs_review: boolean;
  notes: string | null;
  doctor: string | null;
  prescription_date: string | null;
  medications: ExtractedMedication[];
}

export interface PrescriptionInput {
  ocr_reading_id: string | null;
  dependent_id: string | null;
  doctor: string | null;
  prescription_date: string | null;
  medications: {
    name: string;
    dose: string | null;
    posology: string | null;
    start_date: string;
    duration_days: number | null;
    first_dose: string;
  }[];
}

export interface Prescription {
  id: string;
  ocr_reading_id: string | null;
  document_id: string;
  dependent_id: string | null;
  doctor: string | null;
  prescription_date: string | null;
  medications: Medication[];
  created_at: string;
  updated_at: string;
}
