/**
 * Optional AI tier. For fields heuristics couldn't confidently match, ask Gemini
 * to map each field DESCRIPTOR (never profile values) to a profile key or null.
 * One batched request per fill; results are cached by the caller as rules.
 */
import { Settings } from '../profile/store';
import { ALL_KEYS } from '../profile/schema';
import { log } from '../debug';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT = 15000;
const MAX_OPTIONS = 30;

export interface AiInput {
  index: number;
  descriptorText: string;
  type: string;
  options?: string[];
}

export type AiResult =
  | { ok: true; mapping: Map<number, string> }
  | { ok: false; error: string };

const SYSTEM = `You map web form fields to a fixed set of profile keys.
Given a JSON array of fields (index, descriptorText, type, options), return a JSON
array of {index, key} where key is EXACTLY one of the allowed keys or the string
"null" if no key fits. Only use allowed keys. Do not invent keys.
Allowed keys:
${ALL_KEYS.join('\n')}`;

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: { index: { type: 'INTEGER' }, key: { type: 'STRING' } },
    required: ['index', 'key'],
  },
};

export async function mapWithAI(inputs: AiInput[], settings: Settings): Promise<AiResult> {
  if (!settings.ai.enabled) return { ok: false, error: 'AI tier disabled' };
  if (!settings.ai.apiKey) return { ok: false, error: 'No API key set' };
  if (!inputs.length) return { ok: true, mapping: new Map() };

  const trimmed = inputs.map((i) => ({
    ...i,
    options: i.options?.slice(0, MAX_OPTIONS),
  }));

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ parts: [{ text: JSON.stringify(trimmed) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const url = `${ENDPOINT}/${encodeURIComponent(settings.ai.model)}:generateContent`;

  const first = await request(url, settings.ai.apiKey, body);
  if (!first.ok && first.retryable) {
    log('AI retrying after', first.error);
    const second = await request(url, settings.ai.apiKey, body);
    return parseOrError(second);
  }
  return parseOrError(first);
}

interface RawResult {
  ok: boolean;
  status: number;
  text: string;
  error?: string;
  retryable?: boolean;
}

function request(url: string, apiKey: string, body: string): Promise<RawResult> {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      data: body,
      timeout: TIMEOUT,
      onload: (res) => {
        const ok = res.status >= 200 && res.status < 300;
        resolve({
          ok,
          status: res.status,
          text: res.responseText,
          error: ok ? undefined : httpError(res.status, res.responseText),
          retryable: res.status >= 500,
        });
      },
      onerror: (res) => resolve({ ok: false, status: res.status ?? 0, text: '', error: 'network error', retryable: true }),
      ontimeout: () => resolve({ ok: false, status: 0, text: '', error: 'request timed out', retryable: true }),
    });
  });
}

function httpError(status: number, text: string): string {
  if (status === 400 || status === 403) return 'invalid API key or request';
  if (status === 429) return 'quota exceeded';
  const msg = safeApiMessage(text);
  return msg ? `Gemini ${status}: ${msg}` : `Gemini error ${status}`;
}

function safeApiMessage(text: string): string {
  try {
    return JSON.parse(text)?.error?.message ?? '';
  } catch {
    return '';
  }
}

function parseOrError(r: RawResult): AiResult {
  if (!r.ok) return { ok: false, error: r.error ?? 'request failed' };
  try {
    const outer = JSON.parse(r.text);
    const inner = outer?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!inner) return { ok: false, error: 'empty AI response' };
    const arr = JSON.parse(inner) as { index: number; key: string }[];
    const valid = new Set(ALL_KEYS);
    const mapping = new Map<number, string>();
    for (const { index, key } of arr) {
      if (key && key !== 'null' && valid.has(key)) mapping.set(index, key);
    }
    return { ok: true, mapping };
  } catch (e) {
    return { ok: false, error: `bad AI response: ${(e as Error).message}` };
  }
}
