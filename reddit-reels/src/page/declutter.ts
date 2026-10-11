/**
 * Mobile Reddit's "use the app" detours, removed from the page itself:
 * - post, user and subreddit links point at applink.reddit.com, an Android App
 *   Link / iOS Universal Link: tapping one launches the Reddit app (or the
 *   store) instead of opening the page. They are rewritten to www.reddit.com,
 *   the URL the same link has on desktop;
 * - the header "Open App" button and "View in app" buttons go.
 * Nothing here touches content gates.
 */

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_name',
  'utm_term',
  'utm_content',
  'mweb_loid',
  'ext-referrer',
];

const CSS = `
#xpromo-small-header, #open-app-header-cta,
a[name="app-link"][href*="onelink.me"] { display: none !important; }
`;

/** www.reddit.com equivalent of an app link, or null if `href` isn't one. */
export function webUrlFor(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, location.href);
  } catch {
    return null;
  }
  if (url.hostname !== 'applink.reddit.com') return null;
  url.protocol = 'https:';
  url.hostname = 'www.reddit.com';
  for (const p of TRACKING_PARAMS) url.searchParams.delete(p);
  return url.href;
}

function fixAnchor(a: Element): void {
  const href = a.getAttribute('href');
  if (!href?.includes('applink.')) return;
  const web = webUrlFor(href);
  if (web) a.setAttribute('href', web);
}

function fixTree(root: ParentNode): void {
  root.querySelectorAll('a[href*="applink.reddit.com"]').forEach(fixAnchor);
}

let started = false;

export function startDeclutter(): void {
  if (started) return;
  started = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  // Last line of defence: a link not rewritten yet (or inside a shadow root)
  // is fixed on the way to its click handler. Window capture runs before Reddit's.
  const onActivate = (e: Event) => {
    for (const node of e.composedPath()) {
      if (node instanceof Element && node.tagName === 'A') {
        fixAnchor(node);
        break;
      }
    }
  };
  window.addEventListener('click', onActivate, true);
  window.addEventListener('auxclick', onActivate, true);
  window.addEventListener('contextmenu', onActivate, true);

  fixTree(document);
  // Feed pages stream new posts in; rewrite them as they arrive.
  let pending = false;
  new MutationObserver((records) => {
    if (pending) return;
    if (!records.some((r) => r.addedNodes.length)) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      fixTree(document);
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
}
