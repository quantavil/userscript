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

function senderColor(address: string): string {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(address.trim().toLowerCase())) {
    hash = Math.imul(hash ^ byte, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  // Adjust HSL lightness to a consistent relative luminance, keeping the strip
  // visible on both light and dark backgrounds while retaining the hashed hue.
  const channels = (lightness: number): number[] => {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * 0.75;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const offset = lightness - chroma / 2;
    const parts =
      hue < 60
        ? [chroma, x, 0]
        : hue < 120
          ? [x, chroma, 0]
          : hue < 180
            ? [0, chroma, x]
            : hue < 240
              ? [0, x, chroma]
              : hue < 300
                ? [x, 0, chroma]
                : [chroma, 0, x];
    return parts.map((part) => part + offset);
  };
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    const rgb = channels(mid).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const luminance = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    if (luminance < 0.18) low = mid;
    else high = mid;
  }
  return `#${channels((low + high) / 2)
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
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
    const sender = row.querySelector<HTMLElement>(selectors.visibleSender);
    sender?.classList.add('bgm-sender');
    const senderContainer = row.querySelector<HTMLElement>(selectors.senderContainer);
    const address = sender?.getAttribute('email') ?? '';
    const color = address.trim() ? senderColor(address) : '';
    if (row.style.getPropertyValue('--bgm-sender-color') !== color) {
      if (color) row.style.setProperty('--bgm-sender-color', color);
      else row.style.removeProperty('--bgm-sender-color');
    }
    const subject = row.querySelector<HTMLElement>(selectors.subject);
    if (!subject) continue;
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
