import { env } from "@/lib/env";

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Erro no formato padrão do backend: { error: { code, message, details? } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

const AUTH_PREFIX = "/auth/";
const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return `${env.NEXT_PUBLIC_API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

function send(
  path: string,
  { method = "GET", body, query, signal }: RequestOptions,
): Promise<Response> {
  return fetch(buildUrl(path, query), {
    method,
    credentials: "include",
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Uma única renovação por vez: o refresh é rotativo, duas chamadas simultâneas derrubariam a sessão.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(buildUrl("/auth/refresh"), { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: ApiErrorDetail[] };
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as ErrorEnvelope;
    return new ApiError(
      res.status,
      data.error?.code ?? `http_${res.status}`,
      data.error?.message ?? GENERIC_ERROR,
      data.error?.details,
    );
  } catch {
    return new ApiError(res.status, `http_${res.status}`, GENERIC_ERROR);
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);
  if (res.status === 401 && !path.startsWith(AUTH_PREFIX) && (await refreshSession())) {
    res = await send(path, options);
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
