"use client";

import { useState } from "react";
import { getClientErrorMessage } from "@/lib/errors";

type ActionType = "summary" | "theses" | "telegram";

const ACTIONS: { id: ActionType; label: string; description: string }[] = [
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое описание содержания статьи",
  },
  {
    id: "theses",
    label: "Тезисы",
    description: "Ключевые тезисы и выводы",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Готовый пост для публикации",
  },
];

const LOADING_LABELS: Record<ActionType, string> = {
  summary: "Анализ статьи...",
  theses: "Формирование тезисов...",
  telegram: "Генерация поста...",
};

const BUSY_LABELS: Record<ActionType, string> = {
  summary: "Анализ...",
  theses: "Тезисы...",
  telegram: "Пост...",
};

const REQUEST_TIMEOUT_MS = 120_000;

async function postJson<T>(
  url: string,
  body: unknown,
): Promise<{ response: Response; data: T }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await response.json()) as T;
    return { response, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function ReferentForm() {
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: ActionType) {
    setError("");

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Введите URL англоязычной статьи");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Введите корректный URL, например https://example.com/article");
      return;
    }

    setActiveAction(action);
    setLoading(true);
    setResult("");

    try {
      const { response, data } = await postJson<{
        result?: string;
        error?: string;
      }>("/api/analyze", { url: trimmedUrl, action });

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось выполнить анализ статьи");
      }

      setResult(data.result ?? "");
    } catch (actionError) {
      setError(getClientErrorMessage(actionError));
      setResult("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-indigo-600 uppercase">
          Referent
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Анализ англоязычных статей
        </h1>
        <p className="text-slate-600">
          Вставьте ссылку на статью и выберите, что нужно сгенерировать.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-slate-700">
          URL англоязычной статьи
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/article"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((action) => {
            const isActive = activeAction === action.id;
            const isBusy = loading && isActive;

            return (
              <button
                key={action.id}
                type="button"
                disabled={loading}
                onClick={() => handleAction(action.id)}
                className={[
                  "rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                  isActive
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/60",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {isBusy ? BUSY_LABELS[action.id] : action.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {loading && activeAction && (
            <span className="text-sm text-indigo-600">
              {LOADING_LABELS[activeAction]}
            </span>
          )}
        </div>

        <div
          className="min-h-48 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap break-words"
          aria-live="polite"
        >
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : result ? (
            result
          ) : (
            <p className="text-slate-400">
              Результат появится здесь после выбора действия.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
