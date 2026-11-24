import { element } from './dom';

let noticeTimer: number | undefined;

export function showNotice(message: string): void {
  let notice = document.querySelector<HTMLElement>('.bgm-copy-notice');
  if (!notice) {
    notice = element('div', 'bgm-copy-notice');
    notice.setAttribute('role', 'status');
    document.body.append(notice);
  }
  notice.textContent = message;
  if (noticeTimer !== undefined) window.clearTimeout(noticeTimer);
  const current = notice;
  noticeTimer = window.setTimeout(() => current.remove(), 1500);
}
