/**
 * Stage 2 — Describe. Build a text descriptor per field from labels, ARIA,
 * placeholder, name/id tokens, and (critical for gov table layouts) the nearest
 * preceding cell / adjacent text. Also captures constraints and options used by
 * matching and filling.
 */
import { FieldUnit } from './scan';

export interface FieldDescriptor {
  unit: FieldUnit;
  /** Human-readable descriptor text, normalized (lowercase, collapsed space). */
  text: string;
  /** Individual token set for scoring. */
  tokens: string[];
  /** For select/radio/checkbox: option labels (and select values). */
  options: string[];
  maxlength: number | null;
  pattern: string | null;
  inputType: string;
  /** Stable-ish identity fragment used by fingerprinting. */
  name: string;
  id: string;
}

const STOP = new Set(['the', 'a', 'an', 'of', 'your', 'please', 'enter', 'select', 'field', 'is']);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[*():.,/\\|#\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function labelText(el: HTMLElement): string {
  const parts: string[] = [];
  const id = el.getAttribute('id');
  const root = el.getRootNode() as Document | ShadowRoot;

  if (id) {
    const lbl = root.querySelector?.(`label[for="${cssEscape(id)}"]`);
    if (lbl) parts.push(lbl.textContent ?? '');
  }
  // Wrapping <label>.
  const wrap = el.closest('label');
  if (wrap) parts.push(ownText(wrap));

  const aria = el.getAttribute('aria-label');
  if (aria) parts.push(aria);

  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    for (const rid of labelledby.split(/\s+/)) {
      const ref = root.querySelector?.(`#${cssEscape(rid)}`);
      if (ref) parts.push(ref.textContent ?? '');
    }
  }
  return parts.join(' ');
}

/** Text of an element excluding text inside nested form controls. */
function ownText(el: Element): string {
  let out = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? '';
  });
  return out;
}

/**
 * Nearest descriptive text for table/grid layouts with no real label:
 * the preceding cell in the same row, or preceding sibling text.
 */
function nearbyText(el: HTMLElement): string {
  const cell = el.closest('td, th');
  if (cell) {
    let prev = cell.previousElementSibling;
    while (prev) {
      const t = (prev.textContent ?? '').trim();
      if (t) return t;
      prev = prev.previousElementSibling;
    }
    // Some layouts put the label in the row's first cell.
    const row = cell.closest('tr');
    const first = row?.querySelector('td, th');
    if (first && first !== cell) {
      const t = (first.textContent ?? '').trim();
      if (t) return t;
    }
  }
  // Preceding sibling text node / element.
  let sib = el.previousSibling;
  while (sib) {
    const t = (sib.textContent ?? '').trim();
    if (t) return t;
    sib = sib.previousSibling;
  }
  return '';
}

function optionsOf(unit: FieldUnit): string[] {
  if (unit.type === 'select') {
    const sel = unit.el as HTMLSelectElement;
    return Array.from(sel.options)
      .map((o) => `${o.text} ${o.value}`.trim())
      .filter((t) => t && !/^(select|choose|--)/i.test(t));
  }
  if (unit.type === 'radio' || unit.type === 'checkbox') {
    return unit.group.map((m) => radioLabel(m)).filter(Boolean);
  }
  return [];
}

export function radioLabel(input: HTMLInputElement): string {
  const id = input.getAttribute('id');
  const root = input.getRootNode() as Document | ShadowRoot;
  if (id) {
    const lbl = root.querySelector?.(`label[for="${cssEscape(id)}"]`);
    if (lbl?.textContent?.trim()) return lbl.textContent.trim();
  }
  const wrap = input.closest('label');
  if (wrap) {
    const t = ownText(wrap).trim();
    if (t) return t;
  }
  const next = input.nextElementSibling;
  if (next?.textContent?.trim()) return next.textContent.trim();
  const sib = input.nextSibling;
  if (sib?.textContent?.trim()) return sib.textContent.trim();
  return input.value || '';
}

function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
  return s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/**
 * Second-chance captcha/OTP detection on the full descriptor text — catches
 * fields (e.g. IBPS "Security Code") whose hint lives in nearby label text
 * rather than their own attributes. Text is already normalized (lowercase,
 * punctuation stripped).
 */
const CAPTCHA_TEXT = /captcha|\botp\b|one time password|verification code|security code|word in the textbox|as in the image|image code/;

export function isCaptchaLike(d: FieldDescriptor): boolean {
  return CAPTCHA_TEXT.test(d.text);
}

export function describe(unit: FieldUnit): FieldDescriptor {
  const el = unit.el;
  const name = el.getAttribute('name') ?? '';
  const id = el.getAttribute('id') ?? '';
  const bits = [
    labelText(el),
    el.getAttribute('placeholder') ?? '',
    el.getAttribute('title') ?? '',
    name,
    id,
    nearbyText(el),
  ];

  const text = normalize(bits.join(' '));
  const tokens = Array.from(new Set(bits.flatMap((b) => tokenize(b))));
  const maxAttr = el.getAttribute('maxlength');

  return {
    unit,
    text,
    tokens,
    options: optionsOf(unit),
    maxlength: maxAttr ? parseInt(maxAttr, 10) : null,
    pattern: el.getAttribute('pattern'),
    inputType: (el as HTMLInputElement).type ?? unit.type,
    name,
    id,
  };
}
