// Handlers das rotas /api/* do assistente. Cada app/api/<rota>/route.ts só reexporta daqui,
// então levar o chat para outro projeto Next é copiar esta pasta e criar esses arquivos de rota.
import "server-only";
import {
  backendFetch,
  badRequest,
  forwardJson,
  noSession,
  readJson,
  sessionUserId,
} from "./backend";
import { protect } from "./protect";

/** POST /api/chat — proxy do SSE do backend: token, reset, card, done, error. */
export async function chatPOST(request: Request): Promise<Response> {
  const blocked = protect(request, "chat");
  if (blocked) return blocked;
  const userId = sessionUserId();
  if (!userId) return noSession();
  const body = await readJson(request);
  if (!body) return badRequest();
  const { conversationId, messages, retry, simulateAfterHours, simulateWithinHours } = body;
  let res: Response;
  try {
    // O nome do lead não é repassado: o backend usa o que foi gravado na criação do lead.
    // request.signal: se o navegador desistir, a geração no backend é cancelada também.
    res = await backendFetch(
      "/chat/stream",
      {
        userId,
        conversationId,
        messages,
        retry: Boolean(retry),
        simulateAfterHours: Boolean(simulateAfterHours),
        simulateWithinHours: Boolean(simulateWithinHours),
      },
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

/** POST /api/lead — abre o atendimento e devolve o conversationId. */
export async function leadPOST(request: Request): Promise<Response> {
  const blocked = protect(request, "lead");
  if (blocked) return blocked;
  const userId = sessionUserId();
  if (!userId) return noSession();
  const body = await readJson(request);
  if (!body) return badRequest();
  const { nome, telefone, mensagem } = body;
  return forwardJson("/leads", { userId, nome, telefone, mensagem });
}

/** POST /api/recado — recado para o atendimento humano fora do horário. */
export async function recadoPOST(request: Request): Promise<Response> {
  const blocked = protect(request, "recado");
  if (blocked) return blocked;
  const userId = sessionUserId();
  if (!userId) return noSession();
  const body = await readJson(request);
  if (!body) return badRequest();
  const { conversationId, mensagem } = body;
  return forwardJson("/recados", { userId, conversationId, mensagem });
}

/** POST /api/consent — concede ou revoga o consentimento LGPD. */
export async function consentPOST(request: Request): Promise<Response> {
  const blocked = protect(request, "consent");
  if (blocked) return blocked;
  const userId = sessionUserId();
  if (!userId) return noSession();
  const body = await readJson(request);
  if (!body) return badRequest();
  return forwardJson("/consent", { userId, action: body.action });
}

/** GET /api/atendimento — horário do atendimento humano (regras da PO, no backend). */
export async function atendimentoGET(request: Request): Promise<Response> {
  const blocked = protect(request, "atendimento");
  if (blocked) return blocked;
  return forwardJson("/atendimento");
}
