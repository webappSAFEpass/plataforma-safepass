import { setupServer } from "msw/node";

import { assistantHandlers } from "./assistant";

/** Servidor MSW dos testes (Vitest). Cada teste pode sobrescrever com `server.use(...)`. */
export const server = setupServer(...assistantHandlers);
