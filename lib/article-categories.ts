export const ARTICLE_CATEGORIES = [
  "Искусство и культура",
  "Бизнес и управление",
  "Экономика и финансы",
  "Наука и технологии",
  "Общество",
  "Образ жизни",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

const DEFAULT_CATEGORY: ArticleCategory = "Общество";

export function normalizeCategory(raw: string): ArticleCategory {
  const cleaned = raw
    .trim()
    .replace(/^["'«]|["'»]$/g, "")
    .replace(/\.$/, "");

  const exact = ARTICLE_CATEGORIES.find((category) => category === cleaned);
  if (exact) {
    return exact;
  }

  const partial = ARTICLE_CATEGORIES.find(
    (category) =>
      cleaned.toLowerCase().includes(category.toLowerCase()) ||
      category.toLowerCase().includes(cleaned.toLowerCase()),
  );

  return partial ?? DEFAULT_CATEGORY;
}

export function appendCategoryToResult(
  result: string,
  category: ArticleCategory,
): string {
  return `${result.trim()}\n\nКатегория: «${category}»`;
}
