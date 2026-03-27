/**
 * Google-side logic — runs on www.google.com/search?udm=50#gai
 *
 * Waits for the AI Mode response to finish streaming, extracts and cleans
 * the HTML, then writes it into the cross-tab GM cache so the Brave-side
 * can pick it up.
 */

import {
  CONTENT_SELS,
  COMPLETE_SELS,
  ERROR_SELS,
  GOOGLE_ORIGIN,
  STRIP_SELS,
  KEEP_ATTRS,
  INLINE_TAGS,
  MAX_CACHE_ENTRIES,
} from "./constants";
import { normalizeQ, getCache, setCache, findBySelectors } from "./utils";

// ── Completion detection constants ──────────────────────────────────────

/** Polling interval for content length stability check (ms). */
const POLL_MS = 500;

/** Number of stable-length ticks required when completion selectors exist. */
const STABLE_WITH_SIGNAL = 1;

/** Fallback: number of stable-length ticks before we send anyway. */
const STABLE_FALLBACK = 10;

/** Hard timeout — send whatever we have (ms). */
const HARD_TIMEOUT = 60_000;

// ── Entry point ─────────────────────────────────────────────────────────

export function googleSide(): void {
  const params = new URLSearchParams(location.search);
  if (params.get("udm") !== "50") return;
  if (!location.hash.includes("gai")) return;

  const rawQ = params.get("q") ?? "";
  const normQ = normalizeQ(rawQ);

  // Strip the #gai fragment so the page looks normal
  history.replaceState(null, "", location.href.replace(/#gai.*/, ""));
  console.log("[GAI] Google-side activated");

  let sent = false;
  let lastLen = -1;
  let stableCount = 0;
  const startTime = Date.now();

  // ── Helpers ─────────────────────────────────────────────────────────

  const hasCompletionSignal = (): boolean =>
    COMPLETE_SELS.some((s) => document.querySelector(s) !== null);

  const isErrorPage = (): boolean => {
    if (ERROR_SELS.some((s) => document.querySelector(s) !== null)) return true;
    const t = document.title.toLowerCase();
    return t.includes("unusual traffic") || t.includes("captcha");
  };

  function send(error: string | null = null): void {
    if (sent) return;
    sent = true;
    clearInterval(pollTimer);

    const html = error ? "" : extractContent();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[GAI] Sending ${html.length} chars for "${normQ}" (${elapsed}s)` +
        (error ? ` [error: ${error}]` : ""),
    );

    const cache = getCache();
    cache[normQ] = {
      html,
      ts: Date.now(),
      error,
      status: error ? "error" : "done",
      resultUrl: error ? null : location.href,
    };

    // Evict oldest entry when over the limit
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const oldest = keys
        .filter((k) => cache[k].ts)
        .sort((a, b) => cache[a].ts - cache[b].ts)[0];
      if (oldest) delete cache[oldest];
    }

    setCache(cache);
  }

  // ── Polling loop ────────────────────────────────────────────────────

  const pollTimer = setInterval(() => {
    if (sent) return;

    if (isErrorPage()) {
      send("error_page");
      return;
    }

    const el = findBySelectors(CONTENT_SELS, true);
    if (!el) {
      lastLen = -1;
      stableCount = 0;
      return;
    }

    const len = el.textContent?.length ?? 0;
    if (len > 0 && len === lastLen) {
      stableCount++;
      if (hasCompletionSignal() && stableCount >= STABLE_WITH_SIGNAL) {
        send();
        return;
      }
      if (stableCount >= STABLE_FALLBACK) {
        send();
        return;
      }
    } else {
      lastLen = len;
      stableCount = 0;
    }
  }, POLL_MS);

  // Hard timeout safety net
  setTimeout(() => {
    if (!sent) send();
  }, HARD_TIMEOUT);
}

// ── Content extraction ──────────────────────────────────────────────────

function extractContent(): string {
  const container = findBySelectors(CONTENT_SELS) ?? document.body;
  const clone = container.cloneNode(true) as HTMLElement;

  // 0.  LaTeX: convert data-xpm-latex attrs to $…$ / $$…$$ text nodes
  //     before anything else is stripped.
  clone.querySelectorAll("[data-xpm-latex]").forEach((el) => {
    const latex = el.getAttribute("data-xpm-latex");
    if (!latex) return;

    const isInline = (el.getAttribute("style") ?? "").includes("inline");
    const wrap = isInline ? "$" : "$$";

    // data-xpm-copy-root marks the top-level math container
    if (el.hasAttribute("data-xpm-copy-root")) {
      el.textContent = `${wrap}${latex}${wrap}`;
    } else if (!el.closest("[data-xpm-copy-root]")) {
      // Standalone math fragment
      el.textContent = `${wrap}${latex}${wrap}`;
    }
  });

  // 1b. Process citation badges (button.rBl3me)
  clone.querySelectorAll("button.rBl3me").forEach((btn) => {
    const label = btn.getAttribute("aria-label");
    if (label) {
      // e.g. "Reddit (+8) – View related links" -> "[Reddit (+8)]"
      const text = label.replace(/ – View related links.*$/, "").trim();
      if (text && text !== "View related links") {
        const span = document.createElement("span");
        span.className = "gai-citation";
        // Inline style to match citation look (will be converted to markdown if needed, 
        // but sidebar uses HTML)
        span.style.cssText =
          "font-size: 0.85em; vertical-align: super; margin-left: 2px; color: #a5a8ff; font-weight: bold;";
        span.textContent = `[${text}]`;
        btn.replaceWith(span);
        return;
      }
    }
    btn.remove();
  });

  // 1.  Strip unwanted elements
  for (const sel of STRIP_SELS) {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // 2.  Remove display:none elements
  clone.querySelectorAll("*").forEach((el) => {
    const style = (el.getAttribute("style") ?? "").replace(/\s/g, "");
    if (style.includes("display:none")) el.remove();
  });

  // 2b. Strip any remaining buttons (already handled 1b, but just in case)
  clone.querySelectorAll("button").forEach((btn) => btn.remove());

  // 3.  role="heading" → semantic <hN>
  clone.querySelectorAll('[role="heading"]').forEach((el) => {
    const level = el.getAttribute("aria-level") ?? "3";
    const h = document.createElement(`h${level}`);
    h.innerHTML = el.innerHTML;
    el.replaceWith(h);
  });

  // 4.  Unwrap <strong>/<b> inside headings (avoids ### **text** in MD)
  for (let i = 1; i <= 6; i++) {
    clone
      .querySelectorAll(`h${i} strong, h${i} b`)
      .forEach((s) => s.replaceWith(...Array.from(s.childNodes)));
  }

  // 5.  Unwrap block elements mis-nested inside inline parents
  clone.querySelectorAll("div, p, section").forEach((block) => {
    const parent = block.parentElement;
    if (parent && INLINE_TAGS.has(parent.tagName.toLowerCase())) {
      block.replaceWith(...Array.from(block.childNodes));
    }
  });

  // 6.  Remove empty <a> tags (left over from citation stripping)
  clone.querySelectorAll("a").forEach((a) => {
    if (!a.textContent?.trim() && !a.querySelector("img")) a.remove();
  });

  // 6b. Remove duplicate a.NoAaxc anchors that carry no image
  //     (Google repeats these 3× per entity; only the img-wrapper is useful)
  clone.querySelectorAll("a.NoAaxc").forEach((a) => {
    if (!a.querySelector("img")) a.remove();
  });

  // 7.  Relative → absolute URLs  (must run before attr stripping)
  clone.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href?.startsWith("/")) {
      a.setAttribute("href", GOOGLE_ORIGIN + href);
    }
  });

  // 8.  Strip all attributes except the ones in KEEP_ATTRS
  for (const el of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
    for (const attr of [...el.attributes]) {
      if (!KEEP_ATTRS.has(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // 9.  Normalise whitespace text nodes (collapse newlines → space)
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const tn of textNodes) {
    if (!tn.parentElement?.closest("pre, code")) {
      tn.data = tn.data.replace(/[ \t]*\n[ \t]*/g, " ");
    }
  }

  // 10. Cascade-remove empty leaf elements
  let changed: boolean;
  do {
    changed = false;
    clone.querySelectorAll("*").forEach((el) => {
      // Exclude void/content-bearing elements from recursive stripping
      const tag = el.tagName.toLowerCase();
      if (tag === "img" || tag === "br" || tag === "hr") return;

      if (!el.textContent?.trim() && el.children.length === 0) {
        el.remove();
        changed = true;
      }
    });
  } while (changed);

  return clone.innerHTML.trim() || clone.textContent?.trim() || "";
}