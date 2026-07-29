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

export function isPermissionError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403;
}

function translateBackendMessage(message: string) {
  const known: Record<string, string> = {
    "Insufficient role for this operation": "Seu perfil não tem permissão para realizar esta operação.",
    "One or more participants do not belong to the organization": "Um ou mais participantes não pertencem à organização ou estão inativos.",
    "Campaign and activity must belong to the authenticated organization": "A campanha e a atividade selecionadas não são compatíveis.",
    "Action date is outside the campaign period": "A data da ação está fora do período da campanha.",
    "At least one evidence file is required": "Adicione pelo menos uma evidência antes de enviar para validação.",
    "Activity is inactive": "Esta atividade está pausada pela organização.",
    "Only the author can edit this submission": "Somente quem criou o registro pode editá-lo.",
    "Only the author can submit": "Somente quem criou o registro pode enviá-lo para validação.",
    "Submission is not editable": "Este registro não pode mais ser editado.",
    "This evidence was already linked to a submission": "Esta evidência já foi utilizada em outro registro.",
  };
  if (known[message]) return known[message];
  if (message.startsWith("Minimum quantity is ")) {
    return `A quantidade mínima é ${message.slice("Minimum quantity is ".length)}.`;
  }
  if (message.startsWith("Minimum participation is ")) {
    return `A participação mínima exigida é ${message.slice("Minimum participation is ".length)}.`;
  }
  if (message.startsWith("Maximum of ")) {
    const limit = message.match(/\d+/)?.[0];
    return limit === "1"
      ? "A equipe já enviou o único registro permitido para esta atividade."
      : `A equipe já atingiu o limite de ${limit ?? "registros enviados"}.`;
  }
  return message;
}

export function translateApiError(error: unknown, fallback = "Não foi possível concluir a solicitação") {
  if (error instanceof ApiError) {
    if (error.status === 403) return translateBackendMessage(error.message) || "Você não tem permissão para realizar esta operação.";
    if (error.status === 401) return "Sua sessão expirou. Faça login novamente.";
    if (error.status === 409) return translateBackendMessage(error.message) || "Este conteúdo já foi registrado.";
    return error.message ? translateBackendMessage(error.message) : fallback;
  }
  if (error instanceof Error) return error.message ? translateBackendMessage(error.message) : fallback;
  return fallback;
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
