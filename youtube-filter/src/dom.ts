declare const GM_addStyle: ((css: string) => HTMLStyleElement) | undefined;

/**
 * Type-safe querySelector shortcut.
 */
export const qs = <T extends Element = Element>(root: ParentNode, sel: string): T | null =>
  root.querySelector<T>(sel);

/**
 * Type-safe querySelectorAll shortcut.
 */
export const qsa = <T extends Element = Element>(root: ParentNode, sel: string): NodeListOf<T> =>
  root.querySelectorAll<T>(sel);

/**
 * Finds the first node whose trimmed textContent satisfies the predicate.
 */
export const byText = (nodes: Iterable<Element>, pred: (text: string) => boolean): string => {
  for (const n of nodes) {
    const t = (n.textContent || '').trim();
    if (t && pred(t)) return t;
  }
  return '';
};

/**
 * Trusted-Types-safe HTML-to-DocumentFragment parser.
 * Works on YouTube without violating Trusted Types policies.
 */
export function htmlToFragment(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const frag = document.createDocumentFragment();
  while (doc.body.firstChild) {
    frag.appendChild(doc.body.firstChild);
  }
  return frag;
}

/**
 * Safely sets element HTML without triggering Trusted Types sinks.
 */
export function setHTML(el: Element, html: string): void {
  el.replaceChildren(htmlToFragment(html));
}

/**
 * Safely injects CSS styles into document with Trusted Types safety.
 */
export function injectCSS(css: string): void {
  try {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }
  } catch {
    /* fallback to DOM style tag */
  }
  const style = document.createElement('style');
  style.id = 'yt-filter-styles';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

/**
 * Displays an inline validation error message below an input element.
 */
export const showInputError = (input: HTMLInputElement, message: string): void => {
  input.classList.add('error');
  const wrapper = input.closest('.ytf-input-wrapper');
  if (!wrapper) return;
  let errorMsg = wrapper.querySelector<HTMLElement>('.ytf-error-msg');
  if (!errorMsg) {
    errorMsg = document.createElement('div');
    errorMsg.className = 'ytf-error-msg';
    wrapper.appendChild(errorMsg);
  }
  errorMsg.textContent = message;
  errorMsg.classList.add('show');
};

/**
 * Clears any validation error state from an input element.
 */
export const clearInputError = (input: HTMLInputElement): void => {
  input.classList.remove('error');
  const wrapper = input.closest('.ytf-input-wrapper');
  const errorMsg = wrapper?.querySelector<HTMLElement>('.ytf-error-msg');
  if (errorMsg) {
    errorMsg.classList.remove('show');
  }
};
