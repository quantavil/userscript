import type { ProviderId } from '../config/schema.ts';
import type { Http } from '../net/http.ts';

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface CompleteInput {
  image: { mime: string; base64: string };
  prompt: string;
  signal?: AbortSignal;
}

export interface Provider {
  id: ProviderId;
  label: string;
  keyHelpUrl: string;
  defaultModel: string;
  /** Shown before (or instead of) a live model listing. */
  suggestedModels: readonly string[];
  defaultBaseUrl: string;
  /** Local servers (Ollama, LM Studio) need no key. */
  keyOptional?: boolean;
  /** Returns the model's raw text reply. */
  complete(cfg: ProviderConfig, input: CompleteInput): Promise<string>;
  listModels(cfg: ProviderConfig, signal?: AbortSignal): Promise<string[]>;
}

export type ProviderFactory = (http?: Http) => Provider;
