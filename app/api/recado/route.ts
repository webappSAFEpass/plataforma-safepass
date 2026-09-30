import { badRequest, forwardJson, noSession, readJson, sessionUserId } from "@/lib/backend.server";
import { protect } from "@/lib/protect.server";

export async function POST(request: Request) {
  const blocked = protect(request, "recado");
  if (blocked) return blocked;
  const userId = sessionUserId();
  if (!userId) return noSession();
  const body = await readJson(request);
  if (!body) return badRequest();
  const { conversationId, mensagem } = body;
  return forwardJson("/recados", { userId, conversationId, mensagem });
}
