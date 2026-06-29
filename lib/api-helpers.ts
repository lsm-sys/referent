import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/error-codes";
import { AppError, toErrorCode, toHttpStatus } from "@/lib/errors";

export function validateArticleUrl(
  url: unknown,
): { url: string } | NextResponse {
  const trimmed = typeof url === "string" ? url.trim() : "";

  if (!trimmed) {
    return apiCodeResponse(ErrorCode.URL_REQUIRED);
  }

  try {
    new URL(trimmed);
  } catch {
    return apiCodeResponse(ErrorCode.URL_INVALID);
  }

  return { url: trimmed };
}

export function apiCodeResponse(
  code: (typeof ErrorCode)[keyof typeof ErrorCode],
): NextResponse {
  return NextResponse.json({ code }, { status: toHttpStatus(code) });
}

export function apiErrorResponse(error: unknown): NextResponse {
  const code = toErrorCode(error);

  return NextResponse.json({ code }, { status: toHttpStatus(code) });
}

export function ensureArticleContent(content: string | null | undefined): void {
  if (!content?.trim()) {
    throw new AppError(ErrorCode.ARTICLE_CONTENT_EMPTY);
  }
}
