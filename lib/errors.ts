import { ErrorCode, type ErrorCode as ErrorCodeType } from "@/lib/error-codes";

export class AppError extends Error {
  readonly code: ErrorCodeType;

  constructor(code: ErrorCodeType, options?: { cause?: unknown }) {
    super(code);
    this.name = "AppError";
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function toErrorCode(error: unknown): ErrorCodeType {
  if (error instanceof AppError) {
    return error.code;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return ErrorCode.REQUEST_TIMEOUT;
    }
  }

  return ErrorCode.UNKNOWN;
}

export function toHttpStatus(code: ErrorCodeType): number {
  switch (code) {
    case ErrorCode.URL_REQUIRED:
    case ErrorCode.URL_INVALID:
    case ErrorCode.INVALID_ACTION:
      return 400;
    case ErrorCode.ARTICLE_CONTENT_EMPTY:
      return 422;
    case ErrorCode.AI_CONFIG_MISSING:
    case ErrorCode.IMAGE_CONFIG_MISSING:
    case ErrorCode.IMAGE_PERMISSION_DENIED:
      return 503;
    case ErrorCode.REQUEST_TIMEOUT:
    case ErrorCode.AI_TIMEOUT:
      return 504;
    case ErrorCode.SERVER_UNAVAILABLE:
    case ErrorCode.INVALID_RESPONSE:
      return 502;
    default:
      return 500;
  }
}
