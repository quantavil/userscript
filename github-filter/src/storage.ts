import { STORE } from './config';
import { type FormState, normalizeState } from './query';

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
    /* ignore storage quota errors */
  }
};

export const getPresets = (): Preset[] => {
  const raw = read<unknown>(STORE.presets, []);
  // localStorage is shared with the page and can hold a corrupted or legacy shape.
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Preset => {
      if (!p || typeof p !== 'object') return false;
      const candidate = p as Partial<Preset>;
      return typeof candidate.id === 'string' && typeof candidate.name === 'string' && Boolean(candidate.id && candidate.name);
    })
    .map(p => ({ ...p, state: normalizeState(p.state) }));
};

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

/** Carry legacy v7 presets over and clear abandoned cache keys. */
export function migrateLegacyStorage() {
  try {
    const legacyPresets = localStorage.getItem('gh-adv-presets');
    if (legacyPresets && !localStorage.getItem(STORE.presets)) {
      const parsed: unknown = JSON.parse(legacyPresets);
      const old = (Array.isArray(parsed) ? parsed : []) as {
        id?: string;
        name?: string;
        fields?: Record<string, any>;
      }[];
      const migrated: Preset[] = old
        .filter(p => p?.name)
        .map((p, i) => ({
          id: p.id ?? `p${i}`,
          name: p.name!,
          state: normalizeState({
            sort: p.fields?.sort ?? '',
            and: p.fields?.and ?? '',
            or: p.fields?.or ?? '',
            hide: p.fields?.hideKeys ?? '',
            q: p.fields?.meta ?? {}
          })
        }));
      write(STORE.presets, migrated);
    }
    localStorage.removeItem('gh-adv-presets');
    localStorage.removeItem('gh-adv-theme');
    localStorage.removeItem('ghf:theme');
    localStorage.removeItem('gh-adv-scan');
    localStorage.removeItem('ghf:scan');
    localStorage.removeItem('ghf:releases');
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('gh-rel-')) localStorage.removeItem(key);
    }
  } catch {
    /* ignore unreadable legacy state */
  }
}
