import type { ProviderId } from '../config/schema.ts';
import type { Http } from '../net/http.ts';

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface TranscribeInput {
  audio: { mime: string; base64: string; blob: Blob };
  signal?: AbortSignal;
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
  /** Speech-to-text model used for audio captchas. Empty = use the vision model (Gemini is multimodal). */
  defaultAudioModel: string;
  suggestedAudioModels: readonly string[];
  /** Local servers (Ollama, LM Studio) need no key. */
  keyOptional?: boolean;
  /** Returns the model's raw text reply. */
  complete(cfg: ProviderConfig, input: CompleteInput): Promise<string>;
  /** Speech-to-text for audio captchas; `cfg.model` is the audio model. */
  transcribe(cfg: ProviderConfig, input: TranscribeInput): Promise<string>;
  listModels(cfg: ProviderConfig, signal?: AbortSignal): Promise<string[]>;
}

export type ProviderFactory = (http?: Http) => Provider;
