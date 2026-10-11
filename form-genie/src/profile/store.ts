/**
 * Persistence layer over GM storage. All reads/writes to profile, settings,
 * per-site rules, and FAB position funnel through here so key names and schema
 * versioning live in one place.
 */
import { PROFILE_VERSION, StoredProfile, emptyProfile, ProfileData } from './schema';

const K_PROFILE = 'fg:profile';
const K_SETTINGS = 'fg:settings';
const K_FAB = 'fg:fab';
const rulesKey = (host: string) => `fg:rules:${host}`;

export interface Settings {
  overwrite: boolean;
  debug: boolean;
  ai: {
    enabled: boolean;
    apiKey: string;
    model: string;
  };
  /** Opt-in model: the script stays dormant except on these hostnames. */
  enabledSites: string[];
}

export type RuleSource = 'teach' | 'ai';

export interface Rule {
  fingerprint: string;
  occurrence: number;
  key: string;
  source: RuleSource;
  ts: number;
}

const DEFAULT_SETTINGS: Settings = {
  overwrite: false,
  debug: false,
  ai: { enabled: false, apiKey: '', model: 'gemini-3.1-flash-lite' },
  enabledSites: [],
};

// ---- Profile --------------------------------------------------------------

export function loadProfile(): StoredProfile {
  const raw = GM_getValue<StoredProfile | null>(K_PROFILE, null);
  if (!raw || typeof raw !== 'object') return emptyProfile();
  return migrateProfile(raw);
}

export function saveProfile(data: ProfileData): void {
  const clean: ProfileData = {};
  for (const [k, v] of Object.entries(data)) {
    const s = (v ?? '').toString().trim();
    if (s) clean[k] = s;
  }
  GM_setValue<StoredProfile>(K_PROFILE, { v: PROFILE_VERSION, data: clean });
}

/** Placeholder migration hook — bumps versions forward without data loss. */
function migrateProfile(p: StoredProfile): StoredProfile {
  let cur = p;
  if (typeof cur.v !== 'number') cur = { v: PROFILE_VERSION, data: cur.data ?? {} };
  // Future: if (cur.v === 1) { ...; cur = { v: 2, data }; }
  return cur;
}

// ---- Settings -------------------------------------------------------------

export function loadSettings(): Settings {
  const raw = GM_getValue<Partial<Settings> | null>(K_SETTINGS, null);
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    ai: { ...DEFAULT_SETTINGS.ai, ...raw?.ai },
    enabledSites: raw?.enabledSites ?? [],
  };
}

export function saveSettings(s: Settings): void {
  GM_setValue<Settings>(K_SETTINGS, s);
}

export function isSiteEnabled(host: string): boolean {
  return loadSettings().enabledSites.includes(host);
}

export function setSiteEnabled(host: string, enabled: boolean): void {
  const s = loadSettings();
  const i = s.enabledSites.indexOf(host);
  if (enabled && i < 0) s.enabledSites.push(host);
  if (!enabled && i >= 0) s.enabledSites.splice(i, 1);
  saveSettings(s);
}

// ---- Rules ----------------------------------------------------------------

export function loadRules(host: string): Rule[] {
  return GM_getValue<Rule[]>(rulesKey(host), []) ?? [];
}

export function saveRules(host: string, rules: Rule[]): void {
  GM_setValue<Rule[]>(rulesKey(host), rules);
}

export function upsertRule(host: string, rule: Rule): void {
  const rules = loadRules(host);
  const i = rules.findIndex(
    (r) => r.fingerprint === rule.fingerprint && r.occurrence === rule.occurrence,
  );
  if (i >= 0) rules[i] = rule;
  else rules.push(rule);
  saveRules(host, rules);
}

export function deleteRule(host: string, fingerprint: string, occurrence: number): void {
  saveRules(
    host,
    loadRules(host).filter(
      (r) => !(r.fingerprint === fingerprint && r.occurrence === occurrence),
    ),
  );
}

// ---- FAB position ---------------------------------------------------------

export interface FabPos {
  x: number;
  y: number;
}

export function loadFabPos(): FabPos | null {
  return GM_getValue<FabPos | null>(K_FAB, null);
}

export function saveFabPos(pos: FabPos): void {
  GM_setValue<FabPos>(K_FAB, pos);
}

// ---- Export / import ------------------------------------------------------

/** Export the profile only — never settings (the API key lives there). */
export function exportProfileJson(): string {
  return JSON.stringify({ profile: loadProfile() }, null, 2);
}

function validateProfile(data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  for (const [k, v] of Object.entries(data)) {
    if (typeof k !== 'string' || typeof v !== 'string') return false;
  }

  if ('_customFields' in data) {
    try {
      const parsed = JSON.parse(data._customFields);
      if (!Array.isArray(parsed)) return false;
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        if (typeof item.key !== 'string' || typeof item.label !== 'string' || typeof item.kind !== 'string') {
          return false;
        }
        if (item.options !== undefined && !Array.isArray(item.options)) return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function importBundle(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    const data = parsed?.profile?.data ?? parsed?.data;
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'No profile data found in file' };
    }
    if (!validateProfile(data)) {
      return { ok: false, error: 'Invalid profile data schema' };
    }
    saveProfile(data as ProfileData);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
