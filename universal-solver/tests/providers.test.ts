import { describe, expect, test } from 'bun:test';
import { type Http, HttpError, type HttpRequest } from '../src/net/http.ts';
import { thinkingConfigFor } from '../src/providers/gemini.ts';
import { createProviders } from '../src/providers/index.ts';
import { configProblem } from '../src/solver/controller.ts';

const image = { mime: 'image/png', base64: 'AAAA' };
const cfg = (o = {}) => ({ apiKey: 'KEY', model: 'm', baseUrl: '', ...o });

function fakeHttp(...replies: (string | HttpError)[]) {
  const calls: HttpRequest[] = [];
  const http: Http = async (req) => {
    calls.push(req);
    const r = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (r instanceof HttpError) throw r;
    return { status: 200, text: r ?? '' };
  };
  return { http, calls };
}

describe('gemini', () => {
  const ok = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'AB12' }] } }] });

  test('sends the key in a header, never in the URL', async () => {
    const { http, calls } = fakeHttp(ok);
    await createProviders(http).gemini.complete(cfg({ model: 'gemini-3.5-flash' }), { image, prompt: 'p' });
    const req = calls[0] as HttpRequest;
    expect(req.url).not.toContain('KEY');
    expect(req.headers?.['x-goog-api-key']).toBe('KEY');
    expect(req.url).toContain('/models/gemini-3.5-flash:generateContent');
  });

  test('requests minimal thinking on Gemini 3 Flash models, not on Pro or others', () => {
    expect(thinkingConfigFor('gemini-3.5-flash')).toEqual({ thinkingConfig: { thinkingLevel: 'minimal' } });
    expect(thinkingConfigFor('gemini-3.1-pro-preview')).toEqual({});
    expect(thinkingConfigFor('gemma-3-27b-it')).toEqual({});
  });

  test('retries once without thinkingConfig if the model rejects it', async () => {
    const { http, calls } = fakeHttp(new HttpError('Unknown field thinking_config', 400), ok);
    const text = await createProviders(http).gemini.complete(cfg({ model: 'gemini-3.5-flash' }), {
      image,
      prompt: 'p',
    });
    expect(text).toBe('AB12');
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1]?.body ?? '{}')).generationConfig.thinkingConfig).toBeUndefined();
  });

  test('ignores thought parts and surfaces safety blocks', async () => {
    const thoughts = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'hmm', thought: true }, { text: 'Z9' }] } }],
    });
    const { http } = fakeHttp(thoughts);
    expect(await createProviders(http).gemini.complete(cfg(), { image, prompt: 'p' })).toBe('Z9');

    const blocked = fakeHttp(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(createProviders(blocked.http).gemini.complete(cfg(), { image, prompt: 'p' })).rejects.toThrow(
      /SAFETY/,
    );
  });

  test('lists only chat-capable gemini/gemma models', async () => {
    const body = JSON.stringify({
      models: [
        { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-embedding-2', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-bison', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemma-3-27b-it', supportedGenerationMethods: ['generateContent'] },
      ],
    });
    const { http } = fakeHttp(body);
    expect(await createProviders(http).gemini.listModels(cfg())).toEqual(['gemma-3-27b-it', 'gemini-3.5-flash']);
  });
});

describe('groq (OpenAI-compatible)', () => {
  const ok = JSON.stringify({ choices: [{ message: { content: 'K3PZ' } }] });

  test('posts an image_url data URI to the Groq endpoint with a bearer token', async () => {
    const { http, calls } = fakeHttp(ok);
    const text = await createProviders(http).groq.complete(
      cfg({ model: 'qwen/qwen3.8-27b', baseUrl: 'https://api.groq.com/openai/v1' }),
      { image, prompt: 'read' },
    );
    expect(text).toBe('K3PZ');
    const req = calls[0] as HttpRequest;
    expect(req.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(req.headers?.authorization).toBe('Bearer KEY');
    const body = JSON.parse(String(req.body ?? '{}'));
    expect(body.messages[0].content[1].image_url.url).toBe('data:image/png;base64,AAAA');
    expect(body.reasoning_effort).toBe('none');
  });

  test('drops provider-specific extras when the API rejects them', async () => {
    const { http, calls } = fakeHttp(new HttpError('reasoning_effort is not supported', 400), ok);
    await createProviders(http).groq.complete(cfg({ model: 'qwen/qwen3.8-27b' }), { image, prompt: 'p' });
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1]?.body ?? '{}')).reasoning_effort).toBeUndefined();
  });

  test('does not send reasoning_effort to non-Qwen models', async () => {
    const { http, calls } = fakeHttp(ok);
    await createProviders(http).groq.complete(cfg({ model: 'openai/gpt-oss-120b' }), { image, prompt: 'p' });
    expect(JSON.parse(String(calls[0]?.body ?? '{}')).reasoning_effort).toBeUndefined();
  });

  test('accepts array-style content parts', async () => {
    const { http } = fakeHttp(
      JSON.stringify({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'Q' },
                { type: 'text', text: '7' },
              ],
            },
          },
        ],
      }),
    );
    expect(await createProviders(http).groq.complete(cfg(), { image, prompt: 'p' })).toBe('Q7');
  });

  test('model list hides audio/guard/compound models', async () => {
    const { http } = fakeHttp(
      JSON.stringify({
        data: [
          { id: 'qwen/qwen3.8-27b' },
          { id: 'whisper-large-v3' },
          { id: 'groq/compound' },
          { id: 'openai/gpt-oss-safeguard-20b' },
        ],
      }),
    );
    expect(await createProviders(http).groq.listModels(cfg())).toEqual(['qwen/qwen3.8-27b']);
  });

  test('custom base URL (generic provider) is honoured and trailing slashes trimmed', async () => {
    const { http, calls } = fakeHttp(ok);
    await createProviders(http).openai.complete(cfg({ baseUrl: 'http://localhost:11434/v1/' }), { image, prompt: 'p' });
    expect(calls[0]?.url).toBe('http://localhost:11434/v1/chat/completions');
  });

  test('custom endpoint without a key sends no Authorization header (Ollama / LM Studio)', async () => {
    const { http, calls } = fakeHttp(ok);
    const p = createProviders(http).openai;
    expect(p.keyOptional).toBe(true);
    await p.complete(cfg({ apiKey: '', baseUrl: 'http://localhost:1234/v1' }), { image, prompt: 'p' });
    expect(calls[0]?.headers?.authorization).toBeUndefined();
  });

  test('OpenRouter is its own provider with a fixed URL', async () => {
    const { http, calls } = fakeHttp(ok);
    await createProviders(http).openrouter.complete(cfg({ baseUrl: 'https://openrouter.ai/api/v1' }), {
      image,
      prompt: 'p',
    });
    expect(calls[0]?.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(calls[0]?.headers?.authorization).toBe('Bearer KEY');
  });
});

describe('configProblem', () => {
  const p = createProviders();
  test('key required for hosted providers, optional for a custom endpoint, URL always required', () => {
    expect(configProblem(p.gemini, cfg({ apiKey: '', baseUrl: 'x' }))).toMatch(/API key/);
    expect(configProblem(p.openai, cfg({ apiKey: '', baseUrl: 'http://localhost:11434/v1' }))).toBeNull();
    expect(configProblem(p.openai, cfg({ apiKey: '', baseUrl: '' }))).toMatch(/endpoint URL/);
    expect(configProblem(p.openrouter, cfg({ model: '', baseUrl: 'x' }))).toMatch(/model/);
  });
  test('Gemini defaults to gemini-3.5-flash-lite', () => {
    expect(p.gemini.defaultModel).toBe('gemini-3.5-flash-lite');
  });
});

describe('speech-to-text', () => {
  const audio = { mime: 'audio/mpeg', base64: 'SUQz', blob: new Blob(['ID3'], { type: 'audio/mpeg' }) };
  const said = JSON.stringify({ text: 'seven nine' });

  test('Groq: multipart upload to /audio/transcriptions with the whisper model', async () => {
    const { http, calls } = fakeHttp(said);
    const p = createProviders(http).groq;
    expect(p.defaultAudioModel).toBe('whisper-large-v3-turbo');
    const out = await p.transcribe(
      cfg({ model: 'whisper-large-v3-turbo', baseUrl: 'https://api.groq.com/openai/v1' }),
      { audio },
    );
    expect(out).toBe('seven nine');
    expect(calls[0]?.url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    const form = calls[0]?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('model')).toBe('whisper-large-v3-turbo');
    expect(calls[0]?.headers?.['content-type']).toBeUndefined(); // the manager sets the multipart boundary
  });

  test('OpenRouter: JSON body with base64 input_audio and a short format name', async () => {
    const { http, calls } = fakeHttp(said);
    await createProviders(http).openrouter.transcribe(
      cfg({ model: 'openai/whisper-large-v3', baseUrl: 'https://openrouter.ai/api/v1' }),
      { audio },
    );
    expect(calls[0]?.url).toBe('https://openrouter.ai/api/v1/audio/transcriptions');
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      model: 'openai/whisper-large-v3',
      input_audio: { data: 'SUQz', format: 'mp3' },
    });
  });

  test('Gemini: the audio goes inline to generateContent with a transcription prompt', async () => {
    const { http, calls } = fakeHttp(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'seven' }] } }] }));
    expect(await createProviders(http).gemini.transcribe(cfg({ model: 'gemini-3.5-flash-lite' }), { audio })).toBe(
      'seven',
    );
    const body = JSON.parse(String(calls[0]?.body));
    expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: 'audio/mpeg', data: 'SUQz' });
    expect(body.contents[0].parts[0].text).toMatch(/audio CAPTCHA/);
  });
});
