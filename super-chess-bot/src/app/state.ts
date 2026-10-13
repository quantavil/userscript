import type { BotState as BotStateInterface } from '../chess/types.js';
import { type PersistedSettingKey, settingsModel } from '../settings/model.js';
import { getActiveSite } from '../sites/active.js';
import type { GameSnapshot } from '../sites/types.js';

/**
 * Site state cannot change inside one synchronous turn: the board only moves between tasks.
 * Caching for the current turn therefore collapses the several `read()` calls a single pass
 * makes into one, without ever serving a stale snapshot to the next pass.
 */
let cached: GameSnapshot | null = null;
let cachedThisTurn = false;

function readSiteSnapshot(): GameSnapshot | null {
  if (cachedThisTurn) return cached;
  try {
    const read = getActiveSite()?.read();
    cached = read?.kind === 'game' ? read.snapshot : null;
  } catch {
    cached = null;
  }
  cachedThisTurn = true;
  queueMicrotask(() => {
    cachedThisTurn = false;
    cached = null;
  });
  return cached;
}

function snapshot(): GameSnapshot | null {
  return readSiteSnapshot();
}

export function getFen(): string | null {
  return snapshot()?.fen ?? null;
}

export function getPlayerColor(): string | null {
  return snapshot()?.playerColor ?? null;
}

export function getSideToMove(): string | null {
  return snapshot()?.sideToMove ?? null;
}

export function isPlayersTurn(): boolean {
  const current = snapshot();
  return current ? current.playerColor === current.sideToMove : false;
}

export function isBoardFlipped(): boolean {
  return snapshot()?.orientation === 'black';
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
