import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { chatResponse, replyFrames, sseBody, sseResponse } from "@/mocks/assistant";
import { server } from "@/mocks/node";

import { ApiError, errorText, getJson, postJson, streamChat } from "../lib/chat";

function handlers() {
  return { onToken: vi.fn(), onReset: vi.fn(), onCard: vi.fn() };
}

/** Resposta SSE entregue em pedaços arbitrários, como a rede faz. */
function chunked(body: string, size: number) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < body.length; i += size)
        controller.enqueue(encoder.encode(body.slice(i, i + size)));
      controller.close();
    },
  });
  return new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } });
}

describe("streamChat", () => {
  it("repassa tokens e devolve a resposta final do done", async () => {
    const h = handlers();

    const result = await streamChat({}, h);

    expect(h.onToken.mock.calls.map(([text]) => text).join("")).toBe("Olá! Como posso ajudar?");
    expect(result.reply).toBe("Olá! Como posso ajudar?");
  });

  it("monta eventos quebrados entre pedaços e com quebras de linha CRLF", async () => {
    const body = sseBody(replyFrames("Resposta longa o bastante")).replace(/\n/g, "\r\n");
    server.use(http.post("/api/chat", () => chunked(body, 7)));
    const h = handlers();

    const result = await streamChat({}, h);

    expect(result.reply).toBe("Resposta longa o bastante");
    expect(h.onToken).toHaveBeenCalledTimes(2);
  });

  it("trata reset, card e ignora blocos inválidos", async () => {
    const card = { type: "consent", data: { message: "Posso consultar?" } } as const;
    const body =
      "event: token\ndata: {quebrado\n\n" +
      sseBody([
        ["reset", {}],
        ["card", card],
      ]) +
      // último bloco sem a linha em branco final
      `event: done\ndata: ${JSON.stringify(chatResponse("ok", [card]))}`;
    server.use(http.post("/api/chat", () => chunked(body, 1000)));
    const h = handlers();

    const result = await streamChat({}, h);

    expect(h.onReset).toHaveBeenCalledOnce();
    expect(h.onCard).toHaveBeenCalledWith(card);
    expect(result.cards).toEqual([card]);
  });

  it("une várias linhas data: do mesmo evento", async () => {
    // Pelo padrão SSE as linhas são unidas com "\n"; partindo o JSON entre dois campos, continua válido.
    const { reply, ...rest } = chatResponse("multi");
    const body = `event: done\ndata: {"reply":${JSON.stringify(reply)},\ndata: ${JSON.stringify(rest).slice(1)}\n\n`;
    server.use(http.post("/api/chat", () => chunked(body, 1000)));

    await expect(streamChat({}, handlers())).resolves.toMatchObject({ reply: "multi" });
  });

  it("lança ApiError 502 quando o backend manda evento de erro", async () => {
    server.use(http.post("/api/chat", () => sseResponse([["error", { error: "LLM fora do ar" }]])));

    await expect(streamChat({}, handlers())).rejects.toMatchObject({
      status: 502,
      message: "LLM fora do ar",
    });
  });

  it("lança ApiError 502 quando o stream termina sem done", async () => {
    server.use(http.post("/api/chat", () => sseResponse([["token", { text: "meia resp" }]])));

    await expect(streamChat({}, handlers())).rejects.toMatchObject({
      status: 502,
      message: "a resposta foi interrompida",
    });
  });

  it("usa a mensagem {error} do servidor quando a chamada falha", async () => {
    server.use(
      http.post("/api/chat", () =>
        HttpResponse.json({ error: "muitas requisições" }, { status: 429 }),
      ),
    );

    const error = await streamChat({}, handlers()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: "muitas requisições" });
  });
});

describe("getJson e postJson", () => {
  it("devolvem o JSON da resposta", async () => {
    await expect(getJson("/api/atendimento")).resolves.toHaveProperty("horario");
    await expect(postJson("/api/lead", {})).resolves.toEqual({ conversationId: "conv-1" });
  });

  it("usam mensagem genérica quando o corpo de erro não é JSON", async () => {
    server.use(http.get("/api/atendimento", () => new HttpResponse("oops", { status: 500 })));

    await expect(getJson("/api/atendimento")).rejects.toMatchObject({
      status: 500,
      message: "erro 500",
    });
  });

  it("propaga erro do POST", async () => {
    server.use(
      http.post("/api/lead", () => HttpResponse.json({ error: "inválido" }, { status: 422 })),
    );

    await expect(postJson("/api/lead", {})).rejects.toMatchObject({
      status: 422,
      message: "inválido",
    });
  });
});

describe("errorText", () => {
  it.each([
    [429, /muitas mensagens/],
    [503, /indisponível/],
    [504, /demorou demais/],
    [500, /Tive um problema/],
  ])("explica o status %i para o usuário", (status, text) => {
    expect(errorText(new ApiError(status, "x"))).toMatch(text);
  });

  it("trata erro desconhecido como genérico", () => {
    expect(errorText(new Error("rede"))).toMatch(/Tive um problema/);
  });
});
