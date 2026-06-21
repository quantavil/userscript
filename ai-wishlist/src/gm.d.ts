declare function GM_getValue(key: string, defaultValue?: unknown): unknown;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_xmlhttpRequest(details: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  responseType?: string;
  onload?: (response: { responseText: string; response: any; status: number }) => void;
  onerror?: (error: unknown) => void;
}): void;
declare function GM_registerMenuCommand(name: string, fn: () => void, accessKey?: string): void;

declare module '*?inline' {
  const content: string;
  export default content;
}

