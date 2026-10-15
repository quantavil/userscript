import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { BotState } from '../../../src/app/state.js';
import type { SettingsData } from '../../../src/chess/types.js';
import { resetSettingsModel } from '../../../src/settings/model.js';
import { DEFAULT_SETTINGS, REPORT_DEPTH_MAX, SETTING_SPECS } from '../../../src/settings/schema.js';
import { Settings, setMenuPositionGetter } from '../../../src/settings/storage.js';

function stubStored(raw: string | null): { setItem: ReturnType<typeof vi.fn> } {
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { getItem: () => raw, setItem });
  return { setItem };
}

function loadStoredSettings(raw: string | null): SettingsData | null {
  stubStored(raw);
  try {
    return Settings.load();
  } finally {
    vi.unstubAllGlobals();
  }
}

/** The full expected settings record, with a couple of overrides. */
function expected(overrides: Partial<SettingsData> = {}): SettingsData {
  return { ...DEFAULT_SETTINGS, hackEnabled: false, ...overrides };
}

beforeEach(() => {
  resetSettingsModel();
  BotState.hackEnabled = false;
  setMenuPositionGetter(() => ({ top: '10px', left: '20px' }));
});

afterEach(() => {
  resetSettingsModel();
  setMenuPositionGetter(() => null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the settings field table', () => {
  it('covers every preference exactly once', () => {
    const keys = SETTING_SPECS.map((spec) => spec.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS)
        .filter((k) => k !== 'menuPosition')
        .sort(),
    );
    // `hackEnabled` is runtime state and must never be written back to storage.
    expect(keys.filter((key) => SETTING_SPECS.find((spec) => spec.key === key)?.persisted === false)).toEqual([
      'hackEnabled',
    ]);
  });

  it('gives every field a default of its own declared kind', () => {
    for (const spec of SETTING_SPECS) {
      if (spec.kind === 'flag') expect(typeof spec.default, spec.key).toBe('boolean');
      else if (spec.kind === 'number') expect(typeof spec.default, spec.key).toBe('number');
      else expect(spec.choices, spec.key).toContain(spec.default);
    }
    expect(DEFAULT_SETTINGS.hackEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.menuPosition).toBeNull();
  });
});

describe('Settings.load', () => {
  it('persists Madman mode as a real flag while keeping automation disabled', () => {
    expect(loadStoredSettings('{"madmanMode":true,"hackEnabled":true}')).toMatchObject({
      madmanMode: true,
      hackEnabled: false,
    });
    expect(loadStoredSettings('{"madmanMode":"true"}')).toMatchObject({ madmanMode: false });
  });
  it('disables automation when no saved settings exist', () => {
    BotState.hackEnabled = true;
    expect(loadStoredSettings(null)).toBeNull();
    expect(BotState.hackEnabled).toBe(false);
  });

  it('fills missing values from defaults and disables automation on startup', () => {
    expect(loadStoredSettings('{"hackEnabled":true,"botPower":18}')).toEqual(expected({ botPower: 18 }));
    expect(BotState.hackEnabled).toBe(false);
    expect(BotState.botPower).toBe(18);
  });

  it('never restores a persisted enable flag', () => {
    expect(loadStoredSettings('{"hackEnabled":true}')?.hackEnabled).toBe(false);
    expect(BotState.hackEnabled).toBe(false);
  });

  it('falls back to the default for an out-of-range botPower', () => {
    // The default happens to equal the maximum, so only a below-range input can show whether
    // this is a fallback to the default or a clamp into the allowed range.
    expect(DEFAULT_SETTINGS.botPower).toBe(30);
    expect(loadStoredSettings('{"botPower":99}')?.botPower).toBe(DEFAULT_SETTINGS.botPower);
    expect(loadStoredSettings('{"botPower":0}')?.botPower).toBe(DEFAULT_SETTINGS.botPower);
    expect(loadStoredSettings('{"botPower":-3}')?.botPower).toBe(DEFAULT_SETTINGS.botPower);
    expect(loadStoredSettings('{"botPower":7}')?.botPower).toBe(7);
  });

  it('falls back to the default for every out-of-range numeric setting', () => {
    expect(loadStoredSettings('{"moveTime":5001}')?.moveTime).toBe(DEFAULT_SETTINGS.moveTime);
    expect(loadStoredSettings('{"moveTime":1}')?.moveTime).toBe(DEFAULT_SETTINGS.moveTime);
    expect(loadStoredSettings('{"moveTime":250}')?.moveTime).toBe(250);
    expect(loadStoredSettings('{"targetElo":99999}')?.targetElo).toBe(DEFAULT_SETTINGS.targetElo);
    expect(loadStoredSettings('{"targetElo":-5}')?.targetElo).toBe(DEFAULT_SETTINGS.targetElo);
    expect(loadStoredSettings('{"targetElo":1800}')?.targetElo).toBe(1800);
    expect(loadStoredSettings(`{"reportDepth":${REPORT_DEPTH_MAX + 5}}`)?.reportDepth).toBe(
      DEFAULT_SETTINGS.reportDepth,
    );
    expect(loadStoredSettings('{"reportDepth":3}')?.reportDepth).toBe(DEFAULT_SETTINGS.reportDepth);
    expect(loadStoredSettings('{"reportDepth":22}')?.reportDepth).toBe(22);
  });

  it('falls back to the default for a non-boolean flag and an unknown enum member', () => {
    expect(loadStoredSettings('{"autoMove":1}')?.autoMove).toBe(DEFAULT_SETTINGS.autoMove);
    expect(loadStoredSettings('{"autoMove":0}')?.autoMove).toBe(DEFAULT_SETTINGS.autoMove);
    expect(loadStoredSettings('{"autoMove":false}')?.autoMove).toBe(false);
    expect(loadStoredSettings('{"blunderShield":"yes"}')?.blunderShield).toBe(DEFAULT_SETTINGS.blunderShield);
    expect(loadStoredSettings('{"openingStyle":"berserk"}')?.openingStyle).toBe(DEFAULT_SETTINGS.openingStyle);
    expect(loadStoredSettings('{"timingMode":"whenever"}')?.timingMode).toBe(DEFAULT_SETTINGS.timingMode);
    expect(loadStoredSettings('{"timingMode":"fixed"}')?.timingMode).toBe('fixed');
  });

  it('falls back individual invalid fields to defaults while preserving valid settings', () => {
    const settings = loadStoredSettings('{"moveTime":250,"botPower":99,"targetElo":1800}');
    expect(settings).toMatchObject({ moveTime: 250, botPower: 30, targetElo: 1800 });
  });

  it('resets malformed JSON to safe defaults', () => {
    expect(loadStoredSettings('{')).toEqual(expected());
    expect(BotState.hackEnabled).toBe(false);
  });

  it('accepts sub-100ms moveTime budgets and custom timing, book and style settings', () => {
    const settings = loadStoredSettings(
      '{"moveTime":25,"openingBook":false,"openingStyle":"hyper-aggressive","timingMode":"fixed"}',
    );

    expect(settings).toMatchObject({
      moveTime: 25,
      openingBook: false,
      openingStyle: 'hyper-aggressive',
      timingMode: 'fixed',
    });
    expect(BotState.moveTime).toBe(25);
    expect(BotState.openingBook).toBe(false);
    expect(BotState.openingStyle).toBe('hyper-aggressive');
    expect(BotState.timingMode).toBe('fixed');
  });

  it('reads and restores a persisted panel position, and rejects an oversized one', () => {
    const stored = JSON.stringify({
      ...DEFAULT_SETTINGS,
      menuPosition: { top: '42px', left: '43px' },
    });
    expect(loadStoredSettings(stored)?.menuPosition).toEqual({ top: '42px', left: '43px' });

    // Longer than the schema's 32-character limit, so it falls back to no saved position.
    const tooLong = JSON.stringify({
      ...DEFAULT_SETTINGS,
      menuPosition: { top: 'x'.repeat(64), left: '' },
    });
    expect(loadStoredSettings(tooLong)?.menuPosition).toBeNull();
    expect(loadStoredSettings(JSON.stringify({ ...DEFAULT_SETTINGS, menuPosition: 7 }))?.menuPosition).toBeNull();
  });

  it('never adds an untyped menuPosition key to BotState', () => {
    // Settings carry panel chrome that has no live accessor and no declared state field.
    loadStoredSettings('{"botPower":12}');
    expect(Object.hasOwn(BotState, 'menuPosition')).toBe(false);
    expect('menuPosition' in BotState).toBe(false);
  });

  it('drops the obsolete jitter setting instead of carrying dead state forward', () => {
    const settings = loadStoredSettings('{"jitter":700}');

    expect(settings).not.toHaveProperty('jitter');
    expect(Object.hasOwn(BotState, 'jitter')).toBe(false);
  });
});

describe('Settings.save', () => {
  it('writes every preference plus the current panel position', async () => {
    vi.useFakeTimers();
    const { setItem } = stubStored(null);

    BotState.botPower = 21;
    BotState.moveTime = 175;
    BotState.reportDepth = 24;
    BotState.targetElo = 2000;
    BotState.openingStyle = 'defensive';
    Settings.save();
    // The save is debounced, so the write lands only after the trailing window closes.
    expect(setItem).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);

    expect(setItem).toHaveBeenCalledTimes(1);
    const written = JSON.parse(setItem.mock.calls[0][1] as string);
    expect(written).toMatchObject({
      hackEnabled: false,
      botPower: 21,
      moveTime: 175,
      reportDepth: 24,
      targetElo: 2000,
      openingStyle: 'defensive',
      menuPosition: { top: '10px', left: '20px' },
    });
    expect(Object.keys(written).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  it('collapses a burst of changes into a single write', async () => {
    vi.useFakeTimers();
    const { setItem } = stubStored(null);

    BotState.botPower = 5;
    Settings.save();
    await vi.advanceTimersByTimeAsync(100);
    BotState.botPower = 6;
    Settings.save();
    await vi.advanceTimersByTimeAsync(100);
    Settings.save();
    await vi.advanceTimersByTimeAsync(250);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(setItem.mock.calls[0][1] as string).botPower).toBe(6);
  });

  it('flushes a pending trailing write instead of losing it', async () => {
    vi.useFakeTimers();
    const { setItem } = stubStored(null);

    BotState.botPower = 9;
    Settings.save();
    expect(setItem).not.toHaveBeenCalled();

    // A page unloading inside the debounce window must not drop the change.
    Settings.save.flush();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(setItem.mock.calls[0][1] as string).botPower).toBe(9);

    // Flushing again with nothing pending is a no-op.
    Settings.save.flush();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('survives blocked storage instead of throwing', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
    });

    Settings.save();
    await vi.advanceTimersByTimeAsync(250);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('round-trips through storage without losing any preference', async () => {
    vi.useFakeTimers();
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });

    BotState.botPower = 12;
    BotState.reportDepth = 11;
    BotState.gameReport = false;
    Settings.save();
    await vi.advanceTimersByTimeAsync(250);

    resetSettingsModel();
    expect(Settings.load()).toMatchObject({ botPower: 12, reportDepth: 11, gameReport: false });
  });
});
