/**
 * HTML → Markdown conversion using Turndown + GFM tables.
 *
 * Replaces the hand-written recursive walker from the original script.
 * Custom rules preserve non-standard behaviours documented in context.md.
 */

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// ── Configure ───────────────────────────────────────────────────────────

const td = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "---",
});

td.use(gfm); // tables, strikethrough, task lists

// ── Custom rules ────────────────────────────────────────────────────────

// <mark> → ==highlight== (Obsidian / extended-MD syntax)
td.addRule("mark", {
  filter: "mark",
  replacement(content) {
    const text = content.trim();
    return text ? `==${text}==` : "";
  },
});

// KaTeX-rendered elements → original $…$ / $$…$$ string (round-trip copy)
td.addRule("katex", {
  filter(node) {
    return node instanceof HTMLElement && node.hasAttribute("data-latex");
  },
  replacement(_content, node) {
    return (node as HTMLElement).getAttribute("data-latex") ?? "";
  },
});

// Drop empty links (left over after citation stripping)
td.addRule("emptyLink", {
  filter(node) {
    return node.nodeName === "A" && !node.textContent?.trim();
  },
  replacement() {
    return "";
  },
});

// ── Public API ──────────────────────────────────────────────────────────

/** Convert an HTML element's content to Markdown. */
export function htmlToMarkdown(element: HTMLElement): string {
  return td.turndown(element);
}

/**
 * Post-processing cleanup on raw Markdown output:
 * - Collapse whitespace before punctuation inside **bold** markers.
 * - Collapse excessive blank lines.
 * - Trim trailing whitespace per line.
 */
export function cleanMarkdown(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, (_, inner: string) => {
      const cleaned = inner.trim().replace(/\s+(?=[:;,.!?])/g, "");
      return cleaned ? `**${cleaned}**` : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}