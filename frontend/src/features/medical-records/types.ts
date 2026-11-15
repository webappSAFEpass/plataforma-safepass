// Tipos derivados do OpenAPI do backend (lib/api/schema.d.ts, gerado com `pnpm api:types`).
import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

export type MedicalDocument = Schemas["DocumentOut"];
export type DocumentType = MedicalDocument["type"];
export type DocumentPatch = Schemas["DocumentPatch"];
export type Extraction = Schemas["ExtractionOut"];
export type ExtractedMedication = Schemas["ExtractedMedicationOut"];
export type PrescriptionInput = Schemas["PrescriptionIn"];
export type Prescription = Schemas["PrescriptionOut"];

export interface DocumentFilters {
  type?: DocumentType;
  q?: string;
  dependent_id?: string;
  size?: number;
}

/** Corpo multipart de POST /documents (o OpenAPI descreve como form-data). */
export interface DocumentUpload {
  file: File;
  type: DocumentType;
  title: string;
  document_date: string | null;
  dependent_id: string | null;
}
