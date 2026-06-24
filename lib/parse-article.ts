import "server-only";

import * as cheerio from "cheerio";

export type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

const CONTENT_SELECTORS = [
  "article",
  "[role='main'] article",
  "main article",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".article-body",
  ".post",
  ".content",
  "main",
  "[role='main']",
];

const NOISE_SELECTORS =
  "script, style, nav, footer, aside, header, .sidebar, .comments, .comment, .advertisement, .ad, .social-share, .related-posts";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $('meta[property="og:title"]').attr("content"),
    $("article h1").first().text(),
    $("main h1").first().text(),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    const normalized = candidate ? normalizeText(candidate) : "";
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function extractDateFromJsonLd(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as unknown;
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as Record<string, unknown>;
      const directDate = record.datePublished ?? record.dateCreated ?? record.dateModified;

      if (typeof directDate === "string" && directDate.trim()) {
        return directDate.trim();
      }

      if (record["@graph"] && Array.isArray(record["@graph"])) {
        for (const node of record["@graph"]) {
          if (!node || typeof node !== "object") {
            continue;
          }

          const nodeRecord = node as Record<string, unknown>;
          const graphDate =
            nodeRecord.datePublished ?? nodeRecord.dateCreated ?? nodeRecord.dateModified;

          if (typeof graphDate === "string" && graphDate.trim()) {
            return graphDate.trim();
          }
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function extractDate($: cheerio.CheerioAPI): string | null {
  const timeDatetime = $("time[datetime]").first().attr("datetime");
  if (timeDatetime?.trim()) {
    return timeDatetime.trim();
  }

  const timeText = $("time").first().text();
  if (timeText.trim()) {
    return normalizeText(timeText);
  }

  const metaDate =
    $('meta[property="article:published_time"]').attr("content") ??
    $('meta[property="article:modified_time"]').attr("content") ??
    $('meta[name="pubdate"]').attr("content") ??
    $('meta[name="date"]').attr("content") ??
    $('meta[name="publish-date"]').attr("content");

  if (metaDate?.trim()) {
    return metaDate.trim();
  }

  for (const element of $("script[type='application/ld+json']").toArray()) {
    const jsonLd = $(element).html();
    if (!jsonLd) {
      continue;
    }

    const date = extractDateFromJsonLd(jsonLd);
    if (date) {
      return date;
    }
  }

  return null;
}

function extractContent($: cheerio.CheerioAPI): string | null {
  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();

    if (!element.length) {
      continue;
    }

    const clone = element.clone();
    clone.find(NOISE_SELECTORS).remove();

    const text = normalizeText(clone.text());
    if (text.length >= 100) {
      return text;
    }
  }

  const body = $("body").clone();
  body.find(NOISE_SELECTORS).remove();
  const fallback = normalizeText(body.text());

  return fallback || null;
}

export async function fetchAndParseArticle(url: string): Promise<ParsedArticle> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  return {
    date: extractDate($),
    title: extractTitle($),
    content: extractContent($),
  };
}
