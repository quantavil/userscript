/**
 * Card links open in a new tab. A plain left-click is intercepted and opens the video in a
 * new tab. Middle-click and modifier clicks keep their native behavior.
 */

export function hardenAnchor(a: HTMLAnchorElement): void {
  if (a.target !== '_blank') a.target = '_blank';
  const rel = (a.getAttribute('rel') || '').toLowerCase();
  if (!rel.includes('noopener')) a.setAttribute('rel', (rel ? `${rel} ` : '') + 'noopener');
}

export function hardenAnchorsIn(root: ParentNode): void {
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]')) hardenAnchor(a);
}

interface ClickModifiers {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Intercept only plain left-clicks. Other clicks already open tabs natively. */
export function shouldNewTabClick(e: ClickModifiers): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}

/** Our own controls sit inside card links and handle their own clicks. */
const OWN_CONTROLS = '.br34-mark, .br34-watch-btn';
let wired = false;

/** One delegated listener for the whole document. Repeat calls are no-ops. */
export function initNewTab(scope: ParentNode = document): void {
  hardenAnchorsIn(scope);
  if (wired) return;
  wired = true;
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest(OWN_CONTROLS)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href*="/video/"]');
      if (!anchor) return;
      hardenAnchor(anchor);
      if (!shouldNewTabClick(e)) return;
      e.preventDefault();
      e.stopPropagation();
      window.open(anchor.href, '_blank', 'noopener');
    },
    true,
  );
}
