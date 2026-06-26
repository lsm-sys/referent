import { NextResponse } from "next/server";
import { toApiError } from "@/lib/errors";

export function validateArticleUrl(
  url: unknown,
): { url: string } | NextResponse {
  const trimmed = typeof url === "string" ? url.trim() : "";

  if (!trimmed) {
    return NextResponse.json({ error: "URL не указан" }, { status: 400 });
  }

  try {
    new URL(trimmed);
  } catch {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  return { url: trimmed };
}

export function apiErrorResponse(
  error: unknown,
  fallbackMessage: string,
): NextResponse {
  const { message, status } = toApiError(error, fallbackMessage);

  return NextResponse.json({ error: message }, { status });
}
