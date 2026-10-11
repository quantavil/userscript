import * as z from 'zod/mini';
import type { SettingsData } from './types/chess';

export const DEFAULT_SETTINGS: SettingsData = {
  hackEnabled: 0,
  botPower: 30,
  moveTime: 100,
  autoMove: 1,
  ponderEnabled: 1,
  autoRematch: 0,
  moveMethod: 'click',
  menuPosition: null,
};

const flagSchema = z.union([z.literal(0), z.literal(1)]);
const integerInRange = (minimum: number, maximum: number) => z.number().check(z.int(), z.gte(minimum), z.lte(maximum));
const positionSchema = z.object({
  top: z.string().check(z.maxLength(32)),
  left: z.string().check(z.maxLength(32)),
});

const savedSettingsSchema = z.object({
  hackEnabled: z.optional(flagSchema),
  botPower: z.optional(integerInRange(1, 30)),
  moveTime: z.optional(integerInRange(100, 10_000)),
  autoMove: z.optional(flagSchema),
  ponderEnabled: z.optional(flagSchema),
  /** Legacy key written by earlier builds when background pondering was misnamed. */
  premoveEnabled: z.optional(flagSchema),
  autoRematch: z.optional(flagSchema),
  moveMethod: z.optional(z.union([z.literal('click'), z.literal('drag')])),
  menuPosition: z.optional(z.nullable(positionSchema)),
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

  const result = z.safeParse(savedSettingsSchema, saved);
  if (!result.success) return { ...DEFAULT_SETTINGS };

  const { premoveEnabled, ...currentSettings } = result.data;
  return {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ponderEnabled: currentSettings.ponderEnabled ?? premoveEnabled ?? DEFAULT_SETTINGS.ponderEnabled,
    hackEnabled: 0,
  };
}
