import { KEYS, type KV, parseSettings, parseSites } from './store.ts';

const V1_KEY = 'gemini_api_key';
const V1_MODEL = 'gemini_model';
const V1_DEFAULT_MODEL = 'gemma-3-27b-it';

/**
 * One-time import of v1 data. v1 stored everything flat in GM storage:
 * two settings keys plus one JSON-string entry per site pattern.
 * The legacy keys are left untouched (non-destructive; allows downgrade).
 */
export function migrateV1(kv: KV): { sites: number; apiKey: boolean } {
  if (kv.get(KEYS.migrated, false)) return { sites: 0, apiKey: false };

  const settings = parseSettings(kv.get(KEYS.settings, null));
  const apiKey = kv.get<string>(V1_KEY, '');
  const model = kv.get<string>(V1_MODEL, '');
  if (apiKey && !settings.keys.gemini) settings.keys.gemini = apiKey;
  // v1's default model has been superseded; only carry over deliberate choices.
  if (model && model !== V1_DEFAULT_MODEL && !settings.models.gemini) settings.models.gemini = model;

  const legacy: Record<string, unknown> = {};
  for (const key of kv.keys()) {
    if (key.startsWith('ucs:') || key === V1_KEY || key === V1_MODEL) continue;
    const raw = kv.get<unknown>(key, null);
    if (typeof raw !== 'string' || !raw.startsWith('{')) continue;
    try {
      const old = JSON.parse(raw) as { captchaSelector?: string; inputSelector?: string };
      if (old.captchaSelector && old.inputSelector) {
        legacy[key] = { captcha: old.captchaSelector, input: old.inputSelector };
      }
    } catch {
      /* skip unparseable legacy entry */
    }
  }
  const sites = { ...parseSites(kv.get(KEYS.sites, null)), ...parseSites(legacy) };

  kv.set(KEYS.settings, settings);
  kv.set(KEYS.sites, sites);
  kv.set(KEYS.migrated, true);
  return { sites: Object.keys(legacy).length, apiKey: Boolean(apiKey) };
}

const OPENROUTER = 'openrouter.ai';

/**
 * v2.0 had one "OpenAI-compatible" provider whose URL defaulted to OpenRouter. OpenRouter is now
 * its own provider and the custom endpoint has no default URL, so move those users across before
 * the new default ('') would silently break them. Idempotent: it only fires while the stored URL
 * is missing or still points at OpenRouter.
 */
export function migrateOpenRouter(kv: KV): boolean {
  const raw = kv.get<Record<string, unknown> | null>(KEYS.settings, null);
  if (!raw || typeof raw !== 'object') return false;
  const url = raw.openaiBaseUrl;
  if (!(url === undefined || (typeof url === 'string' && url.includes(OPENROUTER)))) return false;

  const keys = { ...(raw.keys as Record<string, string> | undefined) };
  const models = { ...(raw.models as Record<string, string> | undefined) };
  const moved = Boolean(keys.openai || raw.provider === 'openai');
  if (keys.openai && !keys.openrouter) keys.openrouter = keys.openai;
  if (models.openai && !models.openrouter) models.openrouter = models.openai;
  delete keys.openai;
  delete models.openai;
  kv.set(KEYS.settings, {
    ...raw,
    provider: raw.provider === 'openai' ? 'openrouter' : raw.provider,
    keys,
    models,
    openaiBaseUrl: '',
  });
  return moved;
}
