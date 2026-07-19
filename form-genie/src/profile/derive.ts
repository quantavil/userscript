/**
 * Derived values: resolve a profile key to its base string, computing values
 * that aren't stored directly (full name from parts, correspondence copied from
 * permanent, name splits) and providing date-format helpers used by the filler.
 */
import { ProfileData } from './schema';

function get(data: ProfileData, key: string): string {
  return (data[key] ?? '').trim();
}

/** Resolve a key to its base value, applying composition/aliasing rules. */
export function resolveValue(data: ProfileData, key: string): string {
  // Correspondence mirrors permanent when the flag is set.
  if (key.startsWith('address.correspondence.') && key !== 'address.correspondence.sameAsPermanent') {
    const same = get(data, 'address.correspondence.sameAsPermanent').toLowerCase();
    const own = get(data, key);
    if (!own && (same === 'yes' || same === 'true' || same === '1')) {
      return get(data, key.replace('address.correspondence.', 'address.permanent.'));
    }
    return own;
  }

  const direct = get(data, key);
  if (direct) return direct;

  // Compose full name from parts when not stored directly.
  if (key === 'personal.fullName') {
    return [
      get(data, 'personal.firstName'),
      get(data, 'personal.middleName'),
      get(data, 'personal.lastName'),
    ]
      .filter(Boolean)
      .join(' ');
  }

  // Derive first/last from a stored full name.
  const full = get(data, 'personal.fullName');
  if (full) {
    const parts = full.split(/\s+/);
    if (key === 'personal.firstName') return parts[0] ?? '';
    if (key === 'personal.lastName') return parts.length > 1 ? parts[parts.length - 1] : '';
    if (key === 'personal.middleName') return parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
  }

  return '';
}

// ---- Dates ----------------------------------------------------------------

export interface DateParts {
  day: string;   // "05"
  month: string; // "09"
  year: string;  // "1998"
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Parse a stored DOB. Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. */
export function parseDate(value: string): DateParts | null {
  const v = value.trim();
  let y: number, m: number, d: number;

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (iso) {
    [, y, m, d] = iso.map(Number) as [number, number, number, number];
  } else if (dmy) {
    [, d, m, y] = dmy.map(Number) as [number, number, number, number];
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { day: pad(d), month: pad(m), year: String(y) };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function monthName(month: string): string {
  const i = parseInt(month, 10) - 1;
  return MONTHS[i] ?? month;
}

export type DateFormat = 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';

export function formatDate(p: DateParts, fmt: DateFormat): string {
  switch (fmt) {
    case 'DD/MM/YYYY': return `${p.day}/${p.month}/${p.year}`;
    case 'DD-MM-YYYY': return `${p.day}-${p.month}-${p.year}`;
    case 'YYYY-MM-DD': return `${p.year}-${p.month}-${p.day}`;
    case 'MM/DD/YYYY': return `${p.month}/${p.day}/${p.year}`;
  }
}

export function computeAge(p: DateParts, now = new Date()): number {
  const dob = new Date(Number(p.year), Number(p.month) - 1, Number(p.day));
  let age = now.getFullYear() - dob.getFullYear();
  const mDiff = now.getMonth() - dob.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
