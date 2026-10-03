export type TextField = HTMLInputElement | HTMLTextAreaElement;

export const isTextField = (el: Element | null): el is TextField =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement &&
    !['checkbox', 'radio', 'button', 'submit', 'file', 'image', 'hidden'].includes(el.type));

/**
 * Sets a value the way a user typing would, so React/Vue/Svelte controlled inputs notice it.
 * Frameworks wrap the instance `value` setter to track changes; assigning `input.value = x`
 * hits that wrapper and the framework discards the update. The prototype setter bypasses it.
 */
export function fillInput(field: TextField, value: string): void {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(field, value);
  else field.value = value;
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

export function clickElement(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;
  el.click();
  return true;
}
