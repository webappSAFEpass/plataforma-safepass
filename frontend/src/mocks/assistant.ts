// Handlers MSW das rotas /api/* do assistente (o que o navegador chama). Seguem os contratos
// gerados do backend (features/assistant/lib/api.gen.ts).
import { http, HttpResponse } from "msw";

import type { AtendimentoInfo, Card, ChatResponse } from "@/features/assistant/lib/contracts";

export const CONVERSATION_ID = "conv-1";

export const atendimento: AtendimentoInfo = {
  horario: "segunda a sexta, das 8h às 18h",
  mensagemForaDoHorario: "Nosso atendimento é de segunda a sexta, das 8h às 18h. Deixe seu recado.",
};

export function chatResponse(reply: string, cards: Card[] = []): ChatResponse {
  return { reply, cards, debug: { intent: "conversa_geral", toolCalls: [], latencyMs: 1 } };
}

type SseFrame = [event: string, data: unknown];

/** Corpo SSE no formato do backend: `event: x\ndata: {json}\n\n`. */
export function sseBody(frames: SseFrame[]): string {
  return frames
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join("");
}

export function sseResponse(frames: SseFrame[]): HttpResponse<string> {
  return new HttpResponse(sseBody(frames), {
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  });
}

/** Resposta padrão do chat: dois tokens e o `done` com o texto final. */
export function replyFrames(reply: string, cards: Card[] = []): SseFrame[] {
  const half = Math.ceil(reply.length / 2);
  return [
    ["token", { text: reply.slice(0, half) }],
    ["token", { text: reply.slice(half) }],
    ["done", chatResponse(reply, cards)],
  ];
}

export const assistantHandlers = [
  http.post("/api/lead", () => HttpResponse.json({ conversationId: CONVERSATION_ID })),
  http.get("/api/atendimento", () => HttpResponse.json(atendimento)),
  http.post("/api/chat", () => sseResponse(replyFrames("Olá! Como posso ajudar?"))),
  http.post("/api/consent", () =>
    HttpResponse.json({ granted: true, grantedAt: "2026-11-04T12:00:00Z" }),
  ),
  http.post("/api/recado", () => HttpResponse.json({ ok: true })),
];
