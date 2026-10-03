import { signal } from '@preact/signals';
import * as v from 'valibot';
import {
  defaultSettings,
  type ProviderId,
  type Settings,
  SettingsSchema,
  type SiteRule,
  SiteRuleSchema,
  type Stat,
  StatSchema,
  type Stats,
  StatsSchema,
  type WidgetUi,
} from './schema.ts';

export const KEYS = {
  settings: 'ucs:v2:settings',
  sites: 'ucs:v2:sites',
  migrated: 'ucs:v2:migrated-v1',
  stats: 'ucs:v2:stats',
} as const;

/** Minimal storage surface so the store can be unit-tested without GM_*. */
export interface KV {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
  keys(): string[];
}

export const gmKV: KV = {
  get: (key, fallback) => GM_getValue(key, fallback),
  // Values are plain JSON-compatible objects validated by valibot on the way in and out.
  set: (key, value) => GM_setValue(key, value as Parameters<typeof GM_setValue>[1]),
  keys: () => GM_listValues(),
};

export function parseSettings(raw: unknown): Settings {
  const res = v.safeParse(SettingsSchema, raw ?? {});
  return res.success ? res.output : defaultSettings();
}

/** Parses each rule independently so one corrupt entry can't wipe the rest. */
export function parseSites(raw: unknown): Record<string, SiteRule> {
  const out: Record<string, SiteRule> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [pattern, value] of Object.entries(raw)) {
    const res = v.safeParse(SiteRuleSchema, value);
    if (res.success) out[pattern] = res.output;
    else console.warn(`[ucs] dropped invalid rule "${pattern}"`);
  }
  return out;
}

export function parseStats(raw: unknown): Stats {
  const res = v.safeParse(StatsSchema, raw ?? {});
  return res.success ? res.output : {};
}

export type StatEvent = 'try' | 'answered' | 'error' | 'pass';

export function createStore(kv: KV) {
  const settings = signal<Settings>(parseSettings(kv.get(KEYS.settings, null)));
  const sites = signal<Record<string, SiteRule>>(parseSites(kv.get(KEYS.sites, null)));
  const stats = signal<Stats>(parseStats(kv.get(KEYS.stats, null)));

  const persistSites = (next: Record<string, SiteRule>) => {
    kv.set(KEYS.sites, next);
    sites.value = next;
  };

  return {
    kv,
    settings,
    sites,
    stats,

    patchSettings(patch: Partial<Settings>) {
      const next = { ...settings.value, ...patch };
      kv.set(KEYS.settings, next);
      settings.value = next;
    },
    setApiKey(provider: ProviderId, key: string) {
      this.patchSettings({ keys: { ...settings.value.keys, [provider]: key.trim() } });
    },
    setModel(provider: ProviderId, model: string) {
      this.patchSettings({ models: { ...settings.value.models, [provider]: model.trim() } });
    },
    setAudioModel(provider: ProviderId, model: string) {
      this.patchSettings({ audioModels: { ...settings.value.audioModels, [provider]: model.trim() } });
    },
    patchUi(patch: Partial<Settings['ui']>) {
      this.patchSettings({ ui: { ...settings.value.ui, ...patch } });
    },
    /** The widget's own state: the page's, or the separate one used inside iframes. */
    widgetUi(inFrame: boolean): WidgetUi {
      return inFrame ? settings.value.ui.frame : settings.value.ui;
    },
    patchWidgetUi(inFrame: boolean, patch: Partial<WidgetUi>) {
      if (inFrame) this.patchUi({ frame: { ...settings.value.ui.frame, ...patch } });
      else this.patchUi(patch);
    },

    /**
     * Counts one event per rule and model. Re-reads storage first: the challenge frame and the
     * checkbox frame write to the same key, and a stale copy would drop the other's counts.
     */
    recordStat(pattern: string, model: string, event: StatEvent, ms = 0) {
      const all = parseStats(kv.get(KEYS.stats, null));
      const perModel = { ...all[pattern] };
      const key = model || '?';
      const s: Stat = { ...v.parse(StatSchema, {}), ...perModel[key] };
      if (event === 'try') s.tries++;
      else if (event === 'answered') {
        s.answered++;
        s.ms += ms;
      } else if (event === 'error') s.errors++;
      else s.passes++;
      perModel[key] = s;
      const next = { ...all, [pattern]: perModel };
      kv.set(KEYS.stats, next);
      stats.value = next;
    },
    resetStats(pattern: string) {
      const { [pattern]: _gone, ...rest } = parseStats(kv.get(KEYS.stats, null));
      kv.set(KEYS.stats, rest);
      stats.value = rest;
    },

    /** Saves a rule; if `replaces` differs from `pattern` the old entry is removed (rename). */
    saveSite(pattern: string, rule: SiteRule, replaces?: string) {
      const next = { ...sites.value, [pattern]: rule };
      if (replaces && replaces !== pattern) delete next[replaces];
      persistSites(next);
    },
    removeSite(pattern: string) {
      const { [pattern]: _gone, ...rest } = sites.value;
      persistSites(rest);
    },
    mergeSites(incoming: Record<string, SiteRule>) {
      persistSites({ ...sites.value, ...incoming });
    },

    /** Re-read from storage (cross-tab change notifications). */
    reload() {
      settings.value = parseSettings(kv.get(KEYS.settings, null));
      sites.value = parseSites(kv.get(KEYS.sites, null));
      stats.value = parseStats(kv.get(KEYS.stats, null));
    },
  };
}
export type Store = ReturnType<typeof createStore>;
