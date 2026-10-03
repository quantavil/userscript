import { isTextField } from '../dom/fill.ts';
import { pickElement, selectorFor } from '../dom/picker.ts';
import { editor, settingsTab, toast } from '../ui/state.ts';

const imageProblem = (el: Element): string | null =>
  el instanceof HTMLImageElement ||
  el instanceof HTMLCanvasElement ||
  el instanceof SVGSVGElement ||
  getComputedStyle(el).backgroundImage !== 'none'
    ? null
    : 'Pick the captcha picture itself (an image, canvas or svg). ↑ selects the parent';

const fieldProblem = (el: Element): string | null =>
  isTextField(el) ? null : 'Pick the text box where the answer is typed';

/** Guided two-click setup; ends in the rule editor so scope and options can be reviewed. */
export async function configureCurrentPage(): Promise<void> {
  settingsTab.value = null;
  const captcha = await pickElement('Step 1 of 2: click the captcha image', imageProblem);
  if (!captcha) return toast('Setup cancelled');
  const input = await pickElement('Step 2 of 2: click the answer box', fieldProblem);
  if (!input) return toast('Setup cancelled');
  editor.value = {
    pattern: location.hostname,
    rule: { captcha: captcha.selector, input: input.selector },
  };
}

const textProblem = (el: Element): string | null =>
  el.textContent?.trim() ? null : 'Pick the text that says what to select. ↑ selects the parent';

/**
 * Widens one picked tile to a selector matching every tile: tag + classes, if that yields a
 * square number of elements (9, 16…) that includes the pick. Falls back to the unique selector.
 */
export function tilesSelector(el: Element): string {
  const classes = [...el.classList].filter((c) => !c.startsWith('ucs-')).map((c) => `.${CSS.escape(c)}`);
  const candidates = [el.localName + classes.join(''), ...classes.map((c) => el.localName + c)];
  for (const sel of candidates) {
    const all = [...document.querySelectorAll(sel)];
    const side = Math.round(Math.sqrt(all.length));
    if (side >= 2 && side * side === all.length && all.includes(el)) return sel;
  }
  return selectorFor(el);
}

/**
 * Guided setup for image-grid captchas (pick the image, then a tile, the challenge text and the
 * Verify button; Esc skips the optional steps). Run it inside the frame that shows the grid.
 */
export async function configureGridPage(): Promise<void> {
  settingsTab.value = null;
  const captcha = await pickElement('Step 1 of 4: click the grid image', imageProblem);
  if (!captcha) return toast('Setup cancelled');
  const tile = await pickElement('Step 2 of 4: click any one tile (Esc: click by position instead)');
  const instruction = await pickElement('Step 3 of 4: click the "Select all…" text (Esc to skip)', textProblem);
  const submit = await pickElement('Step 4 of 4: click the Verify button (Esc to skip)');
  editor.value = {
    pattern: `${location.hostname}${location.pathname}`,
    rule: {
      kind: 'grid',
      captcha: captcha.selector,
      input: '',
      tiles: tile ? tilesSelector(tile.el) : '',
      instruction: instruction?.selector ?? '',
      submit: submit?.selector ?? '',
    },
  };
}

type PickField = 'captcha' | 'input' | 'submit' | 'tiles' | 'instruction';

/** Re-pick one selector while the editor is open. */
export async function repick(field: PickField): Promise<void> {
  const labels: Record<PickField, string> = {
    captcha: 'Click the captcha image',
    input: 'Click the answer box',
    submit: 'Click the submit button',
    tiles: 'Click any one tile',
    instruction: 'Click the challenge text',
  };
  const checks: Partial<Record<PickField, (el: Element) => string | null>> = {
    captcha: imageProblem,
    input: fieldProblem,
    instruction: textProblem,
  };
  const picked = await pickElement(labels[field], checks[field]);
  const current = editor.value;
  if (!picked || !current) return;
  const selector = field === 'tiles' ? tilesSelector(picked.el) : picked.selector;
  editor.value = { ...current, rule: { ...current.rule, [field]: selector } };
}
