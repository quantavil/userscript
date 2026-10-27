import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { enhanceAttachments } from './attachments';

const card = (name: string, id: string) =>
  `<span download_url="application/pdf:${name}:https://mail.google.com/mail/u/0?ui=2&attid=${id}"></span>`;

beforeEach(() => {
  document.body.replaceChildren();
});

describe('attachment downloads', () => {
  test('adds one accessible bar, downloads every file, and keeps names with colons', async () => {
    document.body.innerHTML = `<div><div>${card('a.pdf', '0.1')}${card('b: c.pdf', '0.2')}</div></div>`;
    const save = vi.fn().mockResolvedValue(undefined);
    const chooseSaver = vi.fn().mockResolvedValue(save);
    enhanceAttachments(document, chooseSaver);
    enhanceAttachments(document, chooseSaver);
    expect(document.querySelectorAll('.bgm-attachments-bar')).toHaveLength(1);
    const button = document.querySelector<HTMLButtonElement>('.bgm-attachments-download')!;
    expect(button.textContent).toBe('Download all 2 attachments');
    expect(button.getAttribute('aria-label')).toContain('2 attachments');
    button.click();
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    expect(save.mock.calls).toEqual([
      [{ url: 'https://mail.google.com/mail/u/0?ui=2&attid=0.1', filename: 'a.pdf' }],
      [{ url: 'https://mail.google.com/mail/u/0?ui=2&attid=0.2', filename: 'b: c.pdf' }],
    ]);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Downloaded 2 attachments');
  });

  test('keeps messages in a thread separate', () => {
    document.body.innerHTML = `<div role="list"><div role="listitem"><div>${card('a', '1')}${card('b', '2')}</div></div><div role="listitem"><div>${card('c', '3')}</div></div></div>`;
    enhanceAttachments(document, vi.fn());
    expect(document.querySelectorAll('.bgm-attachments-bar')).toHaveLength(1);
    expect(document.querySelector('.bgm-attachments-download')?.textContent).toContain('2');
  });

  test('skips single attachments and removes a stale bar', () => {
    document.body.innerHTML = `<div><div>${card('a.pdf', '0.1')}${card('b.pdf', '0.2')}</div></div>`;
    enhanceAttachments(document, vi.fn());
    document.querySelector('[download_url]:last-child')?.remove();
    enhanceAttachments(document, vi.fn());
    expect(document.querySelector('.bgm-attachments-bar')).toBeNull();
  });
});
