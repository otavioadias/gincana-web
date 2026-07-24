import { tokenStorage } from "@/lib/storage";
import type { TokenPair } from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
let refreshPromise: Promise<TokenPair> | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (typeof body === "object" && body && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return fallback;
}

async function rotateTokens() {
  if (refreshPromise) return refreshPromise;
  const tokens = tokenStorage.read();
  if (!tokens?.refreshToken) throw new ApiError(401, "Sessão expirada");

  refreshPromise = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refreshToken: tokens.refreshToken,
      deviceInfo: typeof navigator === "undefined" ? "web" : navigator.userAgent,
    }),
  })
    .then(async (response) => {
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        tokenStorage.clear();
        throw new ApiError(response.status, errorMessage(body, "Sessão expirada"), body);
      }
      const pair = body as TokenPair;
      tokenStorage.write(pair);
      return pair;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  authenticated?: boolean;
  retry?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authenticated = true, retry = true, body, headers, ...init } = options;
  const tokens = tokenStorage.read();
  const isForm = body instanceof FormData;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (!isForm && body !== undefined) requestHeaders.set("Content-Type", "application/json");
  if (authenticated && tokens?.accessToken) {
    requestHeaders.set("Authorization", `Bearer ${tokens.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (response.status === 401 && authenticated && retry && tokens?.refreshToken) {
    await rotateTokens();
    return apiRequest<T>(path, { ...options, retry: false });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as unknown)
    : await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessage(responseBody, "Não foi possível concluir a solicitação"),
      responseBody,
    );
  }
  return responseBody as T;
}

export function apiUrl() {
  return API_URL;
}
