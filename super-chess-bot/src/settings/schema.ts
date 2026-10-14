import * as v from 'valibot';
import type { OpeningStyle, SettingsData, TimingMode } from '../chess/types.js';

export const MIN_MOVE_TIME = 25;
export const MAX_MOVE_TIME = 5000;
export const MIN_BOT_POWER = 1;
export const MAX_BOT_POWER = 30;
export const MAX_TARGET_ELO = 3200;

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
 * The single settings-field table. Defaults, the persisted schema, the live store, what
 * `Settings.save` writes and what the panel reads all derive from it, so adding a preference is
 * one entry. `persisted: false` marks runtime state that must never survive a reload.
 */
type SettingSpec =
  | { readonly kind: 'flag'; readonly default: boolean }
  | { readonly kind: 'number'; readonly default: number; readonly min: number; readonly max: number }
  | { readonly kind: 'enum'; readonly default: string; readonly choices: readonly string[] };

type SpecEntry = SettingSpec & { readonly key: PreferenceKey; readonly persisted: boolean };

export const SETTING_SPECS = [
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
  { key: 'madmanMode', kind: 'flag', default: false, persisted: true },
  { key: 'ghostMode', kind: 'flag', default: false, persisted: true },
  { key: 'autoRetry', kind: 'flag', default: true, persisted: true },
  { key: 'premove', kind: 'flag', default: true, persisted: true },
  { key: 'gameReport', kind: 'flag', default: true, persisted: true },
  { key: 'reportDepth', kind: 'number', default: 18, persisted: true, min: REPORT_DEPTH_MIN, max: REPORT_DEPTH_MAX },
] as const satisfies readonly SpecEntry[];

/** Compile-time proof the table covers every preference. */
type Uncovered = Exclude<PreferenceKey, 'menuPosition' | (typeof SETTING_SPECS)[number]['key']>;
const _tableCoversEveryPreference: Record<Uncovered, never> = {};

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

// `menuPosition` is persisted panel chrome, validated here but deliberately not a preference.
// Each field falls back to its own default, so an invalid value never adopts a neighbour's.
const savedSettingsSchema = v.object({
  ...(Object.fromEntries(
    SETTING_SPECS.filter((spec) => spec.persisted).map((spec) => [
      spec.key,
      v.fallback(specValidator(spec), spec.default as never),
    ]),
  ) as Record<string, ReturnType<typeof specValidator>>),
  menuPosition: v.fallback(v.nullable(panelPositionSchema), DEFAULT_SETTINGS.menuPosition),
});

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
