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
  if (sel.disabled) {
    return { match: m, status: 'skipped', reason: 'options never loaded (still disabled)' };
  }
  if (sel.value && !opts.overwrite) {
    const cur = sel.options[sel.selectedIndex];
    if (cur && cur.value && !/^(select|choose|--)/i.test(cur.text)) {
      return { match: m, status: 'skipped', reason: 'already selected' };
    }
  }
  const target = normalize(value);
  const equiv = expandEquiv(target);

  let idx = -1;
  const opts2 = Array.from(sel.options);
  // Exact, then equivalence, then substring.
  idx = opts2.findIndex((o) => normalize(o.text) === target || normalize(o.value) === target);
  if (idx < 0) idx = opts2.findIndex((o) => equiv.has(normalize(o.text)) || equiv.has(normalize(o.value)));
  if (idx < 0) idx = opts2.findIndex((o) => {
    const t = normalize(o.text);
    return t.length > 1 && (t.includes(target) || target.includes(t));
  });

  if (idx < 0) return { match: m, status: 'skipped', reason: `no option matches "${value}"` };

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
  // Uppercase when the field visually forces caps.
  try {
    if (getComputedStyle(el).textTransform === 'uppercase') value = value.toUpperCase();
  } catch { /* jsdom/no-style */ }
  return value;
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
