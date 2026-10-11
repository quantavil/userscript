import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPanelCapabilityView, toggleGhostMode, updatePanelAnalysis, updatePanelSetting } from '../src/panel.js';
import { BotState, Settings } from '../src/state.js';

describe('panel settings and state management', () => {
  let setEnabledMock: (enabled: boolean) => void;
  let refreshSettingsMock: () => void;

  beforeEach(() => {
    setEnabledMock = vi.fn();
    refreshSettingsMock = vi.fn();
    BotState.hackEnabled = 0;
    BotState.autoMove = 1;
    BotState.autoRetry = 1;
    BotState.ghostMode = 0;
    vi.spyOn(Settings, 'save').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    updatePanelSetting('timingMode', 'fixed');
    expect(BotState.timingMode).toBe('fixed');

    updatePanelSetting('targetElo', 1500);
    expect(BotState.targetElo).toBe(1500);

    updatePanelSetting('blunderShield', true);
    expect(BotState.blunderShield).toBe(1);

    updatePanelSetting('ghostMode', true);
    expect(BotState.ghostMode).toBe(1);

    updatePanelSetting('autoRetry', false);
    expect(BotState.autoRetry).toBe(0);

    updatePanelSetting('autoRetry', true);
    expect(BotState.autoRetry).toBe(1);
  });

  it('notifies actions when toggling enabled setting', () => {
    const actions = { setEnabled: setEnabledMock, refreshSettings: refreshSettingsMock };
    updatePanelSetting('enabled', true, actions);
    expect(BotState.hackEnabled).toBe(1);
    expect(setEnabledMock).toHaveBeenCalledWith(true);
    expect(Settings.save).toHaveBeenCalled();

    updatePanelSetting('enabled', false, actions);
    expect(BotState.hackEnabled).toBe(0);
    expect(setEnabledMock).toHaveBeenCalledWith(false);
  });

  it('calls refreshSettings on non-enabled setting change', () => {
    const actions = { setEnabled: setEnabledMock, refreshSettings: refreshSettingsMock };
    updatePanelSetting('autoMove', false, actions);
    expect(BotState.autoMove).toBe(0);
    expect(refreshSettingsMock).toHaveBeenCalledOnce();
  });

  it('toggles ghost mode and persists setting', () => {
    updatePanelSetting('ghostMode', false);
    expect(BotState.ghostMode).toBe(0);

    const toggledOn = toggleGhostMode();
    expect(toggledOn).toBe(true);
    expect(BotState.ghostMode).toBe(1);
    expect(Settings.save).toHaveBeenCalled();

    const toggledOff = toggleGhostMode();
    expect(toggledOff).toBe(false);
    expect(BotState.ghostMode).toBe(0);
  });

  it('updates panel analysis with multiPv lines and eval history', () => {
    updatePanelAnalysis({
      status: 'Ready',
      evaluation: '+0.50',
      bestMove: 'e4',
      principalVariation: 'e4 e5',
      recoveryAction: null,
      multiPvLines: [
        { multipv: 1, uci: 'e2e4', evaluation: { cp: 50 }, depth: 20, pv: 'e2e4 e7e5' },
        { multipv: 2, uci: 'd2d4', evaluation: { cp: 30 }, depth: 20, pv: 'd2d4 d7d5' },
      ],
      evalHistory: [0, 0.2, 0.5],
    });
    // Should run cleanly without errors
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
