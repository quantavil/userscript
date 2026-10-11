import type { HttpClient, HttpResponse, KeyValueStore } from './gm';
import { HttpRequestError } from './gm';

interface ExtensionStorageArea {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

interface ExtensionApi {
  storage?: {
    local?: ExtensionStorageArea;
  };
}

const api =
  (globalThis as unknown as { browser?: ExtensionApi; chrome?: ExtensionApi }).browser ??
  (globalThis as unknown as { chrome?: ExtensionApi }).chrome;

export const extensionStorage: KeyValueStore = {
  async get<T>(key: string, fallback: T): Promise<T> {
    if (!api?.storage?.local) return fallback;
    const res = await api.storage.local.get(key);
    return res[key] !== undefined ? (res[key] as T) : fallback;
  },
  async set(key: string, value: unknown): Promise<void> {
    if (!api?.storage?.local) return;
    await api.storage.local.set({ [key]: value });
  },
  async delete(key: string): Promise<void> {
    if (!api?.storage?.local) return;
    await api.storage.local.remove(key);
  },
  async keys(): Promise<string[]> {
    if (!api?.storage?.local) return [];
    const all = await api.storage.local.get(null);
    return Object.keys(all);
  },
};

export const extensionHttp: HttpClient = {
  async get(url: string, timeoutMs: number): Promise<HttpResponse> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json,text/plain,*/*' },
      });
      const text = await response.text();
      return { status: response.status, text };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new HttpRequestError('request-timeout');
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new HttpRequestError('request-aborted');
      }
      throw new HttpRequestError('request-failed');
    }
  },
};

export function downloadJson(name: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 100);
}
