import type { ProviderId } from '../config/schema.ts';
import type { Http } from '../net/http.ts';
import { createGemini } from './gemini.ts';
import { createGroq } from './groq.ts';
import { createOpenAICompat } from './openai-compat.ts';
import type { Provider } from './types.ts';

export const createOpenRouter = createOpenAICompat({
  id: 'openrouter',
  label: 'OpenRouter',
  keyHelpUrl: 'https://openrouter.ai/keys',
  defaultModel: '',
  suggestedModels: [],
  defaultBaseUrl: 'https://openrouter.ai/api/v1',
});

/** Any OpenAI-compatible server; the URL comes from settings. */
export const createCustomEndpoint = createOpenAICompat({
  id: 'openai',
  label: 'Custom endpoint',
  keyHelpUrl: '',
  defaultModel: '',
  suggestedModels: [],
  defaultBaseUrl: '',
  keyOptional: true,
});

export function createProviders(http?: Http): Record<ProviderId, Provider> {
  return {
    gemini: createGemini(http),
    groq: createGroq(http),
    openrouter: createOpenRouter(http),
    openai: createCustomEndpoint(http),
  };
}

export const providers = createProviders();
export type { Provider, ProviderConfig } from './types.ts';
