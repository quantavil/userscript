import { HttpError, isAbort } from '../net/http.ts';
import { AnswerError } from './answer.ts';

/** Maps low-level failures to messages a user can act on. */
export function explainError(e: unknown): string {
  if (e instanceof HttpError) {
    switch (e.status) {
      case 0:
        return e.message === 'Request timed out' ? 'Request timed out' : 'Network error. Check your connection';
      case 400:
        return `Bad request: ${e.message}`;
      case 401:
      case 403:
        return 'API key rejected. Check it in Settings';
      case 404:
        return 'Model not found; it may have been retired. Pick another in Settings';
      case 429:
        return 'Rate limited. Wait a moment and retry';
      default:
        return e.status >= 500 ? `Provider error (${e.status}). Try again` : e.message;
    }
  }
  if (e instanceof AnswerError) return e.message;
  if (e instanceof SyntaxError) return 'Unexpected response from provider';
  return e instanceof Error ? e.message : String(e);
}

const retryable = (e: unknown) => e instanceof HttpError && (e.status === 0 || e.status === 429 || e.status >= 500);

/** Abortable delay. */
export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

/** Retries transient failures (network, 429, 5xx) with capped exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const { retries = 2, baseMs = 500, signal } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (isAbort(e) || attempt >= retries || !retryable(e)) throw e;
      const wait = e instanceof HttpError && e.retryAfterMs ? e.retryAfterMs : baseMs * 2 ** attempt;
      await sleep(Math.min(wait, 4000), signal);
    }
  }
}
