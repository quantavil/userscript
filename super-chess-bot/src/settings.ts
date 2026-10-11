import * as v from 'valibot';
import type { SettingsData } from './types/chess';

export const DEFAULT_SETTINGS: SettingsData = {
  hackEnabled: 0,
  botPower: 30,
  moveTime: 100,
  autoMove: 1,
  openingBook: 1,
  openingStyle: 'balanced',
  ponderEnabled: 1,
  menuPosition: null,
};

const flagSchema = v.union([v.literal(0), v.literal(1)]);
const integerInRange = (minimum: number, maximum: number) =>
  v.pipe(v.number(), v.integer(), v.minValue(minimum), v.maxValue(maximum));
const positionSchema = v.object({
  top: v.pipe(v.string(), v.maxLength(32)),
  left: v.pipe(v.string(), v.maxLength(32)),
});
const openingStyleSchema = v.picklist(['hyper-defensive', 'defensive', 'balanced', 'aggressive', 'hyper-aggressive']);

const savedSettingsSchema = v.object({
  hackEnabled: v.optional(flagSchema),
  botPower: v.optional(integerInRange(1, 30)),
  moveTime: v.optional(integerInRange(25, 10_000)),
  autoMove: v.optional(flagSchema),
  openingBook: v.optional(flagSchema),
  openingStyle: v.optional(openingStyleSchema),
  ponderEnabled: v.optional(flagSchema),
  menuPosition: v.optional(v.nullable(positionSchema)),
});

/** Parse persisted JSON, filling old partial settings and failing closed on invalid data. */
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
