import { element } from '../core/dom';
import { selectors } from '../selectors';

type Copy = (value: string) => Promise<void>;
const svgNamespace = 'http://www.w3.org/2000/svg';
const copyPath =
  'M8 4h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm-4 11H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1';
const checkPath = 'M4 10l4 4 8-8';

function addAction(
  parent: HTMLElement,
  label: string,
  value: () => string,
  copy: Copy,
): HTMLButtonElement {
  const button = element('button', 'bgm-row-action');
  button.type = 'button';
  const defaultLabel = `Copy ${label.toLowerCase()}`;
  button.title = defaultLabel;
  button.setAttribute('aria-label', defaultLabel);
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(svgNamespace, 'path');
  path.setAttribute('d', copyPath);
  svg.append(path);
  button.append(svg);
  button.addEventListener('mousedown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const text = value();
    if (!text) return;
    void copy(text)
      .then(
        () => {
          button.title = 'Copied';
          path.setAttribute('d', checkPath);
        },
        () => {
          button.title = 'Copy failed';
        },
      )
      .finally(() => {
        button.setAttribute('aria-label', button.title);
        window.setTimeout(() => {
          button.title = defaultLabel;
          button.setAttribute('aria-label', defaultLabel);
          path.setAttribute('d', copyPath);
        }, 1500);
      });
  });
  parent.append(button);
  return button;
}

export function enhanceRows(root: ParentNode, copy: Copy): void {
  if (!document.activeElement?.matches('.bgm-subject-cell > .bgm-row-action:focus')) {
    document.querySelector('.bgm-subject-tooltip')?.remove();
  }
  for (const row of root.querySelectorAll<HTMLElement>(selectors.row)) {
    const subject = row.querySelector<HTMLElement>(selectors.subject);
    if (!subject) continue;
    const text = subject.textContent?.trim() ?? '';
    if (subject.title !== text) subject.title = text;
    subject.classList.add('bgm-subject');
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
        addAction(
          addressLine,
          'sender',
          () => row.querySelector(selectors.visibleSender)?.getAttribute('email') ?? '',
          copy,
        );
        senderContainer.append(addressLine);
      }
      const addressText = addressLine.querySelector<HTMLElement>('.bgm-sender-address');
      if (addressText && addressText.textContent !== address) addressText.textContent = address;
    } else if (senderContainer) {
      senderContainer.querySelector('.bgm-address-line')?.remove();
      senderContainer.classList.remove('bgm-sender-container');
      senderContainer.parentElement?.classList.remove('bgm-sender-cell');
    }
    const parent = subject.parentElement;
    if (!parent) continue;
    parent.classList.add('bgm-subject-cell');
    const snippet = parent.parentElement?.querySelector<HTMLElement>(selectors.snippet);
    snippet?.classList.add('bgm-snippet');
    syncOtp(subject, copy);
    if (snippet) syncOtp(snippet, copy);
    let subjectAction = parent.querySelector<HTMLButtonElement>(':scope > .bgm-row-action');
    if (!subjectAction) {
      const currentSubject = () => row.querySelector(selectors.subject)?.textContent?.trim() ?? '';
      subjectAction = addAction(parent, 'subject', currentSubject, copy);
      let tooltip: HTMLElement | undefined;
      subjectAction.addEventListener('focus', () => {
        tooltip = element('div', 'bgm-subject-tooltip', currentSubject());
        tooltip.setAttribute('role', 'tooltip');
        document.body.append(tooltip);
      });
      subjectAction.addEventListener('blur', () => {
        tooltip?.remove();
        tooltip = undefined;
      });
    }
    subjectAction.dataset.subject = text;
    subjectAction.setAttribute('aria-label', `Copy subject: ${text}`);
    row.classList.add('bgm-enhanced-row');
  }
}
