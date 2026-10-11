import {
  GM_deleteValue,
  GM_download,
  GM_getValue,
  GM_listValues,
  GM_registerMenuCommand,
  GM_setValue,
  GM_xmlhttpRequest,
} from 'vite-plugin-monkey/dist/client';
import { type HttpClient, HttpRequestError, type HttpResponse, type KeyValueStore } from './gm';

export const gmStorage: KeyValueStore = {
  async get<T>(key: string, fallback: T): Promise<T> {
    return await Promise.resolve(GM_getValue(key, fallback));
  },
  async set(key: string, value: unknown): Promise<void> {
    await Promise.resolve(GM_setValue(key, value));
  },
  async delete(key: string): Promise<void> {
    await Promise.resolve(GM_deleteValue(key));
  },
  async keys(): Promise<string[]> {
    return await Promise.resolve(GM_listValues());
  },
};

export const gmHttp: HttpClient = {
  get(url: string, timeoutMs: number): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        timeout: timeoutMs,
        anonymous: true,
        // Cloudflare DoH only returns JSON for application/dns-json.
        headers: { Accept: 'application/dns-json, application/json, */*;q=0.5' },
        onload: (response) => resolve({ status: response.status, text: response.responseText }),
        onabort: () => reject(new HttpRequestError('request-aborted')),
        onerror: () => reject(new HttpRequestError('request-failed')),
        ontimeout: () => reject(new HttpRequestError('request-timeout')),
      });
    });
  },
};

export function registerMenu(label: string, callback: () => void | Promise<void>): void {
  GM_registerMenuCommand(label, () => void callback());
}

export function downloadJson(name: string, content: string): void {
  GM_download({
    name,
    saveAs: true,
    url: `data:application/json;charset=utf-8,${encodeURIComponent(content)}`,
  });
}
