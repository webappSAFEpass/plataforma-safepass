// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { replyFrames, sseResponse } from "@/mocks/assistant";
import { server } from "@/mocks/node";

import { atendimentoGET, chatPOST, consentPOST, leadPOST, recadoPOST } from "../server/handlers";

const BACKEND = "http://backend.test/v1";
const SITE = "localhost:3000";
let ipCounter = 0;

/** Requisição do próprio site; cada teste usa um IP novo para não esbarrar no rate limit. */
function siteRequest(path: string, body?: unknown, headers: Record<string, string> = {}) {
  ipCounter += 1;
  return new Request(`http://${SITE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      host: SITE,
      origin: `http://${SITE}`,
      "x-forwarded-for": `10.0.0.${ipCounter}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("BACKEND_API_URL", `${BACKEND}/`);
  vi.stubEnv("BACKEND_API_TOKEN", "segredo");
  vi.stubEnv("SESSION_USER_ID", "89");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("chatPOST", () => {
  it("repassa o SSE do backend com o usuário da sessão e o token", async () => {
    let sent: { auth: string | null; body: unknown } | undefined;
    server.use(
      http.post(`${BACKEND}/chat/stream`, async ({ request }) => {
        sent = { auth: request.headers.get("authorization"), body: await request.json() };
        return sseResponse(replyFrames("Oi"));
      }),
    );

    const res = await chatPOST(
      siteRequest("/api/chat", {
        conversationId: "c1",
        messages: [{ role: "user", content: "oi" }],
        nome: "ignorado",
      }),
    );

    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(await res.text()).toContain('"reply":"Oi"');
    expect(sent).toEqual({
      auth: "Bearer segredo",
      body: {
        userId: "89",
        conversationId: "c1",
        messages: [{ role: "user", content: "oi" }],
        retry: false,
        simulateAfterHours: false,
        simulateWithinHours: false,
      },
    });
  });

  it("devolve o erro do backend com o mesmo status", async () => {
    server.use(
      http.post(`${BACKEND}/chat/stream`, () =>
        HttpResponse.json({ error: "limite" }, { status: 429 }),
      ),
    );

    const res = await chatPOST(siteRequest("/api/chat", { conversationId: "c1" }));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "limite" });
  });

  it("responde 502 quando o backend está fora", async () => {
    server.use(http.post(`${BACKEND}/chat/stream`, () => HttpResponse.error()));

    const res = await chatPOST(siteRequest("/api/chat", { conversationId: "c1" }));

    expect(res.status).toBe(502);
  });

  it("responde 502 quando o backend não está configurado", async () => {
    vi.stubEnv("BACKEND_API_TOKEN", "");

    const res = await chatPOST(siteRequest("/api/chat", { conversationId: "c1" }));

    expect(res.status).toBe(502);
  });

  it("bloqueia chamadas de outro site", async () => {
    const res = await chatPOST(siteRequest("/api/chat", {}, { origin: "https://evil.example" }));

    expect(res.status).toBe(403);
  });

  it("bloqueia origem malformada", async () => {
    const res = await chatPOST(siteRequest("/api/chat", {}, { origin: "não é url" }));

    expect(res.status).toBe(403);
  });

  it("recusa corpo que não é JSON", async () => {
    const res = await chatPOST(siteRequest("/api/chat", {}, { "content-type": "text/plain" }));

    expect(res.status).toBe(400);
  });

  it("recusa JSON que não é objeto", async () => {
    const res = await chatPOST(siteRequest("/api/chat", [1, 2]));

    expect(res.status).toBe(400);
  });

  it("não usa o usuário compartilhado em produção sem autorização explícita", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await chatPOST(siteRequest("/api/chat", { conversationId: "c1" }));

    expect(res.status).toBe(503);
  });
});

describe("rate limit", () => {
  it("responde 429 depois do limite de leads por IP", async () => {
    server.use(http.post(`${BACKEND}/leads`, () => HttpResponse.json({ conversationId: "c" })));
    const fromSameIp = () =>
      siteRequest("/api/lead", { nome: "A" }, { "x-forwarded-for": "192.168.0.99" });

    const statuses = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await leadPOST(fromSameIp())).status);

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

describe("leadPOST, recadoPOST, consentPOST, atendimentoGET", () => {
  it("abre o lead repassando só os campos esperados", async () => {
    let body: unknown;
    server.use(
      http.post(`${BACKEND}/leads`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ conversationId: "c9" }, { status: 201 });
      }),
    );

    const res = await leadPOST(
      siteRequest("/api/lead", { nome: "Ana", telefone: "61999990000", mensagem: "oi", extra: 1 }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ conversationId: "c9" });
    expect(body).toEqual({ userId: "89", nome: "Ana", telefone: "61999990000", mensagem: "oi" });
  });

  it("envia o recado e o consentimento", async () => {
    server.use(
      http.post(`${BACKEND}/recados`, () => HttpResponse.json({ ok: true })),
      http.post(`${BACKEND}/consent`, async ({ request }) =>
        HttpResponse.json(await request.json()),
      ),
    );

    const recado = await recadoPOST(
      siteRequest("/api/recado", { conversationId: "c1", mensagem: "Me liguem" }),
    );
    const consent = await consentPOST(siteRequest("/api/consent", { action: "grant" }));

    expect(recado.status).toBe(200);
    expect(await consent.json()).toEqual({ userId: "89", action: "grant" });
  });

  it("lê o horário do atendimento", async () => {
    server.use(
      http.get(`${BACKEND}/atendimento`, () => HttpResponse.json({ horario: "8h às 18h" })),
    );

    const res = await atendimentoGET(siteRequest("/api/atendimento"));

    expect(await res.json()).toEqual({ horario: "8h às 18h" });
  });

  it("responde 502 quando o backend cai no meio do repasse", async () => {
    server.use(http.get(`${BACKEND}/atendimento`, () => HttpResponse.error()));

    const res = await atendimentoGET(siteRequest("/api/atendimento"));

    expect(res.status).toBe(502);
  });

  it.each([
    ["lead", leadPOST],
    ["recado", recadoPOST],
    ["consent", consentPOST],
  ])("%s recusa corpo inválido e sessão ausente", async (name, handler) => {
    expect(
      (await handler(siteRequest(`/api/${name}`, {}, { "content-type": "text/plain" }))).status,
    ).toBe(400);
    vi.stubEnv("NODE_ENV", "production");
    expect((await handler(siteRequest(`/api/${name}`, {}))).status).toBe(503);
  });
});
