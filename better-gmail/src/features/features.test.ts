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

  test('assigns stable sender colors and clears stale colors', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="yW"><span email="Ops@example.com">Ops</span></div></td><td><span class="bog">Subject</span></td></tr></tbody></table>';
    const row = document.querySelector('tr')!;
    const sender = document.querySelector('.yW [email]')!;
    enhanceRows(document, vi.fn());
    const color = row.style.getPropertyValue('--bgm-sender-color');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    sender.setAttribute('email', 'ops@example.com');
    enhanceRows(document, vi.fn());
    expect(row.style.getPropertyValue('--bgm-sender-color')).toBe(color);
    sender.setAttribute('email', 'other@example.com');
    enhanceRows(document, vi.fn());
    expect(row.style.getPropertyValue('--bgm-sender-color')).not.toBe(color);
    sender.removeAttribute('email');
    enhanceRows(document, vi.fn());
    expect(row.style.getPropertyValue('--bgm-sender-color')).toBe('');
  });

  test('keeps sender colors visible against both light and dark backgrounds', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="yW"><span email="a@example.com">Sender</span></div></td><td><span class="bog">Subject</span></td></tr></tbody></table>';
    const sender = document.querySelector('.yW [email]')!;
    const row = document.querySelector('tr')!;
    for (let i = 0; i < 100; i++) {
      sender.setAttribute('email', `sender${i}@example.com`);
      enhanceRows(document, vi.fn());
      const color = row.style.getPropertyValue('--bgm-sender-color');
      const rgb = color.match(/[0-9a-f]{2}/g)!.map((c) => {
        const v = Number.parseInt(c, 16) / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      const luminance = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
      expect(luminance).toBeGreaterThan(0.17);
      expect(luminance).toBeLessThan(0.19);
    }
  });

  test('clears a stale color even while the subject is temporarily absent', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="yW"><span email="a@example.com">Sender</span></div><span class="bog">Subject</span></td></tr></tbody></table>';
    const row = document.querySelector('tr')!;
    enhanceRows(document, vi.fn());
    document.querySelector('.bog')!.remove();
    document.querySelector('.yW [email]')!.removeAttribute('email');
    enhanceRows(document, vi.fn());
    expect(row.style.getPropertyValue('--bgm-sender-color')).toBe('');
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

  test('leaves Gmail subject formatting intact and keeps the snippet in place', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="xS"><div class="xT"><div class="y6"><span class="bog">Invoice 123</span></div><span class="y2"> - Payment received</span></div></div></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    enhanceRows(document, copy);
    const subject = document.querySelector<HTMLElement>('.bog')!;
    expect(subject.classList.contains('bgm-subject')).toBe(false);
    expect(subject.hasAttribute('title')).toBe(false);
    expect(document.querySelector('.bgm-subject-cell')).toBeNull();
    const snippet = document.querySelector('.bgm-snippet');
    expect(snippet).not.toBeNull();
    expect(snippet?.textContent).toBe(' - Payment received');
  });
});
