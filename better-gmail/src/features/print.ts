import { selectors } from '../selectors';

export interface PrintThread {
  subject: string;
  messages: PrintMessage[];
}

interface PrintMessage {
  sender: string;
  email: string;
  date: string;
  body: HTMLElement;
}

const printStyles = `
  @page { size: auto; margin: 14mm 16mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #202124; }
  body { font: 14px/1.55 Arial, Helvetica, sans-serif; }
  .bgm-print-header {
    margin: 0 0 18px;
    padding: 0 0 10px;
    border-bottom: 2px solid #202124;
  }
  h1 { margin: 0 0 4px; font-size: 20px; line-height: 1.3; }
  .bgm-print-count { margin: 0; color: #5f6368; font-size: 12px; }
  .bgm-print-message {
    margin: 0 0 18px;
    padding: 0 0 14px;
    border-bottom: 1px solid #dadce0;
  }
  .bgm-print-message:last-child { border-bottom: 0; }
  .bgm-print-message-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
    margin-bottom: 8px;
  }
  .bgm-print-from { min-width: 0; }
  .bgm-print-from strong { font-size: 14px; }
  .bgm-print-email { margin-left: 6px; color: #5f6368; font-size: 12px; }
  .bgm-print-date { color: #5f6368; font-size: 12px; white-space: nowrap; }
  .bgm-print-body { overflow-wrap: anywhere; }
  .bgm-print-body img { max-width: 100% !important; height: auto !important; }
  .bgm-print-body table { width: auto !important; max-width: 100% !important; }
  .bgm-print-body a { color: #0b57d0; }
  .bgm-print-body blockquote {
    margin: 8px 0;
    padding-left: 10px;
    border-left: 2px solid #dadce0;
  }
  .bgm-print-body pre { white-space: pre-wrap; }
`;

function isExpanded(body: HTMLElement, message: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = body;
    node && node !== message.parentElement;
    node = node.parentElement
  ) {
    if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  // Gmail can hide a collapsed body through a class instead of an inline style.
  // getClientRects catches that in a real browser; happy-dom has no layout, so
  // only enforce the geometry check when the page itself has layout.
  if (typeof body.getClientRects === 'function') {
    const root = body.ownerDocument.body;
    if (body.getClientRects().length === 0 && root.getClientRects().length > 0) return false;
  }
  return true;
}

function printableBody(body: HTMLElement): HTMLElement {
  const clone = body.cloneNode(true) as HTMLElement;
  for (const control of clone.querySelectorAll('.bgm-reveal')) control.remove();
  for (const section of clone.querySelectorAll<HTMLElement>('.bgm-collapsed-section')) {
    section.hidden = false;
    section.classList.remove('bgm-collapsed-section');
  }
  for (const node of clone.querySelectorAll(
    'script, iframe, object, embed, link, meta, form, input, select, textarea, button',
  )) {
    node.remove();
  }
  for (const node of clone.querySelectorAll<HTMLElement>('*')) {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    }
  }
  return clone;
}

export function collectPrintThread(root: Document = document): PrintThread | null {
  const main = root.querySelector<HTMLElement>(selectors.thread);
  if (!main) return null;
  const subject =
    main.querySelector<HTMLElement>(selectors.threadSubject)?.textContent?.trim() ||
    root.title.trim() ||
    'Gmail thread';
  const messages: PrintMessage[] = [];
  for (const node of main.querySelectorAll<HTMLElement>(selectors.message)) {
    const body = node.querySelector<HTMLElement>(selectors.messageBody);
    if (!body || !isExpanded(body, node)) continue;
    const senderNode = node.querySelector<HTMLElement>(selectors.messageSender);
    const emailNode = node.querySelector<HTMLElement>(selectors.messageEmail);
    const dateNode = node.querySelector<HTMLElement>(selectors.messageDate);
    const email = senderNode?.getAttribute('email')?.trim() || emailNode?.textContent?.trim() || '';
    const sender = senderNode?.textContent?.trim() || email || 'Unknown sender';
    const date = dateNode?.getAttribute('title')?.trim() || dateNode?.textContent?.trim() || '';
    messages.push({ sender, email, date, body: printableBody(body) });
  }
  return messages.length ? { subject, messages } : null;
}

export function buildPrintDocument(doc: Document, thread: PrintThread): void {
  doc.title = thread.subject;
  doc.documentElement.lang = doc.documentElement.lang || 'en';
  const style = doc.createElement('style');
  style.textContent = printStyles;
  doc.head.append(style);

  const header = doc.createElement('header');
  header.className = 'bgm-print-header';
  const title = doc.createElement('h1');
  title.textContent = thread.subject;
  const count = doc.createElement('p');
  count.className = 'bgm-print-count';
  count.textContent = `${thread.messages.length} expanded message${
    thread.messages.length === 1 ? '' : 's'
  }`;
  header.append(title, count);
  doc.body.append(header);

  for (const message of thread.messages) {
    const article = doc.createElement('article');
    article.className = 'bgm-print-message';
    const head = doc.createElement('div');
    head.className = 'bgm-print-message-head';
    const from = doc.createElement('div');
    from.className = 'bgm-print-from';
    const name = doc.createElement('strong');
    name.textContent = message.sender;
    from.append(name);
    if (message.email && message.email !== message.sender) {
      const email = doc.createElement('span');
      email.className = 'bgm-print-email';
      email.textContent = message.email;
      from.append(email);
    }
    const date = doc.createElement('time');
    date.className = 'bgm-print-date';
    date.textContent = message.date;
    head.append(from, date);
    const body = doc.createElement('div');
    body.className = 'bgm-print-body';
    body.append(message.body);
    article.append(head, body);
    doc.body.append(article);
  }
}

export function openPrintView(thread: PrintThread, doc: Document = document): boolean {
  const frame = doc.createElement('iframe');
  frame.className = 'bgm-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText =
    'position: fixed; left: -10000px; top: 0; width: 800px; height: 600px; border: 0;';
  doc.body.append(frame);

  const view = frame.contentWindow;
  const printDoc = frame.contentDocument;
  if (!view || !printDoc) {
    frame.remove();
    return false;
  }

  buildPrintDocument(printDoc, thread);
  const active = doc.activeElement;
  const cleanup = (): void => {
    frame.remove();
    if (active instanceof HTMLElement && active.isConnected) active.focus({ preventScroll: true });
  };
  view.addEventListener('afterprint', cleanup, { once: true });
  doc.defaultView?.setTimeout(cleanup, 30_000);
  if (typeof view.print !== 'function') {
    cleanup();
    return false;
  }
  try {
    view.focus();
    view.print();
  } catch {
    cleanup();
    return false;
  }
  return true;
}
