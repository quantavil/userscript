import { showNotice } from '../core/notice';

export type Register = (label: string, action: () => void, accessKey?: string) => number | string;
export type Unregister = (id: number | string) => void;

export function registerConversationMenu(
  register: Register,
  unregister: Unregister,
  setEnabled: (enabled: boolean) => void,
  initialEnabled = true,
): void {
  let enabled = initialEnabled;
  let currentId: number | string | undefined;

  const install = (): void => {
    if (currentId !== undefined) {
      try {
        unregister(currentId);
      } catch {
        // Tampermonkey can fail unregistering mid-session
      }
    }
    const label = `${enabled ? 'Disable' : 'Enable'} minimal email view`;
    currentId = register(
      label,
      () => {
        enabled = !enabled;
        setEnabled(enabled);
        install();
        showNotice(`Minimal email view ${enabled ? 'enabled' : 'disabled'}`);
      },
      'm',
    );
  };

  install();
}
