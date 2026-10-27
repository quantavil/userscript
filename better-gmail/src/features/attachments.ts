import { element } from '../core/dom';
import { getFolder, writeFile } from '../core/folder';
import { selectors } from '../selectors';

type Attachment = { url: string; filename: string };
type Save = (file: Attachment) => Promise<void>;

const gapMs = 500;
const maxLevels = 4;

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

function browserDownload(file: Attachment): Promise<void> {
  const link = element('a', 'bgm-download-link');
  link.href = file.url;
  link.download = file.filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Browsers throttle rapid-fire downloads; space them out.
  return new Promise((resolve) => window.setTimeout(resolve, gapMs));
}

// Saves into the default folder when there is one. If there is none, or a fetch or write
// fails, the browser downloads the file instead, so a click never silently does nothing.
async function chooseSave(): Promise<Save> {
  const folder = await getFolder();
  if (!folder) return browserDownload;
  return async (file) => {
    try {
      const response = await fetch(file.url, { credentials: 'include' });
      if (!response.ok) throw new Error(String(response.status));
      await writeFile(folder, file.filename, await response.blob());
    } catch {
      await browserDownload(file);
    }
  };
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function createBar(group: () => Element, chooseSaver: () => Promise<Save>): HTMLElement {
  const bar = element('div', 'bgm-attachments-bar');
  const button = element('button', 'bgm-attachments-download');
  button.type = 'button';
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
        const save = await chooseSaver();
        for (const [index, file] of files.entries()) {
          setText(button, `Downloading ${index + 1} of ${files.length}`);
          await save(file);
        }
        setText(status, `Downloaded ${files.length} attachments`);
      } catch {
        setText(status, 'Could not download all attachments');
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    })();
  });
  return bar;
}

export function enhanceAttachments(
  root: ParentNode,
  chooseSaver: () => Promise<Save> = chooseSave,
): void {
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
      bar = createBar(() => group, chooseSaver);
      anchor.before(bar);
    }
    live.add(bar);
    const button = bar.querySelector<HTMLButtonElement>('button');
    if (button && !button.disabled) {
      setText(button, `Download all ${count} attachments`);
      const label = `Download all ${count} attachments as separate files`;
      if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    }
  }
  for (const bar of document.querySelectorAll('.bgm-attachments-bar')) {
    if (!live.has(bar) && !bar.querySelector(':disabled')) bar.remove();
  }
}
