// src/types.d.ts

interface GM_Response {
    responseText: string;
    status: number;
    statusText: string;
    responseHeaders: string;
}

interface GM_XHR_Details {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    data?: string;
    timeout?: number;
    onload?: (resp: GM_Response) => void;
    onerror?: (resp: GM_Response) => void;
    ontimeout?: () => void;
}

declare const GM_getValue: <T>(key: string, defaultValue?: T) => T;
declare const GM_setValue: <T>(key: string, value: T) => void;
declare const GM_registerMenuCommand: (name: string, onClick: () => void, shortcut?: string) => void;
declare const GM_xmlhttpRequest: (details: GM_XHR_Details) => void;

declare module '*.css?inline' {
    const content: string;
    export default content;
}

interface ImportMeta {
    readonly env: {
        readonly DEV: boolean;
    };
}
