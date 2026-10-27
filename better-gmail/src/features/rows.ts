import { element } from '../core/dom';
import { selectors } from '../selectors';

type Copy = (value: string) => Promise<void>;
const enhancedTargets = new WeakSet<HTMLElement>();
let noticeTimer: number | undefined;

function copyTarget(target: HTMLElement, label: string, value: () => string, copy: Copy): void {
  target.classList.add('bgm-copy-target');
  target.tabIndex = 0;
  target.setAttribute('role', 'button');
  target.setAttribute('aria-label', `Copy ${label}: ${value()}`);
  if (enhancedTargets.has(target)) return;
  enhancedTargets.add(target);
  target.addEventListener('mousedown', (event) => event.stopPropagation());
  const activate = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    const text = value();
    if (!text) return;
    void copy(text).then(
      () => showNotice('Address copied'),
      () => showNotice('Copy failed'),
    );
  };
  target.addEventListener('click', activate);
  target.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') activate(event);
  });
}

function showNotice(message: string): void {
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

export function enhanceRows(root: ParentNode, copy: Copy): void {
  const rows =
    root instanceof HTMLElement && root.matches(selectors.row)
      ? [root]
      : root.querySelectorAll<HTMLElement>(selectors.row);
  for (const row of rows) {
    const background = getComputedStyle(row).backgroundColor.match(
      /rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/,
    );
    if (background) {
      const [, red = '0', green = '0', blue = '0'] = background;
      row.classList.toggle(
        'bgm-light-row',
        Number(red) * 0.299 + Number(green) * 0.587 + Number(blue) * 0.114 > 160,
      );
    }
    const subject = row.querySelector<HTMLElement>(selectors.subject);
    if (!subject) continue;
    const sender = row.querySelector<HTMLElement>(selectors.visibleSender);
    sender?.classList.add('bgm-sender');
    const senderContainer = row.querySelector<HTMLElement>(selectors.senderContainer);
    const address = sender?.getAttribute('email') ?? '';
    if (senderContainer && address) {
      senderContainer.classList.add('bgm-sender-container');
      senderContainer.parentElement?.classList.add('bgm-sender-cell');
      let addressLine = senderContainer.querySelector<HTMLElement>('.bgm-address-line');
      if (!addressLine) {
        addressLine = element('span', 'bgm-address-line');
        addressLine.append(element('span', 'bgm-sender-address'));
        senderContainer.append(addressLine);
      }
      const addressText = addressLine.querySelector<HTMLElement>('.bgm-sender-address');
      if (addressText) {
        if (addressText.textContent !== address) addressText.textContent = address;
        copyTarget(
          addressText,
          'sender address',
          () => row.querySelector(selectors.visibleSender)?.getAttribute('email') ?? '',
          copy,
        );
      }
    } else if (senderContainer) {
      senderContainer.querySelector('.bgm-address-line')?.remove();
      senderContainer.classList.remove('bgm-sender-container');
      senderContainer.parentElement?.classList.remove('bgm-sender-cell');
    }
    const parent = subject.parentElement;
    if (!parent) continue;
    const line = parent.parentElement;
    const snippet = line?.querySelector<HTMLElement>(selectors.snippet);
    snippet?.classList.add('bgm-snippet');
    row.classList.add('bgm-enhanced-row');
  }
}
