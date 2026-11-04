import { GM_registerMenuCommand, GM_unregisterMenuCommand } from '$';
import { observeUpdates } from './core/observer';
import { enhanceConversation, setConversationEnabled } from './features/conversation';
import { registerConversationMenu } from './features/conversation-menu';
import { enhanceRows } from './features/rows';
import './style.css';

const copy = async (value: string): Promise<void> => navigator.clipboard.writeText(value);
observeUpdates((row) => enhanceRows(row, copy), enhanceConversation);
enhanceRows(document, copy);

enhanceConversation(document);

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
