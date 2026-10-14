import type { BotState as BotStateInterface } from '../chess/types.js';
import { type PersistedSettingKey, settingsModel } from '../settings/model.js';
import { getActiveSite } from '../sites/active.js';
export function isBoardFlipped(): boolean {
  try {
    const read = getActiveSite()?.read();
    return read?.kind === 'game' ? read.snapshot.orientation === 'black' : false;
  } catch {
    return false;
  }
}

export function clearRecommendation(): void {
  BotState.bestMove = '-';
  BotState.currentEvaluation = '-';
  BotState.principalVariation = '-';
  BotState.multiPvLines = [];
}

// Runtime values and persisted settings have separate owners. The existing typed
// view exposes settings through accessors so callers cannot create duplicate copies.
type RuntimeState = Omit<BotStateInterface, keyof typeof settingsModel>;
const runtimeState: RuntimeState = {
  hackEnabled: false,
  currentEvaluation: '-',
  bestMove: '-',
  principalVariation: '-',
  statusInfo: 'Ready',
  recoveryAction: null,
  multiPvLines: [],
  evalHistory: [],
};
const preferenceKeys = Object.keys(settingsModel) as PersistedSettingKey[];
export const BotState = Object.defineProperties(
  runtimeState,
  Object.fromEntries(
    preferenceKeys.map((key) => [
      key,
      {
        enumerable: true,
        get: () => settingsModel[key],
        set: (value: unknown) => {
          settingsModel[key] = value as never;
        },
      },
    ]),
  ),
) as BotStateInterface;
