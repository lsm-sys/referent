import "server-only";

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
  if (!content?.trim()) {
    throw new Error("Не удалось извлечь текст статьи для перевода");
  }

  const maxLength = 12000;
  const trimmedContent =
    content.length > maxLength
      ? `${content.slice(0, maxLength)}\n\n[... текст обрезан для перевода ...]`
      : content;

  const articleText = [
    title ? `Title: ${title}` : null,
    "",
    trimmedContent,
  ]
    .filter((part) => part !== null)
    .join("\n");

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
