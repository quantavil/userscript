import { describe, expect, test } from 'bun:test';
import { migrateV1 } from '../src/config/migrate.ts';
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
    const rule = {
      captcha: '#a',
      input: '#b',
      submit: '',
      kind: 'text',
      charset: 'alnum',
      caseMode: 'keep',
      minLength: 3,
      maxLength: 0,
      hint: '',
      auto: true,
      enabled: true,
    } as const;
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
