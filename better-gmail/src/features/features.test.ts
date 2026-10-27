import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { enhanceRows } from './rows';

beforeEach(() => {
  document.body.replaceChildren();
});

describe('inbox enhancements', () => {
  test('clicking a replaced subject opens the row without copying', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div><span class="bog">Old subject</span></div></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    document.querySelector('tr')?.addEventListener('click', open);
    enhanceRows(document, copy);
    const replacement = document.createElement('span');
    replacement.className = 'bog';
    replacement.textContent = 'New subject';
    document.querySelector('.bog')?.replaceWith(replacement);
    enhanceRows(document, copy);
    replacement.click();
    expect(copy).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
  });

  test('removes a stale address when Gmail removes the sender email', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><span email="hidden@example.com" hidden></span><div class="yW"><span email="ops@example.com">Operations</span></div></td><td><span class="bog">Subject</span></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    enhanceRows(document, copy);
    document.querySelector('.yW [email]')?.removeAttribute('email');
    enhanceRows(document, copy);
    expect(document.querySelector('.bgm-address-line')).toBeNull();
  });

  test('copies the current sender without turning the subject into a button', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="yW"><span email="ops@example.com">Operations</span></div></td><td><div><span class="bog">Invoice 123</span></div></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    enhanceRows(document, copy);
    enhanceRows(document, copy);
    const subject = document.querySelector<HTMLElement>('.bog')!;
    const address = document.querySelector<HTMLElement>('.bgm-sender-address')!;
    expect(document.querySelector('.bgm-row-action')).toBeNull();
    expect(subject.getAttribute('role')).toBeNull();
    expect(address.getAttribute('role')).toBe('button');
    expect(subject.classList.contains('bgm-copy-target')).toBe(false);
    document.querySelector('.yW [email]')?.setAttribute('email', 'new@example.com');
    subject.click();
    address.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith('new@example.com');
  });

  test('keeps subject and snippet layout structure without displacing snippet or wrapping', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="xS"><div class="xT"><div class="y6"><span class="bog">Invoice 123</span></div><span class="y2"> - Payment received</span></div></div></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    enhanceRows(document, copy);
    const subjectCell = document.querySelector('.bgm-subject-cell');
    expect(subjectCell).not.toBeNull();
    expect(subjectCell?.querySelector('.bog')?.getAttribute('role')).toBeNull();
    const snippet = document.querySelector('.bgm-snippet');
    expect(snippet).not.toBeNull();
    expect(snippet?.textContent).toBe(' - Payment received');
  });
});

test('shows and copies a verification code and removes it when the row changes', () => {
  document.body.innerHTML =
    '<table><tbody><tr class="zA"><td><div><span><span class="bog">Your verification code</span></span><span class="y2"> 123456</span></div></td></tr></tbody></table>';
  const copy = vi.fn().mockResolvedValue(undefined);
  enhanceRows(document, copy);
  const chip = document.querySelector<HTMLButtonElement>('.bgm-otp');
  expect(chip?.textContent).toContain('123456');
  chip?.click();
  expect(copy).toHaveBeenCalledWith('123456');
  document.querySelector('.y2')!.textContent = ' no code';
  enhanceRows(document, copy);
  expect(document.querySelector('.bgm-otp')).toBeNull();
});
