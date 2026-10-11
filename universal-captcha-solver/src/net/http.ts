export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface HttpRequest {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  /** FormData is sent as multipart (the manager sets the boundary). */
  body?: string | FormData;
  responseType?: 'text' | 'blob';
  timeout?: number;
  signal?: AbortSignal;
}
export interface HttpResponse {
  status: number;
  text: string;
  blob?: Blob;
}
/** Injectable so providers can be tested without GM_xmlhttpRequest. */
export type Http = (req: HttpRequest) => Promise<HttpResponse>;

const abortError = () => new DOMException('Aborted', 'AbortError');
export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/** Pulls the human-readable message out of `{ error: { message } }` style bodies. */
export function errorMessageFromBody(text: string, status: number): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string } | string };
    const msg = typeof json.error === 'string' ? json.error : json.error?.message;
    if (msg) return msg.slice(0, 300);
  } catch {
    /* not JSON */
  }
  return `HTTP ${status}`;
}

function retryAfter(headers: string | undefined): number | undefined {
  const m = headers?.match(/^retry-after:\s*(\d+)/im);
  return m?.[1] ? Number(m[1]) * 1000 : undefined;
}

/** GM_xmlhttpRequest wrapped in a promise with AbortSignal support. */
export const gmHttp: Http = (req) =>
  new Promise((resolve, reject) => {
    if (req.signal?.aborted) return reject(abortError());

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      req.signal?.removeEventListener('abort', onAbort);
      fn();
    };

    const handle = GM_xmlhttpRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      data: req.body,
      responseType: req.responseType === 'blob' ? 'blob' : undefined,
      timeout: req.timeout ?? 15_000,
      onload: (r) =>
        finish(() => {
          let text = '';
          try {
            text = typeof r.responseText === 'string' ? r.responseText : '';
          } catch {
            /* responseText is inaccessible for blob responses in some managers */
          }
          if (r.status >= 200 && r.status < 300) {
            resolve({ status: r.status, text, blob: r.response instanceof Blob ? r.response : undefined });
          } else {
            reject(new HttpError(errorMessageFromBody(text, r.status), r.status, retryAfter(r.responseHeaders)));
          }
        }),
      onerror: () => finish(() => reject(new HttpError('Network error', 0))),
      ontimeout: () => finish(() => reject(new HttpError('Request timed out', 0))),
      onabort: () => finish(() => reject(abortError())),
    });

    function onAbort() {
      handle.abort();
      finish(() => reject(abortError()));
    }
    req.signal?.addEventListener('abort', onAbort, { once: true });
  });
