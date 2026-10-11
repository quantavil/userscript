import { unsafeWindow } from '$';
import { CHECK_RE, parseCheck } from './failure';
import { clearFailure, setFailure } from './store';

export function currentSlug(): string | null {
  return location.pathname.match(/^\/problems\/([^/]+)/)?.[1] ?? null;
}

function record(slug: string | null, data: unknown): void {
  if (!slug) return;
  const result = parseCheck(slug, data);
  if (result?.kind === 'fail') setFailure(result.record);
  // A passing submission makes the old failing case irrelevant.
  else if (result?.kind === 'accepted') clearFailure(slug);
}

type Hooked = Window & typeof globalThis & { __blCapture?: boolean };

/**
 * Hook fetch + XHR in the page world to learn the result of every Submit.
 * Must run at document-start, before the app caches a reference to fetch.
 * Never throws and never alters the page's own request/response.
 */
export function installCapture(): void {
  const w = unsafeWindow as Hooked;
  if (w.__blCapture) return; // already installed (HMR, or two userscript managers)
  w.__blCapture = true;

  const origFetch = w.fetch;
  const patchedFetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const promise = origFetch.apply(this, args);
    try {
      const a0 = args[0];
      const url = typeof a0 === 'string' ? a0 : a0 instanceof Request ? a0.url : String(a0);
      if (CHECK_RE.test(url)) {
        const slug = currentSlug(); // taken now, not when the response lands (user may navigate away)
        promise
          .then((res) =>
            res
              .clone()
              .json()
              .then((d: unknown) => record(slug, d)),
          )
          .catch(() => {});
      }
    } catch {
      /* never break the page */
    }
    return promise;
  };
  w.fetch = patchedFetch as typeof fetch;

  const proto = w.XMLHttpRequest.prototype;
  const origOpen = proto.open;
  proto.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    try {
      if (CHECK_RE.test(String(url))) {
        const slug = currentSlug();
        this.addEventListener('load', () => {
          try {
            record(slug, JSON.parse(this.responseText));
          } catch {
            /* not JSON */
          }
        });
      }
    } catch {
      /* ignore */
    }
    // biome-ignore lint/suspicious/noExplicitAny: forwarding the overloaded native signature
    return (origOpen as any).call(this, method, url, ...rest);
  } as typeof proto.open;
}
