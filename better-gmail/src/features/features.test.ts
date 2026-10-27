import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { enhanceRows } from './rows';

beforeEach(() => {
  document.body.replaceChildren();
});

describe('inbox enhancements', () => {
  test('cleans up the subject tooltip if Gmail removes the focused row', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><span class="bog">Subject</span></td></tr></tbody></table>';
    enhanceRows(document, vi.fn().mockResolvedValue(undefined));
    document.querySelector<HTMLButtonElement>('.bgm-row-action')?.focus();
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    document.querySelector('tr')?.remove();
    enhanceRows(document, vi.fn().mockResolvedValue(undefined));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  test('copies the current subject after Gmail replaces its subject node', () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="yW"><span email="ops@example.com">Operations</span></div></td><td><div><span class="bog">Old subject</span></div></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    enhanceRows(document, copy);
    const oldSubject = document.querySelector('.bog');
    const replacement = document.createElement('span');
    replacement.className = 'bog';
    replacement.textContent = 'New subject';
    oldSubject?.replaceWith(replacement);
    enhanceRows(document, copy);
    document.querySelector<HTMLButtonElement>('.bgm-subject-cell > .bgm-row-action')?.click();
    expect(copy).toHaveBeenCalledWith('New subject');
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

  test('adds a readable subject and copy actions without duplicating them', async () => {
    document.body.innerHTML =
      '<table><tbody><tr class="zA"><td><div class="yW"><span email="ops@example.com">Operations</span></div></td><td><span class="bog">Invoice 123</span></td></tr></tbody></table>';
    const copy = vi.fn().mockResolvedValue(undefined);
    enhanceRows(document, copy);
    enhanceRows(document, copy);
    const subject = document.querySelector<HTMLElement>('.bog');
    expect(subject?.title).toBe('Invoice 123');
    const buttons = document.querySelectorAll<HTMLButtonElement>('.bgm-row-action');
    expect(buttons).toHaveLength(2);
    const subjectButton = document.querySelector<HTMLButtonElement>(
      '.bgm-subject-cell > .bgm-row-action',
    );
    const senderButton = document.querySelector<HTMLButtonElement>(
      '.bgm-address-line > .bgm-row-action',
    );
    expect(subjectButton?.querySelector('svg')).toBeTruthy();
    expect(senderButton?.querySelector('svg')).toBeTruthy();
    expect(subjectButton?.dataset.subject).toBe('Invoice 123');
    expect(subjectButton?.getAttribute('aria-label')).toContain('Invoice 123');
    expect(document.querySelector('.bgm-sender-address')?.textContent).toBe('ops@example.com');
    subjectButton?.focus();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Invoice 123');
    subjectButton?.blur();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    const rowClick = vi.fn();
    document.querySelector('tr')?.addEventListener('click', rowClick);
    subjectButton?.click();
    expect(rowClick).not.toHaveBeenCalled();
    expect(copy).toHaveBeenCalledWith('Invoice 123');
    senderButton?.click();
    expect(copy).toHaveBeenCalledWith('ops@example.com');
  });
});
