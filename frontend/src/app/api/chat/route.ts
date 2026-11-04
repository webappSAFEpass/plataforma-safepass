// Streaming precisa do runtime Node e nunca pode ser pré-renderizado ou cacheado.
// (A configuração da rota fica aqui: o Next só lê esses valores no próprio route.ts.)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export { chatPOST as POST } from "@/features/assistant/server/handlers";
