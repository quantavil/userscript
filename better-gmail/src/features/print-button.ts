import { showNotice } from '../core/notice';
import { selectors } from '../selectors';
import { collectPrintThread, openPrintView } from './print';

const className = 'bgm-print-button';

export function ensurePrintButton(root: Document = document): void {
  const subject = root.querySelector<HTMLElement>(selectors.threadSubject);
  const parent = subject?.parentElement;
  if (!subject || !parent || parent.querySelector(`.${className}`)) return;

  const button = root.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = 'Print';
  button.title = 'Print expanded messages';
  button.setAttribute('aria-label', 'Print expanded messages');
  button.addEventListener('mousedown', (event) => event.stopPropagation());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const thread = collectPrintThread(root);
    if (!thread) {
      showNotice('Open a message to print');
      return;
    }
    if (!openPrintView(thread, root)) showNotice('Could not open the print view');
  });
  subject.insertAdjacentElement('afterend', button);
}
