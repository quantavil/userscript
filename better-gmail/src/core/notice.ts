import { element } from './dom';

let noticeTimer: number | undefined;

export function showNotice(message: string, root: Document = document): void {
  let notice = root.querySelector<HTMLElement>('.bgm-copy-notice');
  if (!notice) {
    notice = element('div', 'bgm-copy-notice');
    notice.setAttribute('role', 'status');
    root.body.append(notice);
  }
  notice.textContent = message;
  if (noticeTimer !== undefined) window.clearTimeout(noticeTimer);
  const current = notice;
  noticeTimer = window.setTimeout(() => current.remove(), 1500);
}
