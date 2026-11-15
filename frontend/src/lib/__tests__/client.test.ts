import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/node";

import { ApiError, apiFetch, apiFetchBlob } from "../api/client";

describe("apiFetch", () => {
  it("manda JSON com Content-Type e query sem os valores indefinidos", async () => {
    let seen: { type: string | null; url: string; body: unknown } | undefined;
    server.use(
      http.post("*/api/v1/eco", async ({ request }) => {
        seen = {
          type: request.headers.get("Content-Type"),
          url: request.url,
          body: await request.json(),
        };
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch("/eco", { method: "POST", body: { a: 1 }, query: { page: 2, q: undefined } });

    expect(seen?.type).toBe("application/json");
    expect(seen?.url).toMatch(/\/api\/v1\/eco\?page=2$/);
    expect(seen?.body).toEqual({ a: 1 });
  });

  it("não força Content-Type JSON em upload com FormData", async () => {
    let type: string | null = "não lido";
    server.use(
      http.post("*/api/v1/upload", ({ request }) => {
        type = request.headers.get("Content-Type");
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    await apiFetch("/upload", { method: "POST", body: new FormData() });

    expect(type).not.toBe("application/json");
  });

  it("traduz o envelope de erro do backend em ApiError", async () => {
    server.use(
      http.get("*/api/v1/nada", () =>
        HttpResponse.json(
          { error: { code: "not_found", message: "Não encontrado." } },
          { status: 404 },
        ),
      ),
    );

    await expect(apiFetch("/nada")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
      message: "Não encontrado.",
    });
  });

  it("usa mensagem genérica quando o corpo do erro não é JSON", async () => {
    server.use(http.get("*/api/v1/quebrado", () => new HttpResponse("oops", { status: 500 })));

    const error = await apiFetch("/quebrado").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Algo deu errado. Tente novamente.");
  });

  it("renova a sessão uma vez no 401 e repete a chamada", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/v1/privado", () =>
        ++calls === 1 ? new HttpResponse(null, { status: 401 }) : HttpResponse.json({ ok: true }),
      ),
      http.post("*/api/v1/auth/refresh", () => new HttpResponse(null, { status: 204 })),
    );

    await expect(apiFetch("/privado")).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("devolve undefined no 204", async () => {
    server.use(http.delete("*/api/v1/item", () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch("/item", { method: "DELETE" })).resolves.toBeUndefined();
  });
});

it("apiFetchBlob devolve o corpo do arquivo", async () => {
  server.use(
    http.get(
      "*/api/v1/arquivo",
      () => new HttpResponse("conteúdo", { headers: { "Content-Type": "application/pdf" } }),
    ),
  );

  const blob = await apiFetchBlob("/arquivo");

  expect(await blob.text()).toBe("conteúdo");
});
