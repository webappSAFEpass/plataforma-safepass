import { setupServer } from "msw/node";

import { assistantHandlers } from "./assistant";
import { dependentsHandlers, medicalRecordsHandlers } from "./medical-records";

/** Servidor MSW dos testes (Vitest). Cada teste pode sobrescrever com `server.use(...)`. */
export const server = setupServer(
  ...assistantHandlers,
  ...medicalRecordsHandlers,
  ...dependentsHandlers,
);
