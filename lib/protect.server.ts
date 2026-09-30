// Proteções das rotas públicas /api/*: origem do próprio site e rate limit por IP.
import "server-only";

type Limit = { max: number; windowMs: number };

export const LIMITS = {
  chat: { max: 20, windowMs: 60_000 },
  lead: { max: 5, windowMs: 10 * 60_000 },
  recado: { max: 5, windowMs: 10 * 60_000 },
  consent: { max: 10, windowMs: 60_000 },
} satisfies Record<string, Limit>;

// Em memória: vale para uma instância (demo/MVP). Com várias réplicas, usar Redis/Upstash.
const hits = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

function allow(key: string, { max, windowMs }: Limit): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Bloqueia chamadas de outros sites (Origin diferente) e excesso de chamadas do mesmo IP. */
export function protect(request: Request, name: keyof typeof LIMITS): Response | null {
  const origin = request.headers.get("origin");
  if (origin) {
    let sameSite = false;
    try {
      sameSite = new URL(origin).host === request.headers.get("host");
    } catch {
      sameSite = false;
    }
    if (!sameSite) return Response.json({ error: "origem não permitida" }, { status: 403 });
  }
  if (!allow(`${name}:${clientIp(request)}`, LIMITS[name])) {
    return Response.json({ error: "muitas requisições; aguarde um instante" }, { status: 429 });
  }
  return null;
}
