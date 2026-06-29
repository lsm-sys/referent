import "server-only";

import type { ParsedArticle } from "@/lib/parse-article";

type CacheEntry = {
  article: ParsedArticle;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 100;

const cache = new Map<string, CacheEntry>();

function getTtlMs(): number {
  const raw = process.env.PARSE_CACHE_TTL_MS;

  if (!raw) {
    return DEFAULT_TTL_MS;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MS;
}

export function normalizeArticleUrl(url: string): string {
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";

    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function evictExpiredEntries(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function evictOldestEntry(): void {
  const oldestKey = cache.keys().next().value;

  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

export function getCachedArticle(url: string): ParsedArticle | null {
  const key = normalizeArticleUrl(url);
  const entry = cache.get(key);
  const now = Date.now();

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);

  return entry.article;
}

export function setCachedArticle(url: string, article: ParsedArticle): void {
  const key = normalizeArticleUrl(url);
  const now = Date.now();

  evictExpiredEntries(now);

  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    evictOldestEntry();
  }

  cache.set(key, {
    article,
    expiresAt: now + getTtlMs(),
  });
}
