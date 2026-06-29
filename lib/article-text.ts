import "server-only";

import { ErrorCode } from "@/lib/error-codes";
import { AppError } from "@/lib/errors";

const DEFAULT_MAX_LENGTH = 12000;
const TRUNCATION_SUFFIX = "\n\n[... текст обрезан ...]";

export type ArticlePromptInput = {
  text: string;
  truncated: boolean;
};

export function buildArticlePromptInput(
  title: string | null,
  content: string | null,
  maxLength = DEFAULT_MAX_LENGTH,
): ArticlePromptInput {
  if (!content?.trim()) {
    throw new AppError(ErrorCode.ARTICLE_CONTENT_EMPTY);
  }

  const normalizedContent = content.trim();
  const truncated = normalizedContent.length > maxLength;
  const body = truncated
    ? `${normalizedContent.slice(0, maxLength)}${TRUNCATION_SUFFIX}`
    : normalizedContent;

  const lines: string[] = [];

  if (title?.trim()) {
    lines.push(`Title: ${title.trim()}`, "", body);
  } else {
    lines.push(body);
  }

  return {
    text: lines.join("\n"),
    truncated,
  };
}
