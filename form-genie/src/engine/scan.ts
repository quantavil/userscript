/**
 * Stage 1 — Scan. Collect fillable field units from the document and any open
 * shadow roots, grouping radios/checkboxes by name and dropping fields we must
 * never touch (hidden, disabled, password, captcha/OTP).
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'number'
  | 'email'
  | 'tel'
  | 'date';

export interface FieldUnit {
  type: FieldType;
  /** Representative element (first member for radio/checkbox groups). */
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  /** All members for radio/checkbox groups. */
  group: HTMLInputElement[];
}

const SKIP_INPUT_TYPES = new Set([
  'password', 'hidden', 'submit', 'button', 'reset', 'image', 'file', 'search',
]);

const CAPTCHA_HINT = /captcha|\botp\b|one[\s_-]?time|verif(y|ication)\s*code|security\s*code/i;

/**
 * Visibility: skip fields explicitly hidden via attribute or style (this also
 * excludes inactive wizard steps rendered with display:none). We deliberately
 * do NOT treat a zero-size box as hidden — off-screen but scrollable fields
 * should still be fillable, and headless layout reports zero size.
 */
function isVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  let node: HTMLElement | null = el;
  while (node) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}

function looksLikeCaptcha(el: HTMLElement): boolean {
  const hay = [
    el.getAttribute('name'),
    el.getAttribute('id'),
    el.getAttribute('placeholder'),
    el.getAttribute('aria-label'),
    el.getAttribute('autocomplete'),
  ]
    .filter(Boolean)
    .join(' ');
  return CAPTCHA_HINT.test(hay);
}

/** Recursively collect form controls, descending into open shadow roots. */
function collectControls(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = [];
  const controls = root.querySelectorAll('input, textarea, select');
  controls.forEach((c) => out.push(c as HTMLElement));
  // Descend into open shadow roots.
  root.querySelectorAll('*').forEach((node) => {
    const sr = (node as Element).shadowRoot;
    if (sr) out.push(...collectControls(sr));
  });
  return out;
}

export function scan(root: ParentNode = document): FieldUnit[] {
  const controls = collectControls(root);
  const units: FieldUnit[] = [];
  const radioGroups = new Map<string, HTMLInputElement[]>();
  const checkGroups = new Map<string, HTMLInputElement[]>();
  let anonSeq = 0;

  for (const el of controls) {
    if (!isVisible(el)) continue;
    if (looksLikeCaptcha(el)) continue;

    const tag = el.tagName.toLowerCase();
    const disabled = (el as HTMLInputElement).disabled;

    if (tag === 'select') {
      // Keep disabled selects: cascading children start disabled and are
      // enabled once their parent is chosen. The filler waits for that.
      units.push({ type: 'select', el: el as HTMLSelectElement, group: [] });
      continue;
    }

    // Locked inputs/textareas are intentionally not editable — skip them.
    if (disabled || (el as HTMLInputElement).readOnly) continue;

    if (tag === 'textarea') {
      units.push({ type: 'textarea', el: el as HTMLTextAreaElement, group: [] });
      continue;
    }

    const input = el as HTMLInputElement;
    const t = (input.type || 'text').toLowerCase();
    if (SKIP_INPUT_TYPES.has(t)) continue;

    if (t === 'radio' || t === 'checkbox') {
      const map = t === 'radio' ? radioGroups : checkGroups;
      // A name-less radio/checkbox isn't a group per HTML, so give each its own
      // stable key (a document-order sequence, not a random one).
      const gkey = input.name || `__anon_${input.id || anonSeq++}`;
      if (!map.has(gkey)) map.set(gkey, []);
      map.get(gkey)!.push(input);
      continue;
    }

    const type: FieldType =
      t === 'email' || t === 'tel' || t === 'number' || t === 'date'
        ? (t as FieldType)
        : 'text';
    units.push({ type, el: input, group: [] });
  }

  for (const [, members] of radioGroups) {
    units.push({ type: 'radio', el: members[0], group: members });
  }
  for (const [, members] of checkGroups) {
    units.push({ type: 'checkbox', el: members[0], group: members });
  }

  return units;
}
