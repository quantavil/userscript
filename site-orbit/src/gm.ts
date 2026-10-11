export interface KeyValueStore {
  get<T>(key: string, fallback: T): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface HttpResponse {
  status: number;
  text: string;
}

export interface HttpClient {
  get(url: string, timeoutMs: number): Promise<HttpResponse>;
}

export type HttpErrorCode = 'request-aborted' | 'request-failed' | 'request-timeout';

export class HttpRequestError extends Error {
  constructor(readonly code: HttpErrorCode) {
    super(code);
    this.name = 'HttpRequestError';
  }
}
