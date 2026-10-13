import { BotState } from '../app/state.js';
import { toggleGhostMode } from '../ui/panel.js';

export function registerMenuCommands(actions: {
  setEnabled: (enabled: boolean) => void;
  refreshSettings: () => void;
  recover: () => void;
}): void {
  const register =
    typeof GM_registerMenuCommand === 'function'
      ? GM_registerMenuCommand
      : typeof (window as unknown as { GM_registerMenuCommand?: typeof GM_registerMenuCommand })
            .GM_registerMenuCommand === 'function'
        ? (window as unknown as { GM_registerMenuCommand?: typeof GM_registerMenuCommand }).GM_registerMenuCommand
        : null;

  if (register) {
    register('♟ Toggle Ghost Mode', () => {
      toggleGhostMode(actions);
    });
    register('♟ Toggle Bot Automation', () => {
      actions.setEnabled(!BotState.hackEnabled);
    });
  }

  const page = window as Window & { __SCB_TOGGLE_GHOST__?: () => boolean };
  page.__SCB_TOGGLE_GHOST__ = () => toggleGhostMode(actions);
}
