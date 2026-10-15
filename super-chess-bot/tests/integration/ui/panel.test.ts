import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { BotState } from '../../../src/app/state.js';
import { Settings } from '../../../src/settings/storage.js';
import {
  appendPanelLog,
  clearPanelLogs,
  toggleGhostMode,
  updatePanelAnalysis,
  updatePanelSetting,
} from '../../../src/ui/panel.js';

describe('panel settings and state management', () => {
  let setEnabledMock: (enabled: boolean) => void;
  let refreshSettingsMock: () => void;

  beforeEach(() => {
    setEnabledMock = vi.fn();
    refreshSettingsMock = vi.fn();
    BotState.hackEnabled = false;
    BotState.autoMove = true;
    BotState.autoRetry = true;
    BotState.ghostMode = false;
    vi.spyOn(Settings, 'save').mockImplementation(() => {});
  });

  afterEach(() => {
    BotState.madmanMode = false;
    vi.restoreAllMocks();
  });

  it('restarts analysis when Madman changes so old premoves cannot survive the toggle', () => {
    updatePanelSetting('madmanMode', true, { refreshSettings: refreshSettingsMock });
    expect(BotState.madmanMode).toBe(true);
    expect(refreshSettingsMock).toHaveBeenCalledOnce();
  });

  it('updates panel settings directly and persists them', () => {
    updatePanelSetting('botPower', 25);
    expect(BotState.botPower).toBe(25);
    expect(Settings.save).toHaveBeenCalled();

    updatePanelSetting('openingBook', false);
    expect(BotState.openingBook).toBe(false);

    updatePanelSetting('openingStyle', 'hyper-aggressive');
    expect(BotState.openingStyle).toBe('hyper-aggressive');

    updatePanelSetting('moveTime', 50);
    expect(BotState.moveTime).toBe(50);

    updatePanelSetting('timingMode', 'fixed');
    expect(BotState.timingMode).toBe('fixed');

    updatePanelSetting('targetElo', 1500);
    expect(BotState.targetElo).toBe(1500);

    updatePanelSetting('blunderShield', true);
    expect(BotState.blunderShield).toBe(true);

    updatePanelSetting('ghostMode', true);
    expect(BotState.ghostMode).toBe(true);

    updatePanelSetting('autoRetry', false);
    expect(BotState.autoRetry).toBe(false);

    updatePanelSetting('autoRetry', true);
    expect(BotState.autoRetry).toBe(true);
  });

  it('notifies actions when toggling enabled setting', () => {
    const actions = { setEnabled: setEnabledMock, refreshSettings: refreshSettingsMock };
    updatePanelSetting('hackEnabled', true, actions);
    expect(BotState.hackEnabled).toBe(true);
    expect(setEnabledMock).toHaveBeenCalledWith(true);
    expect(Settings.save).toHaveBeenCalled();

    updatePanelSetting('hackEnabled', false, actions);
    expect(BotState.hackEnabled).toBe(false);
    expect(setEnabledMock).toHaveBeenCalledWith(false);
  });

  it('calls refreshSettings only on search-altering setting changes', () => {
    const actions = { setEnabled: setEnabledMock, refreshSettings: refreshSettingsMock };
    updatePanelSetting('autoMove', false, actions);
    expect(BotState.autoMove).toBe(false);
    expect(refreshSettingsMock).not.toHaveBeenCalled();

    updatePanelSetting('botPower', 15, actions);
    expect(BotState.botPower).toBe(15);
    expect(refreshSettingsMock).toHaveBeenCalledOnce();
  });

  it('toggles ghost mode and persists setting', () => {
    updatePanelSetting('ghostMode', false);
    expect(BotState.ghostMode).toBe(false);

    const toggledOn = toggleGhostMode();
    expect(toggledOn).toBe(true);
    expect(BotState.ghostMode).toBe(true);
    expect(Settings.save).toHaveBeenCalled();

    const toggledOff = toggleGhostMode();
    expect(toggledOff).toBe(false);
    expect(BotState.ghostMode).toBe(false);
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

  it('manages panel logs with append and clear', () => {
    clearPanelLogs();
    appendPanelLog('Engine ready', 'status');
    appendPanelLog('Move input dropped', 'error');
    clearPanelLogs();
  });
});
