import { canonicalFen, replaySanLine } from '../history.js';
import type { Color, GameSnapshot, SiteRead } from './types.js';

export interface PychessMove {
  ply: number;
  san: string;
  active: boolean;
}

export interface PychessClockObservation {
  min: string | null;
  sec: string | null;
  connecting: boolean;
}

export interface PychessObservation {
  metadata: {
    isRoundView: boolean;
    pathname: string;
    gameId: string | null;
    username: string | null;
    whitePlayer: string | null;
    blackPlayer: string | null;
    variant: string | null;
    chess960: string | null;
    correspondence: string | null;
    level: string | null;
    initialFen: string | null;
    status: string | null;
    initialResult: string | null;
  };
  board: {
    element: HTMLElement | null;
    owned: boolean;
    connected: boolean;
    visible: boolean;
    width: number;
    height: number;
  };
  state: {
    fen: string | null;
    displayedPlacement: string | null;
    turnColor: ColorName | null;
    movableColor: ColorName | null;
    orientation: ColorName | null;
  };
  moves: readonly PychessMove[];
  result: { text: string | null; postgame: boolean };
  clocks: { clock0: PychessClockObservation; clock1: PychessClockObservation };
}

type ColorName = 'white' | 'black';

const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TERMINAL_RESULTS = new Set(['1-0', '0-1', '1/2-1/2']);
let cachedReplayKey: string | null = null;
let cachedReplay: ReturnType<typeof replaySanLine>;

function colorValue(color: ColorName | null): Color | null {
  if (color === 'white') return 'w';
  if (color === 'black') return 'b';
  return null;
}

function normalizedName(value: string | null): string | null {
  return value?.trim().toLocaleLowerCase() || null;
}

function pathGameId(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 1 ? parts[0] : null;
}

function parseClock(clock: PychessClockObservation): number | null {
  if (clock.connecting || !clock.min || !clock.sec) return null;
  if (!/^\d{1,3}$/.test(clock.min) || !/^\d{1,2}(?:\.\d+)?$/.test(clock.sec)) return null;
  const minutes = Number(clock.min);
  const seconds = Number(clock.sec);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null;
  return Math.round((minutes * 60 + seconds) * 1000);
}

function unavailable(reason: string): SiteRead {
  return { kind: 'ineligible', reason };
}

function replayAcceptedHistory(startFen: string, sans: readonly string[]): ReturnType<typeof replaySanLine> {
  const key = JSON.stringify([startFen, sans]);
  if (key === cachedReplayKey) return cachedReplay;
  cachedReplayKey = key;
  cachedReplay = replaySanLine(startFen, sans);
  return cachedReplay;
}

export function parsePychessObservation(observation: PychessObservation, identity: object): SiteRead {
  const { metadata, board, state } = observation;
  if (!identity || typeof identity !== 'object') return unavailable('PyChess game identity is unavailable');
  if (!metadata.isRoundView) return { kind: 'waiting', reason: 'Waiting for PyChess AI game' };
  const urlGameId = pathGameId(metadata.pathname);
  if (!metadata.gameId || !urlGameId || metadata.gameId !== urlGameId)
    return unavailable('PyChess game identity does not match the current URL');

  const username = normalizedName(metadata.username);
  const whitePlayer = normalizedName(metadata.whitePlayer);
  const blackPlayer = normalizedName(metadata.blackPlayer);
  if (!username || !whitePlayer || !blackPlayer || (username !== whitePlayer && username !== blackPlayer))
    return unavailable('PyChess player identity is unavailable or conflicting');
  if (username === whitePlayer && username === blackPlayer) return unavailable('PyChess player identity is ambiguous');
  const playerColor: Color = username === whitePlayer ? 'w' : 'b';
  const opponent = playerColor === 'w' ? blackPlayer : whitePlayer;
  if (opponent !== 'fairy-stockfish') return unavailable('PyChess Fairy-Stockfish game required');
  if (metadata.variant?.trim().toLowerCase() !== 'chess') return unavailable('PyChess chess variant required');
  if (!['false', '0'].includes(metadata.chess960?.trim().toLowerCase() ?? ''))
    return unavailable('PyChess Chess960 is not supported');
  if (!['false', '0'].includes(metadata.correspondence?.trim().toLowerCase() ?? ''))
    return unavailable('PyChess real-time game required');
  if (!metadata.level || !/^\d+$/.test(metadata.level) || Number(metadata.level) < 0 || Number(metadata.level) > 8)
    return unavailable('PyChess AI level is invalid');
  if (!board.element || !board.connected || !board.visible || !board.owned)
    return unavailable('PyChess board is disconnected, hidden, or not owned by this game');
  if (board.width !== 8 || board.height !== 8) return unavailable('PyChess board is not 8×8');
  const orientation = state.orientation;
  if (orientation !== 'white' && orientation !== 'black')
    return unavailable('PyChess board orientation is unavailable');
  if (!state.fen) return unavailable('PyChess accepted FEN is unavailable');
  const fen = canonicalFen(state.fen);
  if (!fen) return unavailable('PyChess accepted FEN is malformed');
  const sideField = fen.split(' ')[1];
  if (sideField !== 'w' && sideField !== 'b') return unavailable('PyChess side to move is unavailable');
  const sideToMove = sideField as Color;

  const startFen = metadata.initialFen?.trim() || STANDARD_START_FEN;
  if (!canonicalFen(startFen)) return unavailable('PyChess initial FEN is malformed');
  const orderedMoves = [...observation.moves];
  if (orderedMoves.some((move, index) => move.ply !== index + 1 || !move.san.trim()))
    return unavailable('PyChess move history is truncated or noncontiguous');
  const replay = replayAcceptedHistory(
    startFen,
    orderedMoves.map((move) => move.san),
  );
  if (!replay) return unavailable('PyChess move history contains invalid SAN');
  const activeMoves = orderedMoves.filter((move) => move.active);
  if (activeMoves.length > 1) return unavailable('PyChess active move selection is ambiguous');
  const activePly = activeMoves[0]?.ply ?? 0;
  if (activePly > orderedMoves.length) return unavailable('PyChess active move is outside the game history');
  if (replay.fens[activePly] !== fen)
    return { kind: 'waiting', reason: 'Waiting for PyChess position and move history to synchronize' };

  const renderedResult = observation.result.text?.trim() ?? '';
  const terminalResult = TERMINAL_RESULTS.has(renderedResult) || renderedResult === '*';
  const initialStatus = Number(metadata.status);
  const initialResult = metadata.initialResult?.trim() ?? '';
  const initialTerminal = Number.isInteger(initialStatus) && initialStatus < 0 && TERMINAL_RESULTS.has(initialResult);
  const finished = (observation.result.postgame && terminalResult) || initialTerminal;
  const latestPly = orderedMoves.length;
  const phase = finished ? 'finished' : activePly < latestPly ? 'replay' : 'live';
  const history = { ...replay.history, moves: replay.history.moves.slice(0, activePly) };
  const movingColor = colorValue(state.turnColor);
  const movableColor = colorValue(state.movableColor);
  const displayedInSync = state.displayedPlacement === fen.split(' ')[0] && movingColor === sideToMove;
  const playerClockIndex = orientation === 'white' ? (playerColor === 'w' ? 1 : 0) : playerColor === 'w' ? 0 : 1;
  const playerClock = observation.clocks[playerClockIndex === 0 ? 'clock0' : 'clock1'];
  const remainingMs = parseClock(playerClock);
  const inputReady =
    phase === 'live' &&
    displayedInSync &&
    sideToMove === playerColor &&
    movableColor === playerColor &&
    !playerClock.connecting;

  const snapshot: GameSnapshot = {
    identity,
    gameId: metadata.gameId,
    board: board.element,
    fen,
    playerColor,
    sideToMove,
    orientation,
    phase,
    inputReady,
    remainingMs,
    history,
    confirmedFens: replay.fens,
  };
  return { kind: 'game', snapshot };
}
