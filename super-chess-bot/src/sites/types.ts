import type { PositionHistory } from '../history.js';

export type Color = 'w' | 'b';
export interface SiteCapabilities {
  readonly input: 'selection' | 'controller';
}

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
  history?: PositionHistory;
  /** Canonical accepted FENs indexed by ply, with the root at index zero. */
  confirmedFens?: readonly string[];
}

export type SiteRead = { kind: 'game'; snapshot: GameSnapshot } | { kind: 'waiting' | 'ineligible'; reason: string };

export interface MoveRequest {
  identity: object;
  fromFen: string;
  uci: string;
  expectedFen: string;
  expectedPly: number | null;
  signal: AbortSignal;
  isCurrent: () => boolean;
}

export interface SiteAdapter {
  readonly id: 'chesscom' | 'pychess' | 'lichess';
  readonly capabilities: SiteCapabilities;
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
