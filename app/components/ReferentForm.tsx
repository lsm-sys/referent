"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { postApi, resolveClientError } from "@/lib/api-client";
import { ErrorCode, getErrorMessage, type ErrorCode as ErrorCodeType } from "@/lib/error-codes";

type ActionType = "summary" | "theses" | "telegram" | "illustration";

const ACTIONS: {
  id: ActionType;
  label: string;
  description: string;
  title: string;
}[] = [
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое описание содержания статьи",
    title: "Кратко описать, о чём статья, на русском языке",
  },
  {
    id: "theses",
    label: "Тезисы",
    description: "Ключевые тезисы и выводы",
    title: "Выделить ключевые тезисы и выводы статьи",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Готовый пост для публикации",
    title: "Сгенерировать пост для Telegram с ссылкой на источник",
  },
  {
    id: "illustration",
    label: "Иллюстрация",
    description: "Изображение по теме статьи",
    title: "Сгенерировать иллюстрацию на основе содержания статьи",
  },
];

const PROCESS_LABELS: Record<ActionType, string> = {
  summary: "Анализирую содержание…",
  theses: "Формирую тезисы…",
  telegram: "Генерирую пост для Telegram…",
  illustration: "Генерирую изображение…",
};

const BUSY_LABELS: Record<ActionType, string> = {
  summary: "Анализ...",
  theses: "Тезисы...",
  telegram: "Пост...",
  illustration: "Иллюстрация...",
};

const ERROR_TITLES: Partial<Record<ErrorCodeType, string>> = {
  [ErrorCode.URL_REQUIRED]: "Нужен URL",
  [ErrorCode.URL_INVALID]: "Некорректный URL",
  [ErrorCode.ARTICLE_FETCH_FAILED]: "Статья недоступна",
  [ErrorCode.ARTICLE_CONTENT_EMPTY]: "Текст не найден",
  [ErrorCode.AI_FAILED]: "Ошибка генерации",
  [ErrorCode.AI_CONFIG_MISSING]: "AI не настроен",
  [ErrorCode.IMAGE_FAILED]: "Ошибка изображения",
  [ErrorCode.IMAGE_CONFIG_MISSING]: "HF не настроен",
  [ErrorCode.IMAGE_PERMISSION_DENIED]: "Нет прав HF",
  [ErrorCode.AI_TIMEOUT]: "Слишком долго",
  [ErrorCode.REQUEST_TIMEOUT]: "Слишком долго",
  [ErrorCode.SERVER_UNAVAILABLE]: "Сервер недоступен",
  [ErrorCode.INVALID_RESPONSE]: "Неверный ответ",
};

export default function ReferentForm() {
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [result, setResult] = useState("");
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCodeType | null>(null);
  const [copyLabel, setCopyLabel] = useState("Копировать");
  const resultSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading || !activeAction) {
      return;
    }

    const timer = setTimeout(() => {
      setProcessMessage(PROCESS_LABELS[activeAction]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, activeAction]);

  useEffect(() => {
    if (!result && !imageResult) {
      return;
    }

    if (loading) {
      return;
    }

    resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, imageResult, loading]);

  function handleClear() {
    setUrl("");
    setActiveAction(null);
    setResult("");
    setImageResult(null);
    setImagePrompt("");
    setLoading(false);
    setProcessMessage(null);
    setErrorCode(null);
    setCopyLabel("Копировать");
  }

  async function handleCopy() {
    if (imageResult) {
      try {
        const response = await fetch(imageResult);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        setCopyLabel("Скопировано");
        window.setTimeout(() => setCopyLabel("Копировать"), 2000);
      } catch {
        handleDownload();
      }
      return;
    }

    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      setCopyLabel("Скопировано");
      window.setTimeout(() => setCopyLabel("Копировать"), 2000);
    } catch {
      setCopyLabel("Ошибка");
      window.setTimeout(() => setCopyLabel("Копировать"), 2000);
    }
  }

  function handleDownload() {
    if (!imageResult) {
      return;
    }

    const link = document.createElement("a");
    link.href = imageResult;
    link.download = "illustration.png";
    link.click();
    setCopyLabel("Скачано");
    window.setTimeout(() => setCopyLabel("Скачать"), 2000);
  }

  async function handleAction(action: ActionType) {
    setErrorCode(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setErrorCode(ErrorCode.URL_REQUIRED);
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setErrorCode(ErrorCode.URL_INVALID);
      return;
    }

    setActiveAction(action);
    setLoading(true);
    setProcessMessage(
      action === "illustration" ? "Создаю промпт иллюстрации…" : "Загружаю статью…",
    );
    setResult("");
    setImageResult(null);
    setImagePrompt("");

    try {
      if (action === "illustration") {
        const data = await postApi<{ image?: string; prompt?: string }>(
          "/api/illustrate",
          { url: trimmedUrl },
        );

        setImageResult(data.image ?? null);
        setImagePrompt(data.prompt ?? "");
      } else {
        const data = await postApi<{ result?: string }>("/api/analyze", {
          url: trimmedUrl,
          action,
        });

        setResult(data.result ?? "");
      }
    } catch (actionError) {
      setErrorCode(resolveClientError(actionError));
      setResult("");
      setImageResult(null);
      setImagePrompt("");
    } finally {
      setLoading(false);
      setProcessMessage(null);
    }
  }

  const hasOutput = Boolean(result || imageResult);
  const actionButtonLabel = imageResult ? "Скачать" : copyLabel;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 md:gap-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-indigo-600 uppercase">
          Referent
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Анализ англоязычных статей
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Вставьте ссылку на статью и выберите, что нужно сгенерировать.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-slate-700">
          URL англоязычной статьи
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            if (errorCode) {
              setErrorCode(null);
            }
          }}
          placeholder="Введите URL статьи, например: https://example.com/article"
          className="w-full min-w-0 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-base sm:placeholder:text-sm"
        />
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Укажите ссылку на англоязычную статью
        </p>

        {errorCode && (
          <Alert variant="destructive" className="mt-4 min-w-0">
            <CircleAlert className="shrink-0" />
            <AlertTitle>{ERROR_TITLES[errorCode] ?? "Ошибка"}</AlertTitle>
            <AlertDescription className="break-words">
              {getErrorMessage(errorCode)}
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACTIONS.map((action) => {
            const isActive = activeAction === action.id;
            const isBusy = loading && isActive;

            return (
              <button
                key={action.id}
                type="button"
                title={action.title}
                disabled={loading}
                onClick={() => handleAction(action.id)}
                className={[
                  "w-full min-w-0 rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                  isActive
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/60",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold break-words">
                  {action.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500 break-words">
                  {isBusy ? BUSY_LABELS[action.id] : action.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Очистить
          </button>
        </div>
      </section>

      {processMessage && (
        <div
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-800 break-words"
          aria-live="polite"
        >
          {processMessage}
        </div>
      )}

      <section
        ref={resultSectionRef}
        className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6 md:scroll-mt-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          <button
            type="button"
            onClick={imageResult ? handleDownload : handleCopy}
            disabled={!hasOutput || loading}
            className="w-full shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {actionButtonLabel}
          </button>
        </div>

        <div
          className="min-h-48 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 wrap-break-word whitespace-pre-wrap"
          aria-live="polite"
        >
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          ) : imageResult ? (
            <div className="space-y-4">
              <img
                src={imageResult}
                alt="Сгенерированная иллюстрация"
                className="mx-auto max-h-[480px] w-full rounded-lg object-contain"
              />
              {imagePrompt && (
                <p className="text-xs leading-relaxed text-slate-500 break-words">
                  <span className="font-medium text-slate-600">Промпт: </span>
                  {imagePrompt}
                </p>
              )}
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
