import type { Attachment } from '../core/download';
import { element } from '../core/dom';
import { selectors } from '../selectors';

type Save = (file: Attachment) => Promise<void>;

const svgNamespace = 'http://www.w3.org/2000/svg';
const downloadPath = 'M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 16h12';
const checkPath = 'M4 10l4 4 8-8';
const resultMs = 2000;
const maxLevels = 6;

// Gmail stores `mime:filename:url` on each attachment card; names may contain colons.
function parseAttachment(card: Element): Attachment | undefined {
  const value = card.getAttribute('download_url') ?? '';
  const start = value.search(/https?:\/\//);
  if (start < 1) return undefined;
  const head = value.slice(0, start - 1);
  const filename = head.slice(head.indexOf(':') + 1).trim();
  return { url: value.slice(start), filename };
}

// Gmail's class names are obfuscated and change; the attribute and ARIA roles are the stable
// parts. Find the nearest ancestor holding the message's cards without crossing into the next
// message (a listitem), instead of relying on a container class.
function groupOf(card: Element): Element | null {
  let node = card.parentElement;
  for (let level = 0; node && level < maxLevels; level++) {
    if (node.querySelectorAll(selectors.attachmentCard).length > 1) return node;
    if (node.matches(selectors.message)) break;
    node = node.parentElement;
  }
  return card.parentElement;
}

function attachmentsIn(group: Element): Attachment[] {
  const found: Attachment[] = [];
  for (const card of group.querySelectorAll(selectors.attachmentCard)) {
    const attachment = parseAttachment(card);
    if (attachment) found.push(attachment);
  }
  return found;
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function createBar(group: () => Element, save: Save): HTMLElement {
  const bar = element('div', 'bgm-attachments-bar');
  const button = element('button', 'bgm-attachments-download');
  button.type = 'button';
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(svgNamespace, 'path');
  path.setAttribute('d', downloadPath);
  svg.append(path);
  button.append(svg, element('span', 'bgm-attachments-count'));
  const status = element('span', 'bgm-sr-only');
  status.setAttribute('role', 'status');
  bar.append(button, status);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    const files = attachmentsIn(group());
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    void (async () => {
      try {
        for (const [index, file] of files.entries()) {
          setText(button.lastElementChild as HTMLElement, `${index + 1}/${files.length}`);
          await save(file);
        }
        path.setAttribute('d', checkPath);
        setText(
          status,
          `Downloaded ${files.length} ${files.length === 1 ? 'attachment' : 'attachments'}`,
        );
        await new Promise((resolve) => window.setTimeout(resolve, resultMs));
      } catch {
        setText(status, 'Could not download all attachments');
      } finally {
        path.setAttribute('d', downloadPath);
        button.disabled = false;
        button.removeAttribute('aria-busy');
        setText(
          button.lastElementChild as HTMLElement,
          files.length > 1 ? String(files.length) : '',
        );
      }
    })();
  });
  return bar;
}

export function enhanceAttachments(root: ParentNode, save: Save): void {
  const groups = new Map<Element, Element>();
  for (const card of root.querySelectorAll(selectors.attachmentCard)) {
    const group = groupOf(card);
    if (group && !groups.has(group)) groups.set(group, card);
  }
  const live = new Set<Element>();
  for (const [group, firstCard] of groups) {
    const count = attachmentsIn(group).length;
    if (count < 2) continue;
    // Flat lists get the bar above the list; nested ones above the child holding the first card.
    let anchor: Element = firstCard;
    while (anchor.parentElement && anchor.parentElement !== group) anchor = anchor.parentElement;
    if (anchor === firstCard) anchor = group;
    let bar = anchor.previousElementSibling?.matches('.bgm-attachments-bar')
      ? (anchor.previousElementSibling as HTMLElement)
      : undefined;
    if (!bar) {
      bar = createBar(() => group, save);
      anchor.before(bar);
    }
    live.add(bar);
    const button = bar.querySelector<HTMLButtonElement>('button');
    if (button && !button.disabled) {
      setText(button.lastElementChild as HTMLElement, count > 1 ? String(count) : '');
      const label = count === 1 ? 'Download attachment' : `Download all ${count} attachments`;
      if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
      if (button.title !== label) button.title = label;
    }
  }
  for (const bar of document.querySelectorAll('.bgm-attachments-bar')) {
    if (!live.has(bar) && !bar.querySelector(':disabled')) bar.remove();
  }
}
