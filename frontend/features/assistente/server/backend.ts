// Acesso ao backend SAFEpass — só no servidor (route handlers). O token nunca vai ao navegador.
// "server-only" quebra o build se algum componente de cliente importar este arquivo.
import "server-only";

function config() {
  const url = process.env.BACKEND_API_URL;
  const token = process.env.BACKEND_API_TOKEN;
  if (!url || !token) throw new Error("BACKEND_API_URL/BACKEND_API_TOKEN não configurados.");
  return { url: url.replace(/\/$/, ""), token };
}

/**
 * Usuário da sessão. No protótipo é fixo e compartilhado por todos os visitantes; no futuro
 * virá do login (Desafio 01). Em produção só funciona com ALLOW_SHARED_DEMO_USER=true, para um
 * deploy público não expor os dados (e o consentimento) desse usuário a qualquer visitante.
 */
export function sessionUserId(): string | null {
  const sharedAllowed =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_SHARED_DEMO_USER === "true";
  return sharedAllowed ? (process.env.SESSION_USER_ID ?? "89") : null;
}

export function noSession(): Response {
  return Response.json({ error: "sessão não configurada" }, { status: 503 });
}

/** Corpo JSON como objeto, ou null se não for application/json válido (evita form posts cross-site). */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function badRequest(): Response {
  return Response.json({ error: "requisição inválida" }, { status: 400 });
}

/** POST ao backend. `signal` cancela a chamada quando o navegador desiste (aba fechada, "Voltar"). */
export function backendFetch(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const { url, token } = config();
  return fetch(`${url}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Mesmo id nos logs do backend: rastreia uma requisição de ponta a ponta.
      "X-Request-ID": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(30_000),
  });
}

/** GET ao backend (dados de leitura, ex.: horário do atendimento). */
function backendGet(path: string): Promise<Response> {
  const { url, token } = config();
  return fetch(`${url}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Request-ID": crypto.randomUUID() },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

/** Repassa a resposta JSON do backend (mesmo status), sem expor detalhes internos em caso de falha de rede. */
export async function forwardJson(path: string, body?: unknown): Promise<Response> {
  try {
    const res = body === undefined ? await backendGet(path) : await backendFetch(path, body);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return Response.json({ error: "backend indisponível" }, { status: 502 });
  }
}
