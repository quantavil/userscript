import * as v from 'valibot';
import type { SettingsData } from './types/chess';

export const DEFAULT_SETTINGS: SettingsData = {
  hackEnabled: 0,
  botPower: 30,
  moveTime: 100,
  timingMode: 'dynamic',
  autoMove: 1,
  openingBook: 1,
  openingStyle: 'balanced',
  ponderEnabled: 1,
  targetElo: 0,
  blunderShield: 1,
  ghostMode: 0,
  autoRetry: 1,
  gameReport: 1,
  reportDepth: 18,
  menuPosition: null,
};

export const MIN_MOVE_TIME = 25;
export const MAX_MOVE_TIME = 5000;

const flagSchema = v.union([v.literal(0), v.literal(1)]);
const integerInRange = (minimum: number, maximum: number) =>
  v.pipe(v.number(), v.integer(), v.minValue(minimum), v.maxValue(maximum));
const positionSchema = v.object({
  top: v.pipe(v.string(), v.maxLength(32)),
  left: v.pipe(v.string(), v.maxLength(32)),
});
const openingStyleSchema = v.picklist(['hyper-defensive', 'defensive', 'balanced', 'aggressive', 'hyper-aggressive']);
const timingModeSchema = v.picklist(['dynamic', 'fixed']);

const savedSettingsSchema = v.object({
  botPower: v.fallback(integerInRange(1, 30), DEFAULT_SETTINGS.botPower),
  moveTime: v.fallback(integerInRange(MIN_MOVE_TIME, MAX_MOVE_TIME), DEFAULT_SETTINGS.moveTime),
  timingMode: v.fallback(timingModeSchema, DEFAULT_SETTINGS.timingMode),
  autoMove: v.fallback(flagSchema, DEFAULT_SETTINGS.autoMove as 0 | 1),
  openingBook: v.fallback(flagSchema, DEFAULT_SETTINGS.openingBook as 0 | 1),
  openingStyle: v.fallback(openingStyleSchema, DEFAULT_SETTINGS.openingStyle),
  ponderEnabled: v.fallback(flagSchema, DEFAULT_SETTINGS.ponderEnabled as 0 | 1),
  targetElo: v.fallback(integerInRange(0, 3200), DEFAULT_SETTINGS.targetElo),
  blunderShield: v.fallback(flagSchema, DEFAULT_SETTINGS.blunderShield as 0 | 1),
  ghostMode: v.fallback(flagSchema, DEFAULT_SETTINGS.ghostMode as 0 | 1),
  autoRetry: v.fallback(flagSchema, DEFAULT_SETTINGS.autoRetry as 0 | 1),
  gameReport: v.fallback(flagSchema, DEFAULT_SETTINGS.gameReport as 0 | 1),
  reportDepth: v.fallback(integerInRange(10, 26), DEFAULT_SETTINGS.reportDepth),
  menuPosition: v.fallback(v.nullable(positionSchema), DEFAULT_SETTINGS.menuPosition),
});

/** Parse persisted JSON, filling invalid/missing fields with safe defaults. */
export function loadSettings(serialized: string | null): SettingsData {
  if (serialized === null) return { ...DEFAULT_SETTINGS };

  let saved: unknown;
  try {
    saved = JSON.parse(serialized);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }

  const result = v.safeParse(savedSettingsSchema, saved);
  if (!result.success) return { ...DEFAULT_SETTINGS };

  return {
    ...DEFAULT_SETTINGS,
    ...result.output,
    hackEnabled: 0,
  };
}
