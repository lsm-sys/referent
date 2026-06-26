export function getHttpFetchMessage(status: number): string {
  if (status === 403) {
    return "Сайт заблокировал запрос (403). Попробуйте другой URL.";
  }

  if (status === 404) {
    return "Страница не найдена (404). Проверьте URL.";
  }

  if (status === 401 || status === 407) {
    return `Не удалось получить доступ к странице: HTTP ${status}.`;
  }

  return `Не удалось загрузить страницу: HTTP ${status}.`;
}

export function toApiError(
  error: unknown,
  fallbackMessage: string,
): { message: string; status: number } {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return {
        message: "Превышено время ожидания. Попробуйте позже или выберите другую статью.",
        status: 504,
      };
    }

    if (error.message.includes("OPENROUTER_API_KEY")) {
      return {
        message:
          "OPENROUTER_API_KEY не настроен. Добавьте ключ в .env.local или в Vercel Environment Variables.",
        status: 503,
      };
    }

    return { message: error.message, status: 500 };
  }

  return { message: fallbackMessage, status: 500 };
}

export function getClientErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Превышено время ожидания. Попробуйте позже.";
    }

    if (error.message === "Failed to fetch") {
      return "Не удалось связаться с сервером. Проверьте, что dev-сервер запущен.";
    }

    return error.message;
  }

  return "Ошибка при обработке статьи";
}
