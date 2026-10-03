import type { ProviderId } from '../config/schema.ts';
import type { Http } from '../net/http.ts';
import { createGemini } from './gemini.ts';
import { createGroq } from './groq.ts';
import { createOpenAICompat } from './openai-compat.ts';
import type { Provider } from './types.ts';

export const createGenericOpenAI = createOpenAICompat({
  id: 'openai',
  label: 'OpenAI-compatible',
  keyHelpUrl: 'https://openrouter.ai/keys',
  defaultModel: '',
  suggestedModels: [],
  defaultBaseUrl: 'https://openrouter.ai/api/v1',
});

export function createProviders(http?: Http): Record<ProviderId, Provider> {
  return { gemini: createGemini(http), groq: createGroq(http), openai: createGenericOpenAI(http) };
}

export const providers = createProviders();
export type { Provider, ProviderConfig } from './types.ts';
