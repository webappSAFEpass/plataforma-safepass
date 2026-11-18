import type { Page } from "@/features/medications";
import { apiFetch, apiFetchBlob } from "@/lib/api/client";

import type {
  DocumentFilters,
  DocumentPatch,
  DocumentUpload,
  Extraction,
  MedicalDocument,
  Prescription,
  PrescriptionInput,
} from "./types";

export function listDocuments(filters: DocumentFilters = {}): Promise<Page<MedicalDocument>> {
  return apiFetch("/documents", { query: { ...filters } });
}

export function uploadDocument(doc: DocumentUpload): Promise<MedicalDocument> {
  const body = new FormData();
  body.append("file", doc.file);
  body.append("type", doc.type);
  body.append("title", doc.title);
  if (doc.document_date) body.append("document_date", doc.document_date);
  if (doc.dependent_id) body.append("dependent_id", doc.dependent_id);
  return apiFetch("/documents", { method: "POST", body });
}

export function updateDocument(id: string, patch: DocumentPatch): Promise<MedicalDocument> {
  return apiFetch(`/documents/${id}`, { method: "PATCH", body: patch });
}

export function deleteDocument(id: string): Promise<void> {
  return apiFetch(`/documents/${id}`, { method: "DELETE" });
}

export function fetchDocumentFile(id: string): Promise<Blob> {
  return apiFetchBlob(`/documents/${id}/file`);
}

export function extractPrescription(file: File): Promise<Extraction> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch("/prescriptions/extract", { method: "POST", body });
}

export function savePrescription(input: PrescriptionInput): Promise<Prescription> {
  return apiFetch("/prescriptions", { method: "POST", body: input });
}
