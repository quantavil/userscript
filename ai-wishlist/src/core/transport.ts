export interface TextRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: string;
  timeout: number;
  signal?: AbortSignal;
}
/** GM transport and fetch share status, timeout and cancellation semantics; no retries. */
export function requestText(options: TextRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let handle: ReturnType<typeof GM_xmlhttpRequest>;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const stop = () => {
      controller.abort();
      handle?.abort();
    };
    const abort = () => {
      fail(new DOMException("Request stopped", "AbortError"));
      stop();
    };
    const timer = setTimeout(() => {
      fail(new Error("Request timed out"));
      stop();
    }, options.timeout);
    const loaded = (status: number, text: string) => {
      if (settled) return;
      if (status < 200 || status >= 300) {
        fail(new Error(`HTTP ${status}`));
        return;
      }
      settled = true;
      cleanup();
      resolve(text);
    };
    if (options.signal?.aborted) {
      abort();
      return;
    }
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      if (typeof GM_xmlhttpRequest !== "undefined") {
        handle = GM_xmlhttpRequest({
          method: options.method ?? "GET",
          url: options.url,
          headers: options.headers,
          data: options.data,
          timeout: options.timeout,
          onload: (response) => loaded(response.status, response.responseText),
          onerror: () => fail(new Error("Network error")),
          ontimeout: () => {
            fail(new Error("Request timed out"));
            stop();
          },
          onabort: () => fail(new DOMException("Request stopped", "AbortError")),
        });
      } else {
        fetch(options.url, {
          method: options.method ?? "GET",
          headers: options.headers,
          body: options.data,
          signal: controller.signal,
        })
          .then(async (response) => loaded(response.status, await response.text()))
          .catch((error) => fail(error instanceof Error ? error : new Error("Network error")));
      }
    } catch (error) {
      fail(error instanceof Error ? error : new Error("Request failed"));
    }
  });
}
