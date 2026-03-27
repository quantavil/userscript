/**
 * KaTeX rendering for the Brave-side panel.
 *
 * Walks text nodes inside the content container, finds $…$ (inline) and
 * $$…$$ (display) delimiters, and replaces them with KaTeX-rendered HTML.
 *
 * Each rendered wrapper gets a `data-latex` attribute holding the original
 * delimited string so Turndown can recover it when copying as Markdown.
 *
 * Gracefully no-ops when KaTeX fails to load from the CDN.
 */

const KATEX_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.43/dist";

/**
 * Matches $$…$$ (display, group 1) first, then $…$ (inline, group 2).
 * Inline allows escaped dollars (\$) but forbids unescaped $ and newlines.
 */
const LATEX_RE = /\$\$(.+?)\$\$|\$(?!\$)((?:\\.|[^$\n])+?)\$/g;

let cssInjected = false;

/** Load KaTeX CSS from the @resource, rewriting relative font paths. */
function injectKatexCSS(): void {
    if (cssInjected) return;
    cssInjected = true;
    try {
        let css = GM_getResourceText("katexCSS");
        css = css.replace(
            /url\((?:['"]?)fonts\//g,
            `url(${KATEX_CDN}/fonts/`,
        );
        GM_addStyle(css);
    } catch (e) {
        console.warn("[GAI] Failed to load KaTeX CSS:", e);
    }
}

/**
 * Render all LaTeX strings inside `container` using KaTeX.
 * Safe to call unconditionally — returns immediately if KaTeX isn't loaded.
 */
export function renderLatex(container: HTMLElement): void {
    if (typeof katex === "undefined") return;
    injectKatexCSS();

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);

    for (const tn of nodes) {
        if (tn.parentElement?.closest("pre, code")) continue;

        const text = tn.data;
        LATEX_RE.lastIndex = 0;
        if (!LATEX_RE.test(text)) continue;
        LATEX_RE.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match: RegExpExecArray | null;

        while ((match = LATEX_RE.exec(text)) !== null) {
            // Text before this match
            if (match.index > lastIdx) {
                frag.appendChild(
                    document.createTextNode(text.slice(lastIdx, match.index)),
                );
            }

            const isDisplay = match[1] !== undefined;
            const latex = (isDisplay ? match[1] : match[2]).trim();
            const original = match[0]; // full "$…$" or "$$…$$"

            const wrapper = document.createElement(isDisplay ? "div" : "span");
            wrapper.setAttribute("data-latex", original);

            try {
                katex.render(latex, wrapper, {
                    displayMode: isDisplay,
                    throwOnError: false,
                });
            } catch {
                // Fallback: show the raw delimited string
                wrapper.textContent = original;
            }

            frag.appendChild(wrapper);
            lastIdx = match.index + match[0].length;
        }

        // Remaining text after last match
        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        tn.replaceWith(frag);
    }
}