import { GM_registerMenuCommand, GM_unregisterMenuCommand } from '$';
import { showNotice } from './core/notice';
import { observeUpdates } from './core/observer';
import { enhanceConversation, setConversationEnabled } from './features/conversation';
import { registerConversationMenu } from './features/conversation-menu';
import { collectPrintThread, openPrintView } from './features/print';
import { ensurePrintButton } from './features/print-button';
import { enhanceRows } from './features/rows';
import './style.css';

const copy = async (value: string): Promise<void> => navigator.clipboard.writeText(value);
const refreshConversation = (body: HTMLElement): void => {
  enhanceConversation(body);
  ensurePrintButton();
};
observeUpdates((row) => enhanceRows(row, copy), refreshConversation);
enhanceRows(document, copy);

enhanceConversation(document);
ensurePrintButton();

if (
  typeof GM_registerMenuCommand === 'function' &&
  typeof GM_unregisterMenuCommand === 'function'
) {
  registerConversationMenu(
    GM_registerMenuCommand,
    GM_unregisterMenuCommand,
    setConversationEnabled,
  );
}

if (typeof GM_registerMenuCommand === 'function') {
  GM_registerMenuCommand(
    'Print expanded messages',
    () => {
      const thread = collectPrintThread();
      if (!thread) {
        showNotice('Open a thread with an expanded message to print');
        return;
      }
      if (!openPrintView(thread)) showNotice('Could not open the print view');
    },
    'p',
  );
}
