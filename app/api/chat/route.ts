import { backendFetch, badRequest, noSession, readJson, sessionUserId } from "@/lib/backend.server";
import { protect } from "@/lib/protect.server";

// Streaming precisa do runtime Node e nunca pode ser pré-renderizado ou cacheado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Proxy do SSE do backend: token, reset, card, done, error.
export async function POST(request: Request) {
  const blocked = protect(request, "chat");
  if (blocked) return blocked;
  const userId = sessionUserId();
  if (!userId) return noSession();
  const body = await readJson(request);
  if (!body) return badRequest();
  const { conversationId, messages, retry, simulateAfterHours } = body;
  let res: Response;
  try {
    // O nome do lead não é repassado: o backend usa o que foi gravado na criação do lead.
    // request.signal: se o navegador desistir, a geração no backend é cancelada também.
    res = await backendFetch(
      "/chat/stream",
      { userId, conversationId, messages, retry: Boolean(retry), simulateAfterHours: Boolean(simulateAfterHours) },
      request.signal,
    );
  } catch {
    return Response.json({ error: "backend indisponível" }, { status: 502 });
  }
  if (!res.ok || !res.body) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
