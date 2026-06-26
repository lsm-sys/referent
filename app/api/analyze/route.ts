import { NextResponse } from "next/server";
import { apiErrorResponse, validateArticleUrl } from "@/lib/api-helpers";
import { fetchAndParseArticle } from "@/lib/parse-article";
import {
  extractTheses,
  generateTelegramPost,
  summarizeArticle,
} from "@/lib/openrouter";

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
      return NextResponse.json(
        { error: "Укажите action: summary, theses или telegram" },
        { status: 400 },
      );
    }

    const article = await fetchAndParseArticle(validated.url);

    if (!article.content?.trim()) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст статьи. Попробуйте другой URL." },
        { status: 422 },
      );
    }

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
        );
        break;
    }

    return NextResponse.json({ result });
  } catch (error) {
    return apiErrorResponse(error, "Ошибка при анализе статьи");
  }
}
