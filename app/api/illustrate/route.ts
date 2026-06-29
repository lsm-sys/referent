import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  ensureArticleContent,
  validateArticleUrl,
} from "@/lib/api-helpers";
import { generateImage } from "@/lib/huggingface";
import { generateIllustrationPrompt } from "@/lib/openrouter";
import { fetchAndParseArticle } from "@/lib/parse-article";

export const maxDuration = 240;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const validated = validateArticleUrl(body.url);

    if (validated instanceof NextResponse) {
      return validated;
    }

    const article = await fetchAndParseArticle(validated.url);
    ensureArticleContent(article.content);

    const prompt = await generateIllustrationPrompt(
      article.title,
      article.content,
    );
    const { data, contentType } = await generateImage(prompt);

    return NextResponse.json({
      prompt,
      image: `data:${contentType};base64,${data.toString("base64")}`,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
