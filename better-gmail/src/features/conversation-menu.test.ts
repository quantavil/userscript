import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { registerConversationMenu } from './conversation-menu';

describe('conversation menu', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  test('updates the menu label and switches the view in both directions with accessKey', () => {
    const register = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValueOnce(3);
    const unregister = vi.fn();
    const setEnabled = vi.fn();
    registerConversationMenu(register, unregister, setEnabled);

    expect(register.mock.calls[0]?.[0]).toBe('Disable minimal email view');
    expect(register.mock.calls[0]?.[2]).toBe('m');

    register.mock.calls[0]?.[1]();
    expect(setEnabled).toHaveBeenLastCalledWith(false);
    expect(unregister).toHaveBeenCalledWith(1);
    expect(register.mock.calls[1]?.[0]).toBe('Enable minimal email view');
    expect(register.mock.calls[1]?.[2]).toBe('m');

    register.mock.calls[1]?.[1]();
    expect(setEnabled).toHaveBeenLastCalledWith(true);
    expect(unregister).toHaveBeenCalledWith(2);
  });
});
