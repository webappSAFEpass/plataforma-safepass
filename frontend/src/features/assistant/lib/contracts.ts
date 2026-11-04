// Contratos com o backend SAFEpass, gerados do openapi.json dele (api.gen.ts: `pnpm api:assistant-types`).
// Não edite tipos à mão aqui: mude o backend, rode `make openapi` lá e `pnpm api:assistant-types` aqui.
import type { components } from "./api.gen";

type Schemas = components["schemas"];

export type ChatResponse = Schemas["ChatResponse"];
export type Card = ChatResponse["cards"][number];
export type ChatDebug = Schemas["ChatDebug"];
export type Intent = ChatDebug["intent"];
export type Provider = Schemas["Provider"];
export type DocumentItem = Schemas["DocumentItem"];
export type PlanId = Schemas["Plan"]["id"];
export type ApiChatMessage = Schemas["ChatMessage"];
export type ConsentStatus = Schemas["ConsentStatus"];
export type AtendimentoInfo = Schemas["AtendimentoInfo"];
