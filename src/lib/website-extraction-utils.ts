import * as cheerio from "cheerio";

export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, "")
    .replace(/[^\w\s.,!?-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareTextForAnalysis(texts: string[], maxTextLength: number): string {
  const combinedText = texts.join("\n\n");
  if (combinedText.length <= maxTextLength) return combinedText;
  const halfLength = Math.floor(maxTextLength / 2);
  return combinedText.slice(0, halfLength) +
    "\n...[content truncated]...\n" +
    combinedText.slice(-halfLength);
}

export function extractCleanText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, meta, link").remove();
  const mainContent = $("main, article, #content, .content, [role='main']").text();
  return mainContent.trim() ? cleanText(mainContent) : cleanText($("body").text());
}

export function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

export function formatValue(
  value: string,
  format: { type: "price" | "text" | "url" | "date"; currency?: string; dateFormat?: string }
): any {
  switch (format.type) {
    case "price": {
      const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
      const number = parseFloat(cleaned);
      return isNaN(number) ? null : number;
    }
    case "date":
      return new Date(value).toISOString();
    case "url":
      try {
        return new URL(value).toString();
      } catch {
        return null;
      }
    default:
      return value;
  }
}

export function transformValue(value: string, transform: string): any {
  switch (transform) {
    case "lowercase":
      return value.toLowerCase();
    case "uppercase":
      return value.toUpperCase();
    case "trim":
      return value.trim();
    default:
      return value;
  }
} 