import { STORE } from './config';
import { emptyState, type FormState } from './query';

export interface Preset {
  id: string;
  name: string;
  state: FormState;
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — presets are a convenience, not worth throwing over */
  }
};

export const getPresets = (): Preset[] => read<Preset[]>(STORE.presets, []).filter(p => p?.id && p?.name);

export const addPreset = (name: string, state: FormState): Preset[] => {
  const presets = [...getPresets(), { id: `p${Date.now().toString(36)}`, name, state }];
  write(STORE.presets, presets);
  return presets;
};

export const removePreset = (id: string): Preset[] => {
  const presets = getPresets().filter(p => p.id !== id);
  write(STORE.presets, presets);
  return presets;
};

export const getStoredTheme = () => localStorage.getItem(STORE.theme);
export const setStoredTheme = (theme: string) => localStorage.setItem(STORE.theme, theme);

/** Carry v7's localStorage over rather than silently dropping saved presets on upgrade. */
export function migrateLegacyStorage() {
  const legacyPresets = localStorage.getItem('gh-adv-presets');
  if (legacyPresets && !localStorage.getItem(STORE.presets)) {
    try {
      const old = JSON.parse(legacyPresets) as {
        id?: string;
        name?: string;
        fields?: Record<string, any>;
      }[];
      const migrated: Preset[] = old
        .filter(p => p?.name)
        .map((p, i) => ({
          id: p.id ?? `p${i}`,
          name: p.name!,
          state: {
            ...emptyState(),
            type: p.fields?.type ?? 'repositories',
            sort: p.fields?.sort ?? '',
            and: p.fields?.and ?? '',
            or: p.fields?.or ?? '',
            hide: p.fields?.hideKeys ?? '',
            q: p.fields?.meta ?? {}
          }
        }));
      write(STORE.presets, migrated);
    } catch {
      /* unreadable legacy blob — nothing to rescue */
    }
  }
  localStorage.removeItem('gh-adv-presets');

  const legacyTheme = localStorage.getItem('gh-adv-theme');
  if (legacyTheme && !getStoredTheme()) setStoredTheme(legacyTheme);
  localStorage.removeItem('gh-adv-theme');

  // Release detection is gone. v7 wrote one key per repo and never pruned them.
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('gh-rel-')) localStorage.removeItem(key);
  }
  localStorage.removeItem('gh-adv-scan');
  localStorage.removeItem('ghf:scan');
  localStorage.removeItem('ghf:releases');
}
