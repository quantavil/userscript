import { createOpenAICompat } from './openai-compat.ts';

const NON_VISION = /whisper|orpheus|tts|guard|safeguard|embed|compound/i;

/**
 * Groq retires models every few months (Llama 4 Scout/Maverick were shut down in
 * Mar/Jul 2026), so the default is only a starting point; the model list is fetched live.
 */
export const createGroq = createOpenAICompat({
  id: 'groq',
  label: 'Groq',
  keyHelpUrl: 'https://console.groq.com/keys',
  defaultModel: 'qwen/qwen3.8-27b',
  suggestedModels: ['qwen/qwen3.8-27b'],
  defaultBaseUrl: 'https://api.groq.com/openai/v1',
  // Qwen3.x on Groq has a thinking mode; disabling it cuts latency for simple OCR.
  extraBody: (model) => (/^qwen\//.test(model) ? { reasoning_effort: 'none' } : {}),
  keepModel: (id) => !NON_VISION.test(id),
});
