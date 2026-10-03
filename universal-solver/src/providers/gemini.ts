import { gmHttp, type Http, HttpError } from '../net/http.ts';
import { AUDIO_PROMPT } from '../solver/audio.ts';
import type { Provider } from './types.ts';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Gemini 3.x (except Pro) supports `minimal` thinking: lowest latency for plain OCR. */
export function thinkingConfigFor(model: string): Record<string, unknown> {
  return /^gemini-3/.test(model) && !/pro/.test(model) ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {};
}

interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

export function parseGeminiReply(body: string): string {
  const data = JSON.parse(body) as GeminiResponse;
  if (data.promptFeedback?.blockReason) throw new Error(`Blocked by Gemini: ${data.promptFeedback.blockReason}`);
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? [])
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join('');
  if (!text) {
    throw new Error(
      cand?.finishReason === 'MAX_TOKENS' ? 'Model ran out of tokens before answering' : 'Empty response from Gemini',
    );
  }
  return text;
}

type Media = { mime_type: string; data: string };

async function generate(
  http: Http,
  cfg: { apiKey: string; model: string },
  prompt: string,
  media: Media,
  signal?: AbortSignal,
): Promise<string> {
  const model = cfg.model.replace(/^models\//, '');
  const body = (withThinking: boolean) =>
    JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: media }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 256, ...(withThinking ? thinkingConfigFor(model) : {}) },
    });
  // Key goes in a header, never in the URL (URLs end up in logs and referrers).
  const call = (b: string) =>
    http({
      method: 'POST',
      url: `${BASE}/models/${encodeURIComponent(model)}:generateContent`,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: b,
      timeout: 20_000,
      signal,
    });
  try {
    return parseGeminiReply((await call(body(true))).text);
  } catch (e) {
    // Some models reject thinkingConfig; retry once without it.
    if (e instanceof HttpError && e.status === 400 && /thinking/i.test(e.message)) {
      return parseGeminiReply((await call(body(false))).text);
    }
    throw e;
  }
}

const NOT_CHAT = /embedding|image|tts|live|audio|robotics|veo|imagen|aqa|computer-use|deep-research/;

export const createGemini = (http: Http = gmHttp): Provider => ({
  id: 'gemini',
  label: 'Google Gemini',
  keyHelpUrl: 'https://aistudio.google.com/apikey',
  defaultModel: 'gemini-3.5-flash-lite',
  suggestedModels: ['gemini-3.5-flash-lite', 'gemini-3.5-flash'],
  defaultBaseUrl: BASE,
  // Gemini hears audio natively, so the vision model doubles as the speech-to-text model.
  defaultAudioModel: '',
  suggestedAudioModels: [],

  complete(cfg, { image, prompt, signal }) {
    return generate(http, cfg, prompt, { mime_type: image.mime, data: image.base64 }, signal);
  },

  async transcribe(cfg, { audio, signal }) {
    return generate(http, cfg, AUDIO_PROMPT, { mime_type: audio.mime, data: audio.base64 }, signal);
  },

  async listModels(cfg, signal) {
    const out: string[] = [];
    let pageToken = '';
    for (let page = 0; page < 3; page++) {
      const res = await http({
        method: 'GET',
        url: `${BASE}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
        headers: { 'x-goog-api-key': cfg.apiKey },
        signal,
      });
      const data = JSON.parse(res.text) as {
        models?: { name: string; supportedGenerationMethods?: string[] }[];
        nextPageToken?: string;
      };
      for (const m of data.models ?? []) {
        const id = m.name.replace(/^models\//, '');
        if (
          /^(gemini|gemma)-/.test(id) &&
          !NOT_CHAT.test(id) &&
          m.supportedGenerationMethods?.includes('generateContent')
        ) {
          out.push(id);
        }
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return out.sort().reverse();
  },
});
