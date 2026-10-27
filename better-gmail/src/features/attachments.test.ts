import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { enhanceAttachments } from './attachments';

beforeEach(() => document.body.replaceChildren());

test('downloads each current attachment once without duplicating the control', async () => {
  document.body.innerHTML =
    '<div role="listitem"><section><div download_url="application/pdf:one.pdf:https://mail.google.com/one"></div><div download_url="image/png:two.png:https://mail.google.com/two"></div></section></div>';
  const save = vi.fn().mockResolvedValue(undefined);
  enhanceAttachments(document, save);
  enhanceAttachments(document, save);
  expect(document.querySelectorAll('.bgm-attachments-download')).toHaveLength(1);
  const button = document.querySelector<HTMLButtonElement>('.bgm-attachments-download')!;
  expect(button.getAttribute('aria-label')).toBe('Download all 2 attachments');
  button.click();
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save).toHaveBeenCalledWith({ filename: 'two.png', url: 'https://mail.google.com/two' });
});

test('places the last message download before Reply and keeps earlier messages separate', async () => {
  document.body.innerHTML =
    '<main role="main"><div role="listitem"><section><div download_url="application/pdf:first.pdf:https://mail.google.com/first"></div></section></div><div role="listitem"><section><div download_url="application/pdf:last.pdf:https://mail.google.com/last"></div></section></div><div class="amn"><span class="ams bkH" role="link">Reply</span><span>Forward</span></div></main>';
  const save = vi.fn().mockResolvedValue(undefined);
  enhanceAttachments(document, save);
  enhanceAttachments(document, save);
  const reply = document.querySelector('.bkH')!;
  const bar = reply.previousElementSibling;
  expect(bar?.classList.contains('bgm-attachments-bar')).toBe(true);
  expect(document.querySelectorAll('.bgm-attachments-bar')).toHaveLength(2);
  bar?.querySelector('button')?.click();
  await vi.waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      filename: 'last.pdf',
      url: 'https://mail.google.com/last',
    }),
  );
});

test('removes a footer control when Gmail removes its attachment cards', () => {
  document.body.innerHTML =
    '<main role="main"><div role="listitem"><section><div download_url="application/pdf:first.pdf:https://mail.google.com/first"></div></section></div><div class="amn"><span class="bkH" role="link">Reply</span></div></main>';
  const save = vi.fn().mockResolvedValue(undefined);
  enhanceAttachments(document, save);
  document.querySelector('[download_url]')?.remove();
  enhanceAttachments(document, save);
  expect(document.querySelector('.bgm-attachments-bar')).toBeNull();
});

test('places earlier message controls after the attachment group, outside floated cards', () => {
  document.body.innerHTML =
    '<main role="main"><div role="listitem"><div class="aQH attachments"><span download_url="application/pdf:first.pdf:https://mail.google.com/first"></span></div></div><div role="listitem"></div><div class="amn"><span class="bkH">Reply</span></div></main>';
  enhanceAttachments(document, vi.fn().mockResolvedValue(undefined));
  const group = document.querySelector('.attachments')!;
  expect(group.nextElementSibling?.classList.contains('bgm-attachments-bar')).toBe(true);
  expect(group.querySelector('.bgm-attachments-bar')).toBeNull();
});

test('does not mutate the attachment count on an unchanged refresh', () => {
  document.body.innerHTML =
    '<section><div download_url="application/pdf:one.pdf:https://mail.google.com/one"></div><div download_url="application/pdf:two.pdf:https://mail.google.com/two"></div></section>';
  const save = vi.fn().mockResolvedValue(undefined);
  enhanceAttachments(document, save);
  const observer = new MutationObserver(() => {});
  observer.observe(document.querySelector('.bgm-attachments-count')!, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  enhanceAttachments(document, save);
  expect(observer.takeRecords()).toHaveLength(0);
  observer.disconnect();
});

test('removes a busy footer control after its attachment is removed', async () => {
  document.body.innerHTML =
    '<main role="main"><div role="listitem"><section><div download_url="application/pdf:one.pdf:https://mail.google.com/one"></div></section></div><div class="amn"><span class="bkH">Reply</span></div></main>';
  let finish!: () => void;
  const save = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  enhanceAttachments(document, save);
  document.querySelector<HTMLButtonElement>('.bgm-attachments-download')!.click();
  document.querySelector('[download_url]')!.remove();
  enhanceAttachments(document, save);
  finish();
  await vi.waitFor(() => expect(document.querySelector('.bgm-attachments-bar')).toBeNull(), {
    timeout: 3000,
  });
});
