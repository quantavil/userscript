import type { PositionHistory } from '../chess/position.js';

export type Color = 'w' | 'b';

export interface GameSnapshot {
  identity: object;
  gameId: string;
  board: HTMLElement;
  fen: string;
  playerColor: Color;
  sideToMove: Color;
  orientation: 'white' | 'black';
  phase: 'live' | 'replay' | 'finished';
  inputReady: boolean;
  remainingMs: number | null;
  /** Known Fischer increment per move; absent means elapsed timing uses wall time. */
  incrementMs?: number | null;
  whiteRemainingMs?: number | null;
  blackRemainingMs?: number | null;
  history?: PositionHistory;
  /** Observed FENs indexed by ply, root at zero; authority is explicit below. */
  confirmationSource?: 'controller-local' | 'site-accepted';
  confirmedFens?: readonly string[];
  variant?: string;
  result?: string | null;
  boardDimensions?: { width: number; height: number };
}

export type SiteRead = { kind: 'game'; snapshot: GameSnapshot } | { kind: 'waiting' | 'ineligible'; reason: string };

export interface MoveRequest {
  identity: object;
  fromFen: string;
  uci: string;
  expectedFen: string;
  expectedPly: number | null;
  variant?: string;
  signal: AbortSignal;
  isCurrent: () => boolean;
  /** Called immediately before a transport API may produce side effects. */
  onDispatch?: () => void;
}

export interface SiteAdapter {
  readonly id: 'chesscom' | 'lichess';
  read(): SiteRead;
  subscribe(listener: () => void): () => void;
  /** Resolves when the adapter transport finishes; legacy transports may also await confirmation. */
  submitMove(request: MoveRequest): Promise<boolean>;
  cancelInput(): void;
}

export function pageWindow(): Window {
  return typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
}

export function pageDocument(): Document {
  return typeof unsafeWindow === 'undefined' ? document : unsafeWindow.document;
}

export function mutationElement(target: Node): Element | null {
  return target.nodeType === 1
    ? (target as Element)
    : ((target as Node & { parentElement?: Element | null }).parentElement ?? null);
}
