import { describe, expect, it, vi } from 'vitest';
import { BotState, Settings } from '../src/state.js';

function loadStoredSettings(raw: string | null) {
  vi.stubGlobal('localStorage', { getItem: () => raw });
  try {
    return Settings.load();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe('loadSettings', () => {
  it('disables automation when no saved settings exist', () => {
    BotState.hackEnabled = 1;
    expect(loadStoredSettings(null)).toBeNull();
    expect(BotState.hackEnabled).toBe(0);
  });

  it('fills missing values from defaults and disables automation on startup', () => {
    expect(loadStoredSettings('{"hackEnabled":1,"botPower":18}')).toEqual({
      hackEnabled: 0,
      botPower: 18,
      moveTime: 100,
      autoMove: 1,
      openingBook: 1,
      ponderEnabled: 1,
      menuPosition: null,
    });
    expect(BotState.hackEnabled).toBe(0);
    expect(BotState.botPower).toBe(18);
  });

  it('resets invalid saved settings to safe defaults', () => {
    expect(loadStoredSettings('{"hackEnabled":1,"botPower":99}')).toEqual({
      hackEnabled: 0,
      botPower: 30,
      moveTime: 100,
      autoMove: 1,
      openingBook: 1,
      ponderEnabled: 1,
      menuPosition: null,
    });
    expect(BotState.hackEnabled).toBe(0);
    expect(BotState.botPower).toBe(30);
  });

  it('resets malformed JSON to safe defaults', () => {
    expect(loadStoredSettings('{')).toEqual({
      hackEnabled: 0,
      botPower: 30,
      moveTime: 100,
      autoMove: 1,
      openingBook: 1,
      ponderEnabled: 1,
      menuPosition: null,
    });
    expect(BotState.hackEnabled).toBe(0);
  });

  it('accepts sub-100ms moveTime budgets down to 25ms and custom openingBook setting', () => {
    const settings = loadStoredSettings('{"moveTime":25,"openingBook":0}');

    expect(settings).toMatchObject({ moveTime: 25, openingBook: 0 });
    expect(BotState.moveTime).toBe(25);
    expect(BotState.openingBook).toBe(0);
  });

  it('drops the obsolete jitter setting instead of carrying dead state forward', () => {
    const settings = loadStoredSettings('{"jitter":700}');

    expect(settings).not.toHaveProperty('jitter');
    expect(BotState).not.toHaveProperty('jitter');
  });
});
