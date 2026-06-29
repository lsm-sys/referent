import {
  ErrorCode,
  isErrorCode,
  type ErrorCode as ErrorCodeType,
} from "@/lib/error-codes";

const REQUEST_TIMEOUT_MS = 240_000;

export class ClientRequestError extends Error {
  readonly code: ErrorCodeType;

  constructor(code: ErrorCodeType) {
    super(code);
    this.name = "ClientRequestError";
    this.code = code;
  }
}

export async function postApi<T extends Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ClientRequestError(ErrorCode.INVALID_RESPONSE);
    }

    if (!response.ok) {
      const code = isErrorCode(data.code) ? data.code : ErrorCode.UNKNOWN;
      throw new ClientRequestError(code);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ClientRequestError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new ClientRequestError(ErrorCode.REQUEST_TIMEOUT);
      }

      if (error.message === "Failed to fetch") {
        throw new ClientRequestError(ErrorCode.SERVER_UNAVAILABLE);
      }
    }

    throw new ClientRequestError(ErrorCode.UNKNOWN);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resolveClientError(error: unknown): ErrorCodeType {
  if (error instanceof ClientRequestError) {
    return error.code;
  }

  return ErrorCode.UNKNOWN;
}
