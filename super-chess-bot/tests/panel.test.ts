import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPanelCapabilityView, handlePanelKeyDown, updatePanelAnalysis, updatePanelSetting } from '../src/panel.js';
import { BotState, Settings } from '../src/state.js';

describe('panel hotkeys and settings', () => {
  let recoverMock: () => void;
  let setEnabledMock: (enabled: boolean) => void;
  let toggleMinimizedMock: () => void;

  beforeEach(() => {
    recoverMock = vi.fn();
    setEnabledMock = vi.fn();
    toggleMinimizedMock = vi.fn();
    BotState.hackEnabled = 0;
    vi.spyOn(Settings, 'save').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles enabled state when pressing KeyE', () => {
    expect(BotState.hackEnabled).toBe(0);

    handlePanelKeyDown(
      { key: 'e', code: 'KeyE' },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );

    expect(BotState.hackEnabled).toBe(1);
    expect(setEnabledMock).toHaveBeenCalledWith(true);

    handlePanelKeyDown(
      { key: 'e', code: 'KeyE' },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );

    expect(BotState.hackEnabled).toBe(0);
    expect(setEnabledMock).toHaveBeenCalledWith(false);
  });

  it('does not toggle when typing KeyE inside an input or textarea', () => {
    const inputTarget = { tagName: 'INPUT' };
    handlePanelKeyDown(
      { key: 'e', code: 'KeyE', target: inputTarget },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );
    expect(BotState.hackEnabled).toBe(0);
    expect(setEnabledMock).not.toHaveBeenCalled();

    const textareaTarget = { tagName: 'TEXTAREA' };
    handlePanelKeyDown(
      { key: 'e', code: 'KeyE', target: textareaTarget },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );
    expect(BotState.hackEnabled).toBe(0);
  });

  it('triggers recovery action when pressing KeyR and recoveryAction is available', () => {
    updatePanelAnalysis({
      status: 'Stockfish worker crashed',
      evaluation: '-',
      bestMove: '-',
      principalVariation: '-',
      recoveryAction: 'retry',
    });

    handlePanelKeyDown(
      { key: 'r', code: 'KeyR' },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );

    expect(recoverMock).toHaveBeenCalledOnce();
  });

  it('ignores KeyR when there is no recovery action', () => {
    updatePanelAnalysis({
      status: 'Ready',
      evaluation: '0.00',
      bestMove: 'e4',
      principalVariation: 'e4',
      recoveryAction: null,
    });

    handlePanelKeyDown(
      { key: 'r', code: 'KeyR' },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );

    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('toggles minimized when pressing Ctrl+B', () => {
    handlePanelKeyDown(
      { key: 'b', code: 'KeyB', ctrlKey: true },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );

    expect(toggleMinimizedMock).toHaveBeenCalledOnce();
  });

  it.each(['BODY', 'BUTTON', 'CG-BOARD'])('keeps shortcuts active on ordinary %s elements', (tagName) => {
    updatePanelSetting('enabled', false);
    vi.clearAllMocks();
    const target = { tagName, isContentEditable: false };
    const actions = { setEnabled: setEnabledMock, recover: recoverMock };

    handlePanelKeyDown({ key: 'e', code: 'KeyE', target }, actions, toggleMinimizedMock);
    expect(setEnabledMock).toHaveBeenCalledWith(true);

    updatePanelAnalysis({
      status: 'Stockfish worker crashed',
      evaluation: '-',
      bestMove: '-',
      principalVariation: '-',
      recoveryAction: 'retry',
    });
    handlePanelKeyDown({ key: 'r', code: 'KeyR', target }, actions, toggleMinimizedMock);
    expect(recoverMock).toHaveBeenCalledOnce();

    handlePanelKeyDown({ key: 'b', code: 'KeyB', ctrlKey: true, target }, actions, toggleMinimizedMock);
    expect(toggleMinimizedMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['INPUT', false],
    ['TEXTAREA', false],
    ['SELECT', false],
    ['DIV', true],
  ])('suppresses shortcuts on editable %s targets', (tagName, isContentEditable) => {
    const target = { tagName, isContentEditable };
    updatePanelAnalysis({
      status: 'Stockfish worker crashed',
      evaluation: '-',
      bestMove: '-',
      principalVariation: '-',
      recoveryAction: 'retry',
    });

    handlePanelKeyDown(
      { key: 'e', code: 'KeyE', target },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );
    handlePanelKeyDown(
      { key: 'r', code: 'KeyR', target },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );
    handlePanelKeyDown(
      { key: 'b', code: 'KeyB', ctrlKey: true, target },
      { setEnabled: setEnabledMock, recover: recoverMock },
      toggleMinimizedMock,
    );

    expect(BotState.hackEnabled).toBe(0);
    expect(setEnabledMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
    expect(toggleMinimizedMock).not.toHaveBeenCalled();
  });

  it('uses the composed-path target when a shortcut crosses a shadow root', () => {
    updatePanelSetting('enabled', false);
    vi.clearAllMocks();
    const target = { tagName: 'BUTTON', isContentEditable: false };
    handlePanelKeyDown(
      { key: 'e', code: 'KeyE', target: { tagName: 'INPUT' }, composedPath: () => [target] },
      { setEnabled: setEnabledMock },
      toggleMinimizedMock,
    );

    expect(setEnabledMock).toHaveBeenCalledWith(true);
  });

  it('updates panel settings directly and persists them', () => {
    updatePanelSetting('depth', 25);
    expect(BotState.botPower).toBe(25);
    expect(Settings.save).toHaveBeenCalled();

    updatePanelSetting('openingBook', false);
    expect(BotState.openingBook).toBe(0);

    updatePanelSetting('openingStyle', 'hyper-aggressive');
    expect(BotState.openingStyle).toBe('hyper-aggressive');

    updatePanelSetting('moveTimeMs', 50);
    expect(BotState.moveTime).toBe(50);
  });

  it('shows site-supported controls for each transport', () => {
    expect(getPanelCapabilityView({ input: 'selection' })).toEqual({
      transportNote: 'Moves use legal square selection on this site.',
    });
    expect(getPanelCapabilityView({ input: 'controller' })).toEqual({
      transportNote: 'Moves use the active game controller.',
    });
    expect(getPanelCapabilityView(undefined)).toEqual({ transportNote: null });
  });
});
