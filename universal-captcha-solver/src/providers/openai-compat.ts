import { gmHttp, type Http, HttpError } from '../net/http.ts';
import { audioFormat } from '../solver/audio.ts';
import type { Provider } from './types.ts';

export interface CompatOptions {
  id: Provider['id'];
  label: string;
  keyHelpUrl: string;
  defaultModel: string;
  suggestedModels: readonly string[];
  defaultBaseUrl: string;
  keyOptional?: boolean;
  defaultAudioModel?: string;
  suggestedAudioModels?: readonly string[];
  /**
   * How /audio/transcriptions takes the file: OpenAI/Groq-style multipart upload, or
   * OpenRouter's JSON `{ input_audio: { data, format } }` with base64 audio.
   */
  sttBody?: 'multipart' | 'json';
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

export function parseTranscription(body: string): string {
  const text = (JSON.parse(body) as { text?: string }).text ?? '';
  if (!text.trim()) throw new Error('Empty transcription');
  return text;
}

export const createOpenAICompat =
  (opts: CompatOptions) =>
  (http: Http = gmHttp): Provider => {
    /** Endpoint + model + mode -> the optional-fields level that last worked (see `complete`). */
    const working = new Map<string, number>();
    const root = (baseUrl: string) => (baseUrl || opts.defaultBaseUrl).replace(/\/+$/, '');
    // No Authorization header at all without a key: some local servers reject "Bearer ".
    const auth = (key: string): Record<string, string> => (key ? { authorization: `Bearer ${key}` } : {});
    return {
      id: opts.id,
      label: opts.label,
      keyHelpUrl: opts.keyHelpUrl,
      defaultModel: opts.defaultModel,
      suggestedModels: opts.suggestedModels,
      defaultBaseUrl: opts.defaultBaseUrl,
      keyOptional: opts.keyOptional,
      defaultAudioModel: opts.defaultAudioModel ?? '',
      suggestedAudioModels: opts.suggestedAudioModels ?? [],

      async transcribe(cfg, { audio, signal }) {
        const url = `${root(cfg.baseUrl)}/audio/transcriptions`;
        if (opts.sttBody === 'json') {
          const res = await http({
            method: 'POST',
            url,
            headers: { 'content-type': 'application/json', ...auth(cfg.apiKey) },
            body: JSON.stringify({
              model: cfg.model,
              input_audio: { data: audio.base64, format: audioFormat(audio.mime) },
            }),
            timeout: 30_000,
            signal,
          });
          return parseTranscription(res.text);
        }
        const form = new FormData();
        form.append('file', audio.blob, `captcha.${audioFormat(audio.mime)}`);
        form.append('model', cfg.model);
        form.append('response_format', 'json');
        form.append('temperature', '0');
        const res = await http({ method: 'POST', url, headers: auth(cfg.apiKey), body: form, timeout: 30_000, signal });
        return parseTranscription(res.text);
      },

      async complete(cfg, { image, prompt, json, signal }) {
        // Optional body fields, most to least: JSON mode + provider extras, extras only, none.
        // A 400/422 steps down one level; the level that worked is remembered per endpoint+model.
        const extras = opts.extraBody?.(cfg.model) ?? {};
        const levels = [json ? { ...extras, response_format: { type: 'json_object' } } : extras, extras, {}].filter(
          (v, i, all) => i === 0 || Object.keys(v).length < Object.keys(all[i - 1] ?? {}).length,
        );
        const memo = `${root(cfg.baseUrl)} ${cfg.model} ${json ? 'json' : 'text'}`;
        const call = (fields: Record<string, unknown>) =>
          http({
            method: 'POST',
            url: `${root(cfg.baseUrl)}/chat/completions`,
            headers: { 'content-type': 'application/json', ...auth(cfg.apiKey) },
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
              ...fields,
            }),
            timeout: 25_000,
            signal,
          });
        for (let i = Math.min(working.get(memo) ?? 0, levels.length - 1); ; i++) {
          try {
            const reply = parseChatReply((await call(levels[i] ?? {})).text);
            working.set(memo, i);
            return reply;
          } catch (e) {
            const rejected = e instanceof HttpError && (e.status === 400 || e.status === 422);
            if (!rejected || i >= levels.length - 1) throw e;
          }
        }
      },

      async listModels(cfg, signal) {
        const res = await http({
          method: 'GET',
          url: `${root(cfg.baseUrl)}/models`,
          headers: auth(cfg.apiKey),
          signal,
        });
        const data = JSON.parse(res.text) as {
          data?: { id: string; architecture?: { input_modalities?: unknown } }[];
        };
        const keep = opts.keepModel ?? (() => true);
        // OpenRouter lists hundreds of models and says which take images; drop the text-only ones.
        const sees = (m: { architecture?: { input_modalities?: unknown } }) => {
          const mods = m.architecture?.input_modalities;
          return !Array.isArray(mods) || mods.includes('image');
        };
        return (data.data ?? [])
          .filter(sees)
          .map((m) => m.id)
          .filter(keep)
          .sort();
      },
    };
  };
