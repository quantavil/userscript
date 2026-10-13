import * as v from 'valibot';
import type { OpeningStyle, SettingsData, TimingMode } from '../chess/types.js';

export const MIN_MOVE_TIME = 25;
export const MAX_MOVE_TIME = 5000;
const MIN_BOT_POWER = 1;
const MAX_BOT_POWER = 30;
const MAX_TARGET_ELO = 3200;

/** Report depth bounds. The stepper, the schema and the docs all read these, so they cannot drift. */
export const REPORT_DEPTH_MIN = 10;
export const REPORT_DEPTH_MAX = 26;

export const OPENING_STYLES: readonly OpeningStyle[] = [
  'hyper-defensive',
  'defensive',
  'balanced',
  'aggressive',
  'hyper-aggressive',
];

export const TIMING_MODES: readonly TimingMode[] = ['dynamic', 'fixed'];

const panelPositionSchema = v.object({
  top: v.pipe(v.string(), v.maxLength(32)),
  left: v.pipe(v.string(), v.maxLength(32)),
});

type PreferenceKey = keyof SettingsData;

/**
 * The single settings-field table.
 *
 * Defaults, the persisted schema, what gets written back to storage and what the panel reads and
 * writes are all derived from this list, so adding a preference is one entry rather than seven
 * coordinated edits that can disagree.
 *
 * `persisted: false` marks a field that exists on `SettingsData` but is not a stored preference:
 * `hackEnabled` is runtime state that must never survive a reload.
 */
export interface SettingSpec {
  readonly key: PreferenceKey;
  readonly kind: 'flag' | 'number' | 'enum';
  readonly default: boolean | number | string;
  readonly persisted: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly choices?: readonly string[];
}

export const SETTING_SPECS: readonly SettingSpec[] = [
  { key: 'hackEnabled', kind: 'flag', default: false, persisted: false },
  { key: 'botPower', kind: 'number', default: 30, persisted: true, min: MIN_BOT_POWER, max: MAX_BOT_POWER },
  { key: 'moveTime', kind: 'number', default: 100, persisted: true, min: MIN_MOVE_TIME, max: MAX_MOVE_TIME },
  { key: 'timingMode', kind: 'enum', default: 'dynamic', persisted: true, choices: TIMING_MODES },
  { key: 'autoMove', kind: 'flag', default: true, persisted: true },
  { key: 'openingBook', kind: 'flag', default: true, persisted: true },
  { key: 'openingStyle', kind: 'enum', default: 'balanced', persisted: true, choices: OPENING_STYLES },
  { key: 'ponderEnabled', kind: 'flag', default: true, persisted: true },
  { key: 'targetElo', kind: 'number', default: 0, persisted: true, min: 0, max: MAX_TARGET_ELO },
  { key: 'blunderShield', kind: 'flag', default: true, persisted: true },
  { key: 'ghostMode', kind: 'flag', default: false, persisted: true },
  { key: 'autoRetry', kind: 'flag', default: true, persisted: true },
  { key: 'gameReport', kind: 'flag', default: true, persisted: true },
  { key: 'reportDepth', kind: 'number', default: 18, persisted: true, min: REPORT_DEPTH_MIN, max: REPORT_DEPTH_MAX },
];

/** Compile-time proof that the table covers every field of `SettingsData` except panel chrome. */
type Uncovered = Exclude<PreferenceKey, 'menuPosition' | (typeof SETTING_SPECS)[number]['key']>;
const _everyFieldIsSpecified: Record<Uncovered, never> = { ...(undefined as unknown as Record<Uncovered, never>) };

function specValidator(spec: SettingSpec) {
  switch (spec.kind) {
    case 'flag':
      return v.boolean();
    case 'number':
      return v.pipe(
        v.number(),
        v.integer(),
        v.minValue(spec.min ?? 0),
        v.maxValue(spec.max ?? Number.MAX_SAFE_INTEGER),
      );
    case 'enum':
      return v.picklist([...(spec.choices ?? [])] as [string, ...string[]]);
  }
}

export const DEFAULT_SETTINGS: SettingsData = Object.freeze({
  ...Object.fromEntries(SETTING_SPECS.map((spec) => [spec.key, spec.default])),
  menuPosition: null,
}) as SettingsData;

/**
 * Each persisted field is validated against its own kind and falls back to its own default, so
 * an invalid value never silently adopts a neighbouring field's fallback.
 *
 * `menuPosition` is persisted panel chrome rather than a preference, so it is validated here but
 * deliberately absent from the field table and from the live state.
 */
const savedSettingsSchema = v.object({
  ...(Object.fromEntries(
    SETTING_SPECS.filter((spec) => spec.persisted).map((spec) => [
      spec.key,
      v.fallback(specValidator(spec), spec.default as never),
    ]),
  ) as Record<string, ReturnType<typeof specValidator>>),
  menuPosition: v.fallback(v.nullable(panelPositionSchema), DEFAULT_SETTINGS.menuPosition),
});

/** Parse persisted JSON, filling invalid/missing fields with safe defaults. */
export function loadSettings(serialized: string): SettingsData {
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
    hackEnabled: false,
  } as SettingsData;
}
