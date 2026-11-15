import { setupWorker } from "msw/browser";

import { medicalRecordsHandlers } from "./medical-records";

/**
 * Worker do navegador para `pnpm dev` sem o backend do histórico médico
 * (NEXT_PUBLIC_API_MOCKING=enabled). Só intercepta as rotas do Squad 44; o resto (login,
 * /dependentes...) segue para a API real.
 */
const worker = setupWorker(...medicalRecordsHandlers);

let started: Promise<unknown> | null = null;

/** Liga uma vez só: o StrictMode do dev roda o efeito duas vezes. */
export function startWorker(): Promise<unknown> {
  started ??= worker.start({ onUnhandledFrame: "bypass" });
  return started;
}
