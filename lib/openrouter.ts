import "server-only";

import { buildArticlePromptInput } from "@/lib/article-text";
import {
  appendCategoryToResult,
  ARTICLE_CATEGORIES,
  normalizeCategory,
  type ArticleCategory,
} from "@/lib/article-categories";
import { ErrorCode } from "@/lib/error-codes";
import { AppError } from "@/lib/errors";
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_MODEL = "deepseek/deepseek-chat";

function getOpenRouterBaseUrl(): string {
  return (
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ??
    "https://openrouter.ai/api/v1"
  );
}

export async function chatCompletion(
  messages: ChatMessage[],
  model = DEFAULT_MODEL,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new AppError(ErrorCode.AI_CONFIG_MISSING);
  }

  try {
    const response = await fetch(`${getOpenRouterBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
      signal: AbortSignal.timeout(120_000),
    });

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new AppError(ErrorCode.AI_FAILED);
    }

    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new AppError(ErrorCode.AI_FAILED);
    }

    return content;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new AppError(ErrorCode.AI_TIMEOUT, { cause: error });
    }

    throw new AppError(ErrorCode.AI_FAILED, { cause: error });
  }
}

export async function translateArticle(
  title: string | null,
  content: string | null,
): Promise<string> {
  const { text: articleText } = buildArticlePromptInput(title, content);

  return chatCompletion([
    {
      role: "system",
      content:
        "Ты профессиональный переводчик. Переводи англоязычные статьи на русский язык. Сохраняй смысл, стиль и структуру текста. Если есть заголовок — переведи его отдельной строкой в начале.",
    },
    {
      role: "user",
      content: `Переведи эту статью на русский:\n\n${articleText}`,
    },
  ]);
}

export async function summarizeArticle(
  title: string | null,
  content: string | null,
): Promise<string> {
  const { text: articleText } = buildArticlePromptInput(title, content);

  return chatCompletion([
    {
      role: "system",
      content:
        "Ты редактор и аналитик. Кратко и точно описываешь содержание англоязычных статей на русском языке.",
    },
    {
      role: "user",
      content: `Кратко опиши, о чём эта статья. Ответ на русском, без воды, 2–4 абзаца.\n\n${articleText}`,
    },
  ]);
}

export async function extractTheses(
  title: string | null,
  content: string | null,
): Promise<string> {
  const { text: articleText } = buildArticlePromptInput(title, content);

  return chatCompletion([
    {
      role: "system",
      content:
        "Ты редактор. Выделяешь главные мысли англоязычных статей и формулируешь их на русском языке.",
    },
    {
      role: "user",
      content: `Выдели 5–10 ключевых тезисов. Маркированный список на русском.\n\n${articleText}`,
    },
  ]);
}

export async function generateTelegramPost(
  title: string | null,
  content: string | null,
  date?: string | null,
  sourceUrl?: string | null,
): Promise<string> {
  const { text: articleText } = buildArticlePromptInput(title, content);
  const context = date?.trim()
    ? `Date: ${date.trim()}\n\n${articleText}`
    : articleText;

  const post = await chatCompletion([
    {
      role: "system",
      content:
        "Ты SMM-редактор. Пишешь короткие посты для Telegram-каналов на русском языке.",
    },
    {
      role: "user",
      content: `Напиши пост для Telegram-канала: цепляющий заголовок, суть, 1–2 вывода. До 1500 символов, на русском. Не добавляй ссылку на источник — она будет добавлена отдельно.\n\n${context}`,
    },
  ]);

  if (sourceUrl?.trim()) {
    return `${post}\n\nИсточник: ${sourceUrl.trim()}`;
  }

  return post;
}

const CATEGORY_LIST = ARTICLE_CATEGORIES.map((category) => `«${category}»`).join(", ");

export async function classifyArticleCategory(
  title: string | null,
  content: string | null,
): Promise<ArticleCategory> {
  const { text: articleText } = buildArticlePromptInput(title, content);

  const raw = await chatCompletion([
    {
      role: "system",
      content:
        "Ты классификатор статей. Определяешь тематическую категорию материала по его содержанию. Отвечаешь только названием категории из списка, без пояснений.",
    },
    {
      role: "user",
      content: `Выбери одну категорию для этой статьи из списка: ${CATEGORY_LIST}.\n\nВерни только название категории.\n\n${articleText}`,
    },
  ]);

  return normalizeCategory(raw);
}

export function withCategory(result: string, category: ArticleCategory): string {
  return appendCategoryToResult(result, category);
}

export async function generateIllustrationPrompt(
  title: string | null,
  content: string | null,
): Promise<string> {
  const { text: articleText } = buildArticlePromptInput(title, content);

  return chatCompletion([
    {
      role: "system",
      content:
        "You are an art director. Based on articles, you write concise English prompts for AI image generation. The prompt should describe a single editorial illustration that captures the article's main theme. Style: modern editorial, clean composition, no text or letters in the image. Return only the prompt, 1–3 sentences, in English.",
    },
    {
      role: "user",
      content: `Write an image generation prompt for an illustration about this article:\n\n${articleText}`,
    },
  ]);
}
