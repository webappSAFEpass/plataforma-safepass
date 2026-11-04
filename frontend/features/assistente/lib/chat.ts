import type { Card, ChatResponse } from "./contracts";

export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  /** Cards do assistente (prestadores, documentos, WhatsApp, consentimento) abaixo da bolha. */
  cards?: Card[];
  /** Bolha temporária "Digitando…". */
  typing?: boolean;
};

export function createId(prefix = "msg") {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Erro de uma chamada à API, com o status HTTP e a mensagem `{error}` do servidor. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiError(res: Response): Promise<ApiError> {
  let message = `erro ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.error === "string") message = body.error;
  } catch {
    // corpo não-JSON: fica a mensagem genérica
  }
  return new ApiError(res.status, message);
}

type StreamHandlers = {
  onToken: (text: string) => void;
  onReset: () => void;
  onCard: (card: Card) => void;
};

type SseEvent = { event: string; data: string };

/** Separa um bloco SSE em evento + dados (várias linhas `data:` são unidas com \n). */
function parseBlock(block: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

/**
 * POST /api/chat e leitura do SSE do backend: `token`, `reset`, `card`, `done`, `error`.
 * O texto final exibido deve ser sempre o `reply` do `done`.
 */
export async function streamChat(
  body: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw await apiError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handle = (sse: SseEvent): ChatResponse | undefined => {
    let payload: unknown;
    try {
      payload = JSON.parse(sse.data);
    } catch {
      return undefined; // bloco corrompido: ignora
    }
    const data = payload as Record<string, unknown>;
    if (sse.event === "token" && typeof data.text === "string") handlers.onToken(data.text);
    else if (sse.event === "reset") handlers.onReset();
    else if (sse.event === "card" && typeof data.type === "string") handlers.onCard(payload as Card);
    else if (sse.event === "done" && typeof data.reply === "string") return payload as ChatResponse;
    else if (sse.event === "error") {
      throw new ApiError(502, typeof data.error === "string" ? data.error : "falha na resposta");
    }
    return undefined;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n?/g, "\n");
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = parseBlock(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
        const result = block && handle(block);
        if (result) return result;
      }
      if (done) break;
    }
    // Último bloco sem a linha em branco final.
    const last = buffer.trim() ? parseBlock(buffer) : null;
    const result = last && handle(last);
    if (result) return result;
    throw new ApiError(502, "a resposta foi interrompida");
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

/** Texto para o usuário conforme o tipo de falha. */
export function errorText(error: unknown): string {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 429) return "Você enviou muitas mensagens seguidas. Aguarde um instante e tente de novo.";
  if (status === 503) return "O assistente está indisponível no momento. Você pode deixar um recado para o nosso atendimento.";
  if (status === 504) return "A resposta demorou demais. Tente perguntar de novo em instantes.";
  return "Tive um problema para responder agora. Você pode deixar um recado para o nosso atendimento.";
}
