/**
 * Per-Element State Store & Teardown Controller
 * Guarantees bit-for-bit DOM restoration upon exiting Reel Mode.
 * Preserves original inline styles, attributes, and aborts attached event listeners.
 */

interface ElementBackup {
  inlineStyle: string | null;
  attributes: Record<string, string | null>;
  abortController?: AbortController;
}

const backupStore = new WeakMap<HTMLElement, ElementBackup>();

/**
 * Backs up an element's original inline style and attributes before mutation.
 * Returns an AbortSignal that callers can pass to addEventListener.
 */
export function backupElementState(el: HTMLElement, attributesToTrack: string[] = []): AbortSignal {
  let record = backupStore.get(el);
  if (!record) {
    const originalAttrs: Record<string, string | null> = {};
    for (const attr of attributesToTrack) {
      originalAttrs[attr] = el.getAttribute(attr);
    }
    record = {
      inlineStyle: el.getAttribute('style'),
      attributes: originalAttrs,
      abortController: new AbortController(),
    };
    backupStore.set(el, record);
  }
  return record.abortController!.signal;
}

/**
 * Restores the element's exact original inline styles and tracked attributes,
 * and aborts all listeners registered under its AbortController.
 */
export function restoreElementState(el: HTMLElement): void {
  const record = backupStore.get(el);
  if (record) {
    if (record.abortController) {
      try { record.abortController.abort(); } catch {}
    }
    if (record.inlineStyle !== null) {
      el.setAttribute('style', record.inlineStyle);
    } else {
      el.removeAttribute('style');
    }
    for (const [attr, val] of Object.entries(record.attributes)) {
      if (val !== null) {
        el.setAttribute(attr, val);
      } else {
        el.removeAttribute(attr);
      }
    }
    backupStore.delete(el);
  }
}

/**
 * Cleanses all reddit-reels dataset properties and temporary state classes
 * from a post element and all its children.
 */
export function clearAllRrState(postEl: HTMLElement): void {
  const elements = [postEl, ...Array.from(postEl.querySelectorAll<HTMLElement>('*'))];
  for (const el of elements) {
    if (el.dataset) {
      const keys = Object.keys(el.dataset);
      for (const k of keys) {
        if (k.startsWith('rr') || k === 'reelPostId') {
          delete (el.dataset as any)[k];
        }
      }
    }
    restoreElementState(el);
  }
}
