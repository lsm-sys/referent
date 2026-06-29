import { NextResponse } from "next/server";
import {
  apiCodeResponse,
  apiErrorResponse,
  ensureArticleContent,
  validateArticleUrl,
} from "@/lib/api-helpers";
import { ErrorCode } from "@/lib/error-codes";
import { fetchAndParseArticle } from "@/lib/parse-article";
import {
  classifyArticleCategory,
  extractTheses,
  generateTelegramPost,
  summarizeArticle,
  withCategory,
} from "@/lib/openrouter";

export const maxDuration = 240;

const ACTIONS = ["summary", "theses", "telegram"] as const;

type AnalyzeAction = (typeof ACTIONS)[number];

function isAnalyzeAction(value: string): value is AnalyzeAction {
  return ACTIONS.includes(value as AnalyzeAction);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; action?: string };
    const validated = validateArticleUrl(body.url);

    if (validated instanceof NextResponse) {
      return validated;
    }

    const action = body.action?.trim();

    if (!action || !isAnalyzeAction(action)) {
      return apiCodeResponse(ErrorCode.INVALID_ACTION);
    }

    const article = await fetchAndParseArticle(validated.url);
    ensureArticleContent(article.content);

    const categoryPromise = classifyArticleCategory(
      article.title,
      article.content,
    );

    let result: string;

    switch (action) {
      case "summary":
        result = await summarizeArticle(article.title, article.content);
        break;
      case "theses":
        result = await extractTheses(article.title, article.content);
        break;
      case "telegram":
        result = await generateTelegramPost(
          article.title,
          article.content,
          article.date,
          validated.url,
        );
        break;
    }

    const category = await categoryPromise;

    return NextResponse.json({ result: withCategory(result, category) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
