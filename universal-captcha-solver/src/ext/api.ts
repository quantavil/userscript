/**
 * The slice of the WebExtension API this extension uses. Firefox exposes promise-based `browser`;
 * Chromium exposes `chrome` (promise-based in MV3 for the calls used here). Typed by hand to avoid
 * a types dependency for ~10 calls.
 */
export interface Port {
  name: string;
  postMessage(msg: unknown): void;
  disconnect(): void;
  onMessage: { addListener(fn: (msg: never) => void): void };
  onDisconnect: { addListener(fn: () => void): void };
}
type StorageChange = { oldValue?: unknown; newValue?: unknown };

export interface ExtApi {
  runtime: {
    connect(info: { name: string }): Port;
    onConnect: { addListener(fn: (port: Port) => void): void };
    onMessage: {
      addListener(
        fn: (msg: unknown, sender: unknown, sendResponse: (res: unknown) => void) => boolean | undefined,
      ): void;
    };
  };
  storage: {
    local: { get(keys: null): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> };
    onChanged: { addListener(fn: (changes: Record<string, StorageChange>, area: string) => void): void };
  };
  tabs: {
    query(q: { active: boolean; currentWindow: boolean }): Promise<{ id?: number; url?: string }[]>;
    sendMessage(tabId: number, msg: unknown, opts: { frameId: number }): Promise<unknown>;
  };
  permissions: {
    contains(p: { origins: string[] }): Promise<boolean>;
    request(p: { origins: string[] }): Promise<boolean>;
  };
}

const g = globalThis as unknown as { browser?: ExtApi; chrome?: ExtApi };
export const ext = (g.browser ?? g.chrome) as ExtApi;

export const HTTP_PORT = 'ucs-http';
export const MENU_MESSAGE = 'ucs-menu';

/** Messages cross the extension boundary as JSON in Chromium, so binary goes as base64. */
export interface WireFile {
  b64: string;
  type: string;
  name?: string;
}
export type WireBody =
  | { kind: 'text'; text: string }
  | { kind: 'form'; parts: { name: string; text?: string; file?: WireFile }[] };

export interface WireRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: WireBody;
  blob: boolean;
  timeout: number;
}
export type WireResponse =
  | { ok: true; status: number; text: string; headers: string; blob?: WireFile }
  | { ok: false; error: 'network' | 'timeout'; message: string };

export async function toWire(blob: Blob, name?: string): Promise<WireFile> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(bin), type: blob.type, name };
}

export function fromWire(f: WireFile): Blob {
  const bin = atob(f.b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: f.type });
}
