import type { DocumentType, MedicalDocument } from "./types";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"];
export const DOCUMENT_FILE_TYPES = [...PHOTO_TYPES, "application/pdf"];

export const DOCUMENT_TYPES: { value: DocumentType; label: string; plural: string }[] = [
  { value: "prescription", label: "Receita", plural: "Receitas" },
  { value: "exam", label: "Exame", plural: "Exames" },
  { value: "consultation", label: "Consulta", plural: "Consultas" },
  { value: "vaccine", label: "Vacina", plural: "Vacinas" },
  { value: "certificate", label: "Atestado", plural: "Atestados" },
];

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

export function downloadName(doc: Pick<MedicalDocument, "title" | "mime_type">): string {
  return doc.title + (EXTENSIONS[doc.mime_type ?? ""] ?? "");
}

const REVOKE_DELAY_MS = 1000; // o Safari cancela o download se a URL for revogada na hora

/** O arquivo exige a sessão, então não dá para usar <a href> direto: baixa e salva. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
