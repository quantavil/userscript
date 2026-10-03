import { gmHttp, type Http, HttpError } from '../net/http.ts';
import type { Provider } from './types.ts';

export interface CompatOptions {
  id: Provider['id'];
  label: string;
  keyHelpUrl: string;
  defaultModel: string;
  suggestedModels: readonly string[];
  defaultBaseUrl: string;
  /** Provider-specific body fields (e.g. disable reasoning). Dropped automatically if the API rejects them. */
  extraBody?: (model: string) => Record<string, unknown>;
  /** Filters /models output down to plausible chat models. */
  keepModel?: (id: string) => boolean;
}

interface ChatResponse {
  choices?: { message?: { content?: string | { type?: string; text?: string }[] | null } }[];
}

export function parseChatReply(body: string): string {
  const content = (JSON.parse(body) as ChatResponse).choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((p) => p.text ?? '').join('') : (content ?? '');
  if (!text.trim()) throw new Error('Empty response from model');
  return text;
}

export const createOpenAICompat =
  (opts: CompatOptions) =>
  (http: Http = gmHttp): Provider => {
    const root = (baseUrl: string) => (baseUrl || opts.defaultBaseUrl).replace(/\/+$/, '');
    return {
      id: opts.id,
      label: opts.label,
      keyHelpUrl: opts.keyHelpUrl,
      defaultModel: opts.defaultModel,
      suggestedModels: opts.suggestedModels,
      defaultBaseUrl: opts.defaultBaseUrl,

      async complete(cfg, { image, prompt, signal }) {
        const extras = opts.extraBody?.(cfg.model) ?? {};
        const call = (withExtras: boolean) =>
          http({
            method: 'POST',
            url: `${root(cfg.baseUrl)}/chat/completions`,
            headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
            body: JSON.stringify({
              model: cfg.model,
              temperature: 0,
              max_tokens: 256,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.base64}` } },
                  ],
                },
              ],
              ...(withExtras ? extras : {}),
            }),
            timeout: 25_000,
            signal,
          });
        try {
          return parseChatReply((await call(true)).text);
        } catch (e) {
          const rejected = e instanceof HttpError && (e.status === 400 || e.status === 422);
          if (rejected && Object.keys(extras).length > 0) return parseChatReply((await call(false)).text);
          throw e;
        }
      },

      async listModels(cfg, signal) {
        const res = await http({
          method: 'GET',
          url: `${root(cfg.baseUrl)}/models`,
          headers: { authorization: `Bearer ${cfg.apiKey}` },
          signal,
        });
        const data = JSON.parse(res.text) as { data?: { id: string }[] };
        const keep = opts.keepModel ?? (() => true);
        return (data.data ?? [])
          .map((m) => m.id)
          .filter(keep)
          .sort();
      },
    };
  };
