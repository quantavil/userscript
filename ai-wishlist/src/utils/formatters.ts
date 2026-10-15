import { marked } from "marked";
import DOMPurify from "dompurify";

/** Strip currency symbols, commas, and whitespace, then parse as a number.
 *  Returns null for empty, non-numeric, or malformed strings (e.g. multiple dots). */
export function cleanNumber(str: string): number | null {
  const cleaned = str.replace(/[₹$,\s]/g, "").trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** The saved URL defines currency; a foreign display amount must never be relabeled. */
export function hasCurrencyMismatch(text: string, currency: "INR" | "USD"): boolean {
  return currency === "USD" ? /₹|\bINR\b/i.test(text) : /\$|\bUSD\b/i.test(text);
}
export function parsePriceForCurrency(text: string, currency: "INR" | "USD"): number | null {
  if (hasCurrencyMismatch(text, currency)) return null;
  // Keep display parsing strict; amounts in other currencies are never converted.
  const normalized = text
    .trim()
    .replace(new RegExp(`^${currency}\\s*`, "i"), "")
    .replace(/^US\$/, "$");
  return cleanNumber(normalized);
}

export const fmtPrice = (price: number, currency: "INR" | "USD" = "INR"): string =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

/** Response history remains raw; only presentation parses and sanitizes it. */
export function formatMarkdownToHtml(text: string): string {
  return marked.parse(text, { async: false, gfm: true, breaks: true });
}
export function sanitizeHtml(html: string): string {
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "pre",
      "code",
      "blockquote",
      "hr",
      "del",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
  });
  const template = document.createElement("template");
  template.innerHTML = safe;
  template.content.querySelectorAll("a").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
  return template.innerHTML;
}
