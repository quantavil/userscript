import { expect, test, vi } from 'vite-plus/test';
import { registerConversationMenu } from './conversation-menu';

test('updates the menu label and switches the view in both directions', () => {
  const register = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValueOnce(3);
  const unregister = vi.fn();
  const setEnabled = vi.fn();
  registerConversationMenu(register, unregister, setEnabled);
  expect(register.mock.calls[0]?.[0]).toBe('Disable minimal email view');
  register.mock.calls[0]?.[1]();
  expect(setEnabled).toHaveBeenLastCalledWith(false);
  expect(unregister).toHaveBeenCalledWith(1);
  expect(register.mock.calls[1]?.[0]).toBe('Enable minimal email view');
  register.mock.calls[1]?.[1]();
  expect(setEnabled).toHaveBeenLastCalledWith(true);
  expect(unregister).toHaveBeenCalledWith(2);
});
