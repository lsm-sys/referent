import "server-only";

import { buildArticlePromptInput } from "@/lib/article-text";

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
    throw new Error("OPENROUTER_API_KEY не настроен в .env.local");
  }

  const response = await fetch(`${getOpenRouterBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
    signal: AbortSignal.timeout(90000),
  });

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenRouter: HTTP ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter вернул пустой ответ");
  }

  return content;
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
): Promise<string> {
  const { text: articleText } = buildArticlePromptInput(title, content);
  const context = date?.trim()
    ? `Date: ${date.trim()}\n\n${articleText}`
    : articleText;

  return chatCompletion([
    {
      role: "system",
      content:
        "Ты SMM-редактор. Пишешь короткие посты для Telegram-каналов на русском языке.",
    },
    {
      role: "user",
      content: `Напиши пост для Telegram-канала: цепляющий заголовок, суть, 1–2 вывода. До 1500 символов, на русском.\n\n${context}`,
    },
  ]);
}
