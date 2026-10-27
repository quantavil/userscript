import { element } from '../core/dom';

export interface Attachment {
  url: string;
  filename: string;
}
type Save = (file: Attachment) => Promise<void>;
const cardSelector = '[download_url]';
const bars = new WeakMap<Element, HTMLElement>();

function attachments(group: Element): Attachment[] {
  return Array.from(group.querySelectorAll(cardSelector)).flatMap((card) => {
    const value = card.getAttribute('download_url') ?? '';
    const match = /^([^:]+):(.+?):(https?:\/\/.+)$/.exec(value);
    if (!match?.[2] || !match[3]) return [];
    return [{ filename: match[2], url: match[3] }];
  });
}

function groupOf(card: Element): Element | null {
  const attachmentArea = card.closest('.aQH');
  if (attachmentArea) return attachmentArea;
  let node = card.parentElement;
  for (let level = 0; node && level < 6; level++, node = node.parentElement) {
    if (node.querySelectorAll(cardSelector).length > 1 || node.matches('[role="listitem"]'))
      return node;
  }
  return card.parentElement;
}

function createBar(group: Element, save: Save): HTMLElement {
  const bar = element('div', 'bgm-attachments-bar');
  const button = element('button', 'bgm-attachments-download');
  button.type = 'button';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.classList.add('bgm-attachments-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.6');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 3v12m-4-4 4 4 4-4M5 19h14');
  icon.append(path);
  const count = element('span', 'bgm-attachments-count');
  const status = element('span', 'bgm-sr-only');
  status.setAttribute('role', 'status');
  button.append(icon, element('span', 'bgm-attachments-label', 'Download'), count);
  bar.append(button, status);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    const files = attachments(group);
    if (!files.length) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    void (async () => {
      try {
        for (const [index, file] of files.entries()) {
          count.textContent = `${index + 1}/${files.length}`;
          await save(file);
        }
        path.setAttribute('d', 'M5 12l4 4L19 6');
        status.textContent = `Started ${files.length} ${files.length === 1 ? 'download' : 'downloads'}`;
        await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
      } catch {
        status.textContent = 'Could not start all downloads';
      } finally {
        path.setAttribute('d', 'M12 3v12m-4-4 4 4 4-4M5 19h14');
        button.disabled = false;
        button.removeAttribute('aria-busy');
        const remaining = group.isConnected ? attachments(group).length : 0;
        if (!remaining) bar.remove();
        else updateCount(button, remaining);
      }
    })();
  });
  return bar;
}

function updateCount(button: HTMLButtonElement, count: number): void {
  const counter = button.querySelector('.bgm-attachments-count');
  const text = count > 1 ? String(count) : '';
  if (counter && counter.textContent !== text) counter.textContent = text;
  const label = count === 1 ? 'Download attachment' : `Download all ${count} attachments`;
  if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
}

export function enhanceAttachments(root: ParentNode, save: Save): void {
  const groups = new Set(
    Array.from(root.querySelectorAll(cardSelector), groupOf).filter(
      (group): group is Element => group !== null,
    ),
  );
  const live = new Set<Element>();
  const allGroups = [...groups];
  for (const group of allGroups) {
    const count = attachments(group).length;
    if (!count) continue;
    let bar = bars.get(group);
    if (!bar || !bar.isConnected) {
      bar = createBar(group, save);
      bars.set(group, bar);
    }
    const main = group.closest('[role="main"]');
    const messages = main?.querySelectorAll('[role="listitem"]');
    const lastMessage = messages?.item(messages.length - 1);
    const reply = main?.querySelector('.amn > .bkH');
    const lastGroup = allGroups
      .filter((candidate) => candidate.closest('[role="main"]') === main)
      .at(-1);
    if (reply && lastMessage?.contains(group) && lastGroup === group) {
      bar.classList.add('bgm-attachments-bar-footer');
      if (bar.nextElementSibling !== reply) reply.before(bar);
    } else {
      bar.classList.remove('bgm-attachments-bar-footer');
      if (group.nextElementSibling !== bar) group.after(bar);
    }
    live.add(bar);
    const button = bar.querySelector<HTMLButtonElement>('button');
    if (button && !button.disabled) {
      updateCount(button, count);
    }
  }
  for (const bar of root.querySelectorAll('.bgm-attachments-bar')) {
    if (!live.has(bar) && !bar.querySelector(':disabled')) bar.remove();
  }
}
