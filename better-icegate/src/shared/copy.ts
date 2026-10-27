import { templateToHtml } from '../settings/template';
import css from './copy.css?inline';

export const copyIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="1.5"></rect><path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v10A1.5 1.5 0 0 0 5.5 16H8"></path></svg>';

export const templateIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3.5 6.5 8.5 6.5 8.5-6.5"></path></svg>';

export function ensureCopyStyles() {
  if (document.getElementById('better-icegate-copy-styles')) return;
  const style = document.createElement('style');
  style.id = 'better-icegate-copy-styles';
  style.textContent = css;
  document.head.append(style);
}

/** Copies HTML (a bordered table for Gmail) with a plain-text fallback. */
export async function copyRich(text: string): Promise<void> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard.write) throw new Error('rich clipboard unavailable');
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([templateToHtml(text)], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
  } catch {
    await navigator.clipboard.writeText(text);
  }
}
