export const ErrorCode = {
  URL_REQUIRED: "URL_REQUIRED",
  URL_INVALID: "URL_INVALID",
  INVALID_ACTION: "INVALID_ACTION",
  ARTICLE_FETCH_FAILED: "ARTICLE_FETCH_FAILED",
  ARTICLE_CONTENT_EMPTY: "ARTICLE_CONTENT_EMPTY",
  AI_FAILED: "AI_FAILED",
  AI_CONFIG_MISSING: "AI_CONFIG_MISSING",
  AI_TIMEOUT: "AI_TIMEOUT",
  IMAGE_FAILED: "IMAGE_FAILED",
  IMAGE_CONFIG_MISSING: "IMAGE_CONFIG_MISSING",
  IMAGE_PERMISSION_DENIED: "IMAGE_PERMISSION_DENIED",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.URL_REQUIRED]: "Введите URL англоязычной статьи.",
  [ErrorCode.URL_INVALID]:
    "Введите корректный URL, например https://example.com/article",
  [ErrorCode.INVALID_ACTION]: "Выбрано неизвестное действие. Обновите страницу.",
  [ErrorCode.ARTICLE_FETCH_FAILED]:
    "Не удалось загрузить статью по этой ссылке.",
  [ErrorCode.ARTICLE_CONTENT_EMPTY]:
    "Не удалось извлечь текст статьи. Попробуйте другую ссылку.",
  [ErrorCode.AI_FAILED]:
    "Не удалось сгенерировать ответ. Попробуйте позже.",
  [ErrorCode.AI_CONFIG_MISSING]:
    "Сервис AI не настроен. Добавьте ключ OpenRouter в настройки.",
  [ErrorCode.AI_TIMEOUT]:
    "Генерация ответа заняла слишком много времени. Попробуйте позже.",
  [ErrorCode.IMAGE_FAILED]:
    "Не удалось сгенерировать изображение. Попробуйте позже.",
  [ErrorCode.IMAGE_CONFIG_MISSING]:
    "Сервис генерации изображений не настроен. Добавьте ключ Hugging Face в настройки.",
  [ErrorCode.IMAGE_PERMISSION_DENIED]:
    "У токена Hugging Face нет прав на генерацию изображений. Создайте fine-grained токен на huggingface.co/settings/tokens и включите «Make calls to Inference Providers».",
  [ErrorCode.REQUEST_TIMEOUT]:
    "Превышено время ожидания. Попробуйте позже.",
  [ErrorCode.SERVER_UNAVAILABLE]:
    "Не удалось связаться с сервером. Запустите приложение и откройте http://localhost:3010.",
  [ErrorCode.INVALID_RESPONSE]:
    "Сервер вернул неожиданный ответ. Проверьте, что открыт referent на http://localhost:3010.",
  [ErrorCode.UNKNOWN]: "Произошла ошибка. Попробуйте ещё раз.",
};

export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ErrorCode.UNKNOWN];
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === "string" &&
    Object.values(ErrorCode).includes(value as ErrorCode)
  );
}
