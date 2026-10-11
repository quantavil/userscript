/**
 * Stage 4 — Fill. Apply resolved profile values to matched fields in a
 * framework-safe way (native setter + event sequence), handling selects, radio/
 * checkbox, dates, and cascading dropdowns. Never submits, never truncates
 * silently, isolates each field so one failure can't abort the run.
 */
import { FieldMatch, THRESHOLD_FILL, THRESHOLD_SUGGEST } from './match';
import { ProfileData } from '../profile/schema';
import { resolveValue, parseDate, formatDate, DateFormat } from '../profile/derive';
import { normalize, radioLabel } from './describe';
import { log } from '../debug';

export type FillStatus = 'filled' | 'skipped' | 'unmatched' | 'suggested' | 'error';

export interface FillResult {
  match: FieldMatch;
  status: FillStatus;
  value?: string;
  reason?: string;
}

export interface FillOptions {
  overwrite: boolean;
  /** Fingerprints the user explicitly accepted from the suggestion list. */
  acceptedFingerprints?: Set<string>;
}

const CASCADE_TIMEOUT = 3000;

/** Domain equivalences for matching option/label text. */
const EQUIV: [RegExp, string[]][] = [
  [/^obc/, ['obc', 'other backward class', 'other backward classes', 'obc ncl', 'backward']],
  [/^(gen|general|ur|unreserved)/, ['general', 'gen', 'ur', 'unreserved', 'open']],
  [/^male$/, ['male', 'm']],
  [/^female$/, ['female', 'f']],
];

export async function fillAll(
  matches: FieldMatch[],
  data: ProfileData,
  opts: FillOptions,
): Promise<FillResult[]> {
  // `matches` already arrive in DOM order from the scanner, so a parent select
  // precedes its cascading child. Fill sequentially to preserve that ordering.
  const results: FillResult[] = [];
  for (const m of matches) {
    results.push(await fillOne(m, data, opts));
  }
  return results;
}

async function fillOne(m: FieldMatch, data: ProfileData, opts: FillOptions): Promise<FillResult> {
  // Below the suggest floor a weak key is noise, not a suggestion.
  if (!m.key || m.confidence < THRESHOLD_SUGGEST) return { match: m, status: 'unmatched' };

  const accepted = opts.acceptedFingerprints?.has(m.fingerprint) ?? false;
  if (m.confidence < THRESHOLD_FILL && !accepted) {
    return { match: m, status: 'suggested' };
  }

  let value = resolveValue(data, m.key);
  if (!value) return { match: m, status: 'skipped', reason: 'no profile value' };

  try {
    const unit = m.descriptor.unit;

    // Wait for cascading child options to load before filling.
    if (unit.type === 'select') {
      await waitForOptions(unit.el as HTMLSelectElement);
    }

    if ((m.key === 'contact.email' || m.key === 'contact.altEmail') && unit.type === 'select' && value.includes('@')) {
      value = value.slice(value.indexOf('@') + 1);
    }

    if (m.key === 'personal.dob' && unit.type === 'select') {
      const dp = parseDate(value);
      if (dp) {
        const part = detectDobPart(unit.el as HTMLSelectElement);
        const sel = unit.el as HTMLSelectElement;
        let applied: FillResult;
        if (part === 'day') {
          // Cover both "5" and "05" option styles.
          applied = selectByCandidates(m, sel, [String(parseInt(dp.day, 10)), dp.day], opts);
        } else if (part === 'month') {
          applied = selectByCandidates(m, sel, getMonthEquivalences(dp.month), opts);
        } else if (part === 'year') {
          applied = selectByCandidates(m, sel, [dp.year], opts);
        } else {
          return { match: m, status: 'skipped', reason: 'unknown DOB select part' };
        }
        if (applied.status === 'filled') highlight(unit.el);
        return applied;
      }
    }

    const applied = await applyValue(m, value, opts);
    if (applied.status === 'filled') highlight(unit.el);
    return applied;
  } catch (e) {
    log('fill error', m.key, e);
    return { match: m, status: 'error', reason: (e as Error).message };
  }
}

async function applyValue(m: FieldMatch, value: string, opts: FillOptions): Promise<FillResult> {
  const unit = m.descriptor.unit;
  const d = m.descriptor;

  if (unit.type === 'select') {
    return fillSelect(m, unit.el as HTMLSelectElement, value, opts);
  }
  if (unit.type === 'radio' || unit.type === 'checkbox') {
    return fillChoice(m, value, opts);
  }

  const el = unit.el as HTMLInputElement | HTMLTextAreaElement;
  const current = el.value.trim();

  // Date fields.
  if (unit.type === 'date' || m.key === 'personal.dob') {
    const dp = parseDate(value);
    if (dp) value = formatDate(dp, detectDateFormat(d.inputType, el.getAttribute('placeholder'), d.pattern));
  }

  value = formatForField(m.key ?? '', value, el, d.maxlength);

  if (d.maxlength && value.length > d.maxlength) {
    return { match: m, status: 'skipped', reason: `value exceeds maxlength ${d.maxlength}` };
  }
  if (current && !opts.overwrite && current !== value) {
    return { match: m, status: 'skipped', reason: 'already filled' };
  }
  if (current === value) return { match: m, status: 'skipped', reason: 'already correct' };

  setNativeValue(el, value);
  fireEvents(el);
  return { match: m, status: 'filled', value };
}

function fillSelect(m: FieldMatch, sel: HTMLSelectElement, value: string, opts: FillOptions): FillResult {
  // Expand into the value plus its domain equivalences, then match by candidate.
  return selectByCandidates(m, sel, Array.from(expandEquiv(normalize(value))), opts);
}

/**
 * Select the first option matching any candidate: exact (text or value) first,
 * then substring either direction. Candidates are pre-normalized here. Used for
 * plain selects (value + equivalences) and DOB day/month/year part-selects.
 */
function selectByCandidates(
  m: FieldMatch,
  sel: HTMLSelectElement,
  candidates: string[],
  opts: FillOptions,
): FillResult {
  if (sel.disabled) {
    return { match: m, status: 'skipped', reason: 'options never loaded (still disabled)' };
  }
  if (sel.value && !opts.overwrite) {
    const cur = sel.options[sel.selectedIndex];
    if (cur && cur.value && !/^(select|choose|--)/i.test(cur.text)) {
      return { match: m, status: 'skipped', reason: 'already selected' };
    }
  }

  const cands = Array.from(new Set(candidates.map(normalize))).filter(Boolean);
  const options = Array.from(sel.options);

  let idx = options.findIndex((o) => cands.includes(normalize(o.text)) || cands.includes(normalize(o.value)));
  if (idx < 0) {
    idx = options.findIndex((o) => {
      const t = normalize(o.text);
      const v = normalize(o.value);
      return cands.some((c) =>
        c.length > 1 && (
          (t.length > 1 && (t.includes(c) || c.includes(t))) ||
          (v.length > 1 && (v.includes(c) || c.includes(v)))
        ),
      );
    });
  }

  if (idx < 0) return { match: m, status: 'skipped', reason: `no option matches "${candidates.join(', ')}"` };

  sel.selectedIndex = idx;
  fireEvents(sel);
  return { match: m, status: 'filled', value: sel.options[idx].text };
}

function fillChoice(m: FieldMatch, value: string, opts: FillOptions): FillResult {
  const members = m.descriptor.unit.group;
  const already = members.find((r) => r.checked);
  if (already && !opts.overwrite) return { match: m, status: 'skipped', reason: 'already selected' };

  const target = normalize(value);
  const equiv = expandEquiv(target);
  const hit = members.find((r) => {
    const lbl = normalize(radioLabel(r));
    const val = normalize(r.value);
    return lbl === target || val === target || equiv.has(lbl) || equiv.has(val) ||
      (lbl.length > 1 && (lbl.includes(target) || target.includes(lbl)));
  });

  if (!hit) return { match: m, status: 'skipped', reason: `no option matches "${value}"` };
  if (!hit.checked) hit.click();
  return { match: m, status: 'filled', value: radioLabel(hit) };
}

// ---- helpers --------------------------------------------------------------

function expandEquiv(target: string): Set<string> {
  const set = new Set<string>([target]);
  for (const [re, group] of EQUIV) {
    if (re.test(target) || group.includes(target)) group.forEach((g) => set.add(g));
  }
  return set;
}

function detectDateFormat(inputType: string, placeholder: string | null, pattern: string | null): DateFormat {
  if (inputType === 'date') return 'YYYY-MM-DD';
  const hay = `${placeholder ?? ''} ${pattern ?? ''}`.toLowerCase();
  if (/yyyy.?mm.?dd/.test(hay)) return 'YYYY-MM-DD';
  if (/mm.?dd.?yyyy/.test(hay)) return 'MM/DD/YYYY';
  if (/dd-mm/.test(hay) || hay.includes('dd-mm-yyyy')) return 'DD-MM-YYYY';
  return 'DD/MM/YYYY';
}

function formatForField(
  key: string,
  value: string,
  el: HTMLInputElement | HTMLTextAreaElement,
  maxlength: number | null,
): string {
  // Mobile: strip +91 / leading zero when 10 digits are expected.
  if (key === 'contact.mobile' || key === 'contact.altMobile') {
    let digits = value.replace(/[^\d]/g, '');
    if (digits.length > 10) digits = digits.slice(-10);
    if ((maxlength === 10 || (el as HTMLInputElement).type === 'tel') && digits.length === 10) {
      value = digits;
    }
  }
  // Split-email: if there's an adjacent '@' separator, fill only the local part.
  if ((key === 'contact.email' || key === 'contact.altEmail') && value.includes('@') && hasAdjacentAt(el)) {
    value = value.slice(0, value.indexOf('@'));
  }
  // Uppercase when the field visually forces caps.
  try {
    if (getComputedStyle(el).textTransform === 'uppercase') value = value.toUpperCase();
  } catch { /* jsdom/no-style */ }
  return value;
}

/** Check for an adjacent '@' separator — the hallmark of a split-email layout. */
function hasAdjacentAt(el: Element): boolean {
  const container = el.closest('.input-group, td, .form-group, .row') || el.parentElement;
  if (!container) return false;
  for (const child of container.querySelectorAll('*')) {
    if ((child.textContent ?? '').trim() === '@') return true;
  }
  return false;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function fireEvents(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
}

/**
 * Wait until a select has real options (cascading child loaded), else time out.
 * We key on option presence, not the disabled flag: a permanently-disabled
 * select that already has options resolves immediately (the filler then skips
 * it), so only a genuinely empty child incurs the wait.
 */
function waitForOptions(sel: HTMLSelectElement): Promise<void> {
  const hasReal = () =>
    Array.from(sel.options).some((o) => o.value && !/^(select|choose|--)/i.test(o.text));
  if (hasReal()) return Promise.resolve();

  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (hasReal()) { cleanup(); resolve(); }
    });
    obs.observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    const timer = setTimeout(() => { cleanup(); resolve(); }, CASCADE_TIMEOUT);
    function cleanup() { obs.disconnect(); clearTimeout(timer); }
  });
}

function highlight(el: HTMLElement): void {
  const prev = el.style.outline;
  const prevT = el.style.transition;
  el.style.transition = 'outline 0.2s ease';
  el.style.outline = '2px solid #22c55e';
  setTimeout(() => { el.style.outline = prev; el.style.transition = prevT; }, 1200);
}

function detectDobPart(sel: HTMLSelectElement): 'day' | 'month' | 'year' | null {
  const opts = Array.from(sel.options).map((o) => normalize(o.text || o.value));
  const numericOpts = opts.map(o => parseInt(o, 10)).filter(n => !isNaN(n));

  if (numericOpts.some(n => n >= 1900 && n <= 2100)) {
    return 'year';
  }
  if (opts.includes('31') || (numericOpts.some(n => n > 12 && n <= 31))) {
    return 'day';
  }
  const monthNames = opts.filter(o => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(o)).length;
  if (sel.options.length <= 14 && (numericOpts.every(n => n >= 1 && n <= 12) || monthNames >= 6)) {
    return 'month';
  }

  const name = (sel.getAttribute('name') ?? '').toLowerCase();
  const id = (sel.getAttribute('id') ?? '').toLowerCase();
  if (name.includes('year') || id.includes('year') || name.includes('yr') || id.includes('yr')) return 'year';
  if (name.includes('month') || id.includes('month') || name.includes('mon') || id.includes('mon')) return 'month';
  if (name.includes('day') || id.includes('day')) return 'day';

  return null;
}

function getMonthEquivalences(monthNumStr: string): string[] {
  const m = parseInt(monthNumStr, 10);
  if (isNaN(m) || m < 1 || m > 12) return [];
  const names = [
    ['1', '01', 'jan', 'january'],
    ['2', '02', 'feb', 'february'],
    ['3', '03', 'mar', 'march'],
    ['4', '04', 'apr', 'april'],
    ['5', '05', 'may'],
    ['6', '06', 'jun', 'june'],
    ['7', '07', 'jul', 'july'],
    ['8', '08', 'aug', 'august'],
    ['9', '09', 'sep', 'september', 'sept'],
    ['10', 'oct', 'october'],
    ['11', 'nov', 'november'],
    ['12', 'dec', 'december'],
  ];
  return names[m - 1];
}
