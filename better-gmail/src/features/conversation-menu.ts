type Register = (label: string, action: () => void) => number | string;
type Unregister = (id: number | string) => void;

export function registerConversationMenu(
  register: Register,
  unregister: Unregister,
  setEnabled: (enabled: boolean) => void,
): void {
  let enabled = true;
  const install = (): void => {
    const id = register(`${enabled ? 'Disable' : 'Enable'} minimal email view`, () => {
      enabled = !enabled;
      setEnabled(enabled);
      unregister(id);
      install();
    });
  };
  install();
}
