declare const GM_getValue: <T>(key: string, defaultValue?: T) => T;
declare const GM_setValue: <T>(key: string, value: T) => void;
declare const GM_deleteValue: (key: string) => void;
declare const GM_registerMenuCommand: (name: string, onClick: () => void, shortcut?: string) => void;

interface GMXHRResponse {
  status: number;
  statusText: string;
  responseText: string;
}

interface GMXHRDetails {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
  responseType?: string;
  onload?: (res: GMXHRResponse) => void;
  onerror?: (res: Partial<GMXHRResponse>) => void;
  ontimeout?: () => void;
}

declare const GM_xmlhttpRequest: (details: GMXHRDetails) => void;
