import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { findBestRule } from '../src/config/match.ts';
import { migrateOpenRouter, migrateV1 } from '../src/config/migrate.ts';
import { PRESETS, presetRules, presetState } from '../src/config/presets.ts';
import { SiteRuleSchema } from '../src/config/schema.ts';
import { createStore, KEYS, type KV } from '../src/config/store.ts';

const memoryKV = (seed: Record<string, unknown> = {}): KV & { data: Map<string, unknown> } => {
  const data = new Map(Object.entries(seed));
  return {
    data,
    get: <T>(k: string, d: T) => (data.has(k) ? (data.get(k) as T) : d),
    set: (k, v) => void data.set(k, structuredClone(v)),
    keys: () => [...data.keys()],
  };
};

describe('store', () => {
  test('defaults when storage is empty or corrupt', () => {
    expect(createStore(memoryKV()).settings.value.provider).toBe('gemini');
    expect(createStore(memoryKV({ [KEYS.settings]: 'garbage' })).settings.value.autoSolve).toBe(true);
  });

  test('one corrupt rule does not discard the others', () => {
    const kv = memoryKV({
      [KEYS.sites]: { 'good.com': { captcha: '#a', input: '#b' }, 'bad.com': { captcha: 42 } },
    });
    expect(Object.keys(createStore(kv).sites.value)).toEqual(['good.com']);
  });

  test('persists API keys per provider and trims them', () => {
    const kv = memoryKV();
    const s = createStore(kv);
    s.setApiKey('groq', '  gsk_123 \n');
    s.setApiKey('gemini', 'AIza');
    expect(createStore(kv).settings.value.keys).toEqual({ groq: 'gsk_123', gemini: 'AIza' });
  });

  test('renaming a rule removes the old pattern', () => {
    const s = createStore(memoryKV());
    const rule = v.parse(SiteRuleSchema, { captcha: '#a', input: '#b' });
    s.saveSite('old.com', rule);
    s.saveSite('new.com', rule, 'old.com');
    expect(Object.keys(s.sites.value)).toEqual(['new.com']);
  });
});

describe('v1 migration', () => {
  const v1 = () =>
    memoryKV({
      gemini_api_key: 'AIzaOLD',
      gemini_model: 'gemma-3-27b-it',
      'site.com/login': JSON.stringify({ captchaSelector: '#c', inputSelector: '#i', isCanvas: false }),
      'other.com': JSON.stringify({ captchaSelector: 'img.x', inputSelector: 'input.y' }),
      junk: 'not json',
    });

  test('imports key and sites, drops the superseded default model', () => {
    const kv = v1();
    const res = migrateV1(kv);
    expect(res).toEqual({ sites: 2, apiKey: true });
    const s = createStore(kv);
    expect(s.settings.value.keys.gemini).toBe('AIzaOLD');
    expect(s.settings.value.models.gemini).toBeUndefined();
    expect(s.sites.value['site.com/login']?.captcha).toBe('#c');
  });

  test('keeps a deliberately chosen model', () => {
    const kv = v1();
    kv.set('gemini_model', 'gemini-3.5-flash');
    migrateV1(kv);
    expect(createStore(kv).settings.value.models.gemini).toBe('gemini-3.5-flash');
  });

  test('is idempotent and non-destructive', () => {
    const kv = v1();
    migrateV1(kv);
    expect(migrateV1(kv)).toEqual({ sites: 0, apiKey: false });
    expect(kv.data.has('gemini_api_key')).toBe(true);
  });

  test('a reserved v1 key name cannot be smuggled in as a site (v1 import bug)', () => {
    const kv = memoryKV({ gemini_api_key: JSON.stringify({ captchaSelector: 'a', inputSelector: 'b' }) });
    migrateV1(kv);
    expect(Object.keys(createStore(kv).sites.value)).not.toContain('gemini_api_key');
  });
});

describe('OpenRouter split (v2.0 -> v2.1)', () => {
  test('a v2.0 "OpenAI-compatible" user on the OpenRouter default moves to the OpenRouter provider', () => {
    const kv = memoryKV({
      [KEYS.settings]: {
        provider: 'openai',
        keys: { openai: 'sk-or', gemini: 'G' },
        models: { openai: 'qwen/qwen3-vl' },
        openaiBaseUrl: 'https://openrouter.ai/api/v1',
      },
    });
    expect(migrateOpenRouter(kv)).toBe(true);
    const s = createStore(kv).settings.value;
    expect(s.provider).toBe('openrouter');
    expect(s.keys).toEqual({ gemini: 'G', openrouter: 'sk-or' });
    expect(s.models.openrouter).toBe('qwen/qwen3-vl');
    expect(s.openaiBaseUrl).toBe('');
    expect(migrateOpenRouter(kv)).toBe(false); // idempotent
  });
  test('a real custom endpoint is left alone', () => {
    const settings = { provider: 'openai', keys: { openai: 'x' }, openaiBaseUrl: 'http://localhost:11434/v1' };
    const kv = memoryKV({ [KEYS.settings]: settings });
    expect(migrateOpenRouter(kv)).toBe(false);
    expect(kv.data.get(KEYS.settings)).toEqual(settings);
  });
});

describe('reCAPTCHA v2 preset', () => {
  const { sites } = PRESETS[0] as (typeof PRESETS)[number];
  const at = (host: string, pathname: string) => findBestRule(sites, { hostname: host, host, pathname });
  test('matches the challenge frame on both Google hosts, api2 and enterprise', () => {
    expect(at('www.google.com', '/recaptcha/api2/bframe')?.rule.kind).toBe('grid');
    expect(at('www.google.com', '/recaptcha/enterprise/bframe')).not.toBeNull();
    expect(at('www.recaptcha.net', '/recaptcha/api2/bframe')).not.toBeNull();
    expect(at('www.google.com', '/search')).toBeNull();
  });
  test('needs no answer box and auto-sizes the grid', () => {
    const rule = sites['www.google.com/recaptcha/*'];
    expect(rule).toMatchObject({ input: '', gridSize: 0, submit: '#recaptcha-verify-button' });
  });
});

describe('preset updates', () => {
  const preset = PRESETS[0] as (typeof PRESETS)[number];
  test('an older copy is "outdated"; updating keeps the user\'s own choices', () => {
    const key = 'www.google.com/recaptcha/*';
    const old = {
      ...preset.sites[key],
      audioSource: '',
      solveBy: 'image',
      autoCheckbox: true,
      enabled: false,
    } as never;
    const sites = { ...preset.sites, [key]: old };
    expect(presetState(preset, {})).toBe('missing');
    expect(presetState(preset, sites)).toBe('outdated');
    const next = presetRules(preset, sites);
    expect(next[key]).toMatchObject({ audioSource: '#audio-source', autoCheckbox: true, enabled: false });
    expect(presetState(preset, { ...sites, ...next })).toBe('current');
  });
  test('reCAPTCHA preset ships audio and checkbox selectors, with auto-tick off', () => {
    expect(preset.sites['www.google.com/recaptcha/*']).toMatchObject({
      audioButton: '#recaptcha-audio-button',
      audioInput: '#audio-response',
      checkbox: '#recaptcha-anchor',
      autoCheckbox: false,
      solveBy: 'image',
    });
  });
});
