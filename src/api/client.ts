const viteEnv = (import.meta as { env?: { DEV?: boolean; VITE_API_BASE_URL?: string } }).env;

export const API_BASE_URL = viteEnv?.VITE_API_BASE_URL ?? (viteEnv?.DEV ? "http://localhost:3201" : "");

type ApiErrorBody = {
  errors?: string[];
  code?: string;
  message?: string | string[];
  requestId?: string;
};

export class ApiError extends Error {
  status: number;
  errors: string[];
  code: string | null;
  requestId: string | null;

  constructor(status: number, message: string, errors: string[] = [], code: string | null = null, requestId: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
    this.requestId = requestId;
  }
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError && error.errors.length > 0) {
    return error.errors.join(" / ");
  }

  return fallbackMessage;
}

export async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const isFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await requestResponse(input, init, !isFormDataBody);

  return (await response.json()) as T;
}

export async function requestVoid(input: RequestInfo, init?: RequestInit): Promise<void> {
  await requestResponse(input, init, false);
}

export async function requestBlob(input: RequestInfo, init?: RequestInit): Promise<{ blob: Blob; filename: string }> {
  const response = await requestResponse(input, init, false);

  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(response.headers.get("Content-Disposition")) ?? "weather-cities.csv",
  };
}

async function requestResponse(input: RequestInfo, init: RequestInit | undefined, jsonBody: boolean) {
  const response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: buildRequestHeaders(init, jsonBody),
  });

  if (!response.ok) throw await buildApiError(response);
  return response;
}

async function buildApiError(response: Response): Promise<ApiError> {
  const text = await response.text();
  let errors: string[] = [];
  let code: string | null = null;
  let requestId: string | null = response.headers.get("X-Request-Id");

  if (text) {
    try {
      const body = JSON.parse(text) as ApiErrorBody;
      if (Array.isArray(body.errors)) {
        errors = body.errors.map((error) => String(error));
      } else if (Array.isArray(body.message)) {
        errors = body.message.map((error) => String(error));
      } else if (typeof body.message === "string") {
        errors = [body.message];
      }
      code = typeof body.code === "string" ? body.code : null;
      requestId = typeof body.requestId === "string" ? body.requestId : requestId;
    } catch {
      errors = [];
    }
  }

  const message = errors.length > 0
    ? errors.join(" / ")
    : `Request failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`;

  return new ApiError(response.status, message, errors, code, requestId);
}

function buildRequestHeaders(init: RequestInit | undefined, jsonBody: boolean) {
  const headers = new Headers(init?.headers);

  if (jsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function filenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utf8Filename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8Filename) return decodeURIComponent(utf8Filename);

  const filename = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
  return filename ?? null;
}
