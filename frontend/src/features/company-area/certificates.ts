import { MAX_CERTIFICATE_MB } from "./constants";
import type { Certificate } from "./types";

const BYTES_PER_MB = 1024 * 1024;

export class CertificateTooLargeError extends Error {
  constructor() {
    super(`O arquivo passa de ${MAX_CERTIFICATE_MB} MB.`);
    this.name = "CertificateTooLargeError";
  }
}

/** Coloca o arquivo enviado no topo da lista, em análise, ainda sem colaborador vinculado. */
export function addCertificate(list: Certificate[], file: File, now: Date): Certificate[] {
  if (file.size > MAX_CERTIFICATE_MB * BYTES_PER_MB) throw new CertificateTooLargeError();
  const certificate: Certificate = {
    fileName: file.name,
    employee: "A identificar",
    area: "—",
    receivedAt: now.toISOString().slice(0, 10),
    status: "review",
  };
  return [certificate, ...list];
}
