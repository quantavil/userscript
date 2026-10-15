declare function GM_getValue(key: string, defaultValue?: unknown): unknown;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_xmlhttpRequest(details: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  responseType?: string;
  timeout?: number;
  ontimeout?: () => void;
  onabort?: () => void;
  onload?: (response: { responseText: string; response: any; status: number }) => void;
  onerror?: (error: unknown) => void;
}): { abort(): void } | void;
declare function GM_registerMenuCommand(name: string, fn: () => void, accessKey?: string): void;

declare module "*?inline" {
  const content: string;
  export default content;
}

declare function GM_addValueChangeListener(
  key: string,
  callback: (key: string, oldValue: unknown, newValue: unknown, remote: boolean) => void,
): number;
declare function GM_removeValueChangeListener(id: number): void;
