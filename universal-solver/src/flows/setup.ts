import { isTextField } from '../dom/fill.ts';
import { pickElement } from '../dom/picker.ts';
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

/** Re-pick one selector while the editor is open. */
export async function repick(field: 'captcha' | 'input' | 'submit'): Promise<void> {
  const labels = {
    captcha: 'Click the captcha image',
    input: 'Click the answer box',
    submit: 'Click the submit button',
  };
  const check = field === 'captcha' ? imageProblem : field === 'input' ? fieldProblem : () => null;
  const picked = await pickElement(labels[field], check);
  const current = editor.value;
  if (picked && current) editor.value = { ...current, rule: { ...current.rule, [field]: picked.selector } };
}
