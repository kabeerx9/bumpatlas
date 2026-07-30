import type { z } from "zod";

import { apiErrorResponseSchema } from "./me";

export class ApiError extends Error {
  status: number;
  /**
   * Business code from a structured v1 error, e.g. `QUOTA_EXCEEDED` or
   * `CHILD_LIMIT_REACHED`. Undefined for legacy string errors and transport
   * failures. Clients branch on this rather than on message text.
   */
  code?: string;
  details?: unknown;
  requestId?: string;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: unknown; requestId?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
    this.requestId = options?.requestId;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  getToken: () => Promise<string | null | undefined>;
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(options: ApiClientOptions) {
  const fetchFn = options.fetchImpl ?? fetch;

  async function request(path: string, init?: RequestInit): Promise<Response> {
    const token = await options.getToken();
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetchFn(`${options.baseUrl}${path}`, {
      ...init,
      headers,
      ...(options.credentials !== undefined ? { credentials: options.credentials } : {}),
    });
  }

  async function throwApiError(response: Response): Promise<never> {
    const payload = (await response.json().catch(() => null)) as unknown;
    const parsed = apiErrorResponseSchema.safeParse(payload);

    if (parsed.success && typeof parsed.data.error !== "string") {
      const { code, message, details, requestId } = parsed.data.error;
      throw new ApiError(response.status, message, { code, details, requestId });
    }

    const message = parsed.success
      ? (parsed.data.error as string)
      : response.statusText;

    throw new ApiError(response.status, message);
  }

  return {
    async requestJson<T extends z.ZodType>(
      path: string,
      schema: T,
      init?: RequestInit,
    ): Promise<z.infer<T>> {
      const response = await request(path, init);

      if (!response.ok) {
        await throwApiError(response);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiError(response.status, "Invalid JSON response");
      }

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new ApiError(response.status, "Invalid response payload");
      }

      return parsed.data;
    },

    async requestVoid(path: string, init?: RequestInit): Promise<void> {
      const response = await request(path, init);

      if (!response.ok) {
        await throwApiError(response);
      }

      if (response.status === 204) {
        return;
      }

      const contentLength = response.headers.get("Content-Length");
      if (contentLength === "0") {
        return;
      }
    },
  };
}
