import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  ensureArticleContent,
  validateArticleUrl,
} from "@/lib/api-helpers";
import { fetchAndParseArticle } from "@/lib/parse-article";
import { translateArticle } from "@/lib/openrouter";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const validated = validateArticleUrl(body.url);

    if (validated instanceof NextResponse) {
      return validated;
    }

    const article = await fetchAndParseArticle(validated.url);
    ensureArticleContent(article.content);

    const translation = await translateArticle(article.title, article.content);

    return NextResponse.json({ translation });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
