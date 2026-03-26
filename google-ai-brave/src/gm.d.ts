/**
 * Ambient declarations for Tampermonkey APIs, KaTeX (loaded via @require),
 * and third-party modules without bundled types.
 */

// ── Tampermonkey ────────────────────────────────────────────────────────

declare function GM_addStyle(css: string): HTMLStyleElement;

declare function GM_setValue(key: string, value: unknown): void;
declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;

declare function GM_getResourceText(name: string): string;

declare function GM_addValueChangeListener(
  key: string,
  callback: (
    key: string,
    oldValue: unknown,
    newValue: unknown,
    remote: boolean,
  ) => void,
): number;

declare function GM_removeValueChangeListener(listenerId: number): void;

interface GMTab {
  close(): void;
  closed: boolean;
  onclose: (() => void) | null;
}

declare function GM_openInTab(
  url: string,
  options?: { active?: boolean; insert?: boolean; setParent?: boolean },
): GMTab;

// ── KaTeX (loaded via @require from CDN) ────────────────────────────────

declare namespace katex {
  interface KatexOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    output?: "html" | "mathml" | "htmlAndMathml";
  }
  function render(
    latex: string,
    element: HTMLElement,
    options?: KatexOptions,
  ): void;
  function renderToString(latex: string, options?: KatexOptions): string;
}

// ── turndown-plugin-gfm (no @types package) ─────────────────────────────

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export function gfm(service: TurndownService): void;
  export function tables(service: TurndownService): void;
  export function strikethrough(service: TurndownService): void;
  export function taskListItems(service: TurndownService): void;
}