import { GM_deleteValue, GM_getValue, GM_setValue } from '$';
import { sanitizeSettings } from './settings';
import type { FailRecord, Settings } from './types';

const SETTINGS_KEY = 'bl_settings';
const failKey = (slug: string) => `bl_fail_${slug}`;
const FAIL_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function loadSettings(): Settings {
  try {
    return sanitizeSettings(GM_getValue(SETTINGS_KEY, null));
  } catch {
    return sanitizeSettings(null);
  }
}

export function saveSettings(s: Settings): void {
  GM_setValue(SETTINGS_KEY, s);
}

export function getFailure(slug: string): FailRecord | null {
  try {
    const raw = GM_getValue(failKey(slug), null);
    const rec = (typeof raw === 'string' ? JSON.parse(raw) : raw) as FailRecord | null;
    if (!rec || typeof rec.time !== 'number') return null;
    if (Date.now() - rec.time > FAIL_MAX_AGE) {
      GM_deleteValue(failKey(slug));
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}

export const setFailure = (rec: FailRecord): void => GM_setValue(failKey(rec.slug), rec);
export const clearFailure = (slug: string): void => GM_deleteValue(failKey(slug));
