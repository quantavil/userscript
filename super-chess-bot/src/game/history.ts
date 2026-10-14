import { signal } from '@preact/signals';
import type { Position } from 'chessops/chess';
import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { loadPosition, parseEngineUci, STANDARD_INITIAL_FEN } from '../chess/position.js';
import type { GameSnapshot } from '../sites/types.js';
import { buildPgn, type PgnMove, rootMoveNumbering } from './pgn.js';

export interface GameMoveRecord {
  ply: number;
  uci: string;
  san: string;
  turn: 'w' | 'b';
  elapsedMs: number | null;
  fen: string;
  timestamp: number;
}

export interface MovePairView {
  moveNumber: number;
  white?: GameMoveRecord;
  black?: GameMoveRecord;
}

export class GameHistoryTracker {
  private activeGameId: string | null = null;
  private startFen = STANDARD_INITIAL_FEN;
  private position: Position | null = Chess.default();
  private variant: string | undefined;
  private moves: GameMoveRecord[] = [];
  private lastWhiteClock: number | null = null;
  private lastBlackClock: number | null = null;
  private turnStartTime: number = performance.now();
  private result: string | null = null;
  /** Set once a position could not be built, so a silent stall is visible instead of a short PGN. */
  private positionFailure: string | null = null;

  reset(gameId?: string, startFen?: string, initialTime: number = performance.now(), variant?: string): void {
    this.activeGameId = gameId ?? null;
    this.startFen = startFen?.trim() || STANDARD_INITIAL_FEN;
    this.variant = variant;
    this.position = loadPosition(this.startFen, variant);
    this.positionFailure = this.position ? null : `root position "${this.startFen}" could not be built`;
    this.moves = [];
    this.lastWhiteClock = null;
    this.lastBlackClock = null;
    this.turnStartTime = initialTime;
    this.result = null;
    gameMovesSignal.value = [];
  }

  updateFromSnapshot(snapshot: GameSnapshot, now: number = performance.now()): void {
    const gameId = snapshot.gameId;
    const sameGame = gameId === this.activeGameId;
    const variant = snapshot.variant ?? (sameGame ? this.variant : undefined);
    const historyStartFen = snapshot.history?.startFen?.trim() || (sameGame ? this.startFen : STANDARD_INITIAL_FEN);

    // Reset on new game or altered root position
    if (gameId !== this.activeGameId || historyStartFen !== this.startFen || variant !== this.variant) {
      this.reset(gameId, historyStartFen, now, variant);
    }
    if (snapshot.result) {
      this.result = snapshot.result;
    }

    const currWhiteClock = snapshot.whiteRemainingMs ?? (snapshot.playerColor === 'w' ? snapshot.remainingMs : null);
    const currBlackClock = snapshot.blackRemainingMs ?? (snapshot.playerColor === 'b' ? snapshot.remainingMs : null);

    const historyMoves = snapshot.history?.moves ?? this.moves.map((move) => move.uci);
    if (this.moves.some((move, index) => historyMoves[index] !== move.uci)) {
      this.reset(gameId, historyStartFen, now, variant);
    }
    if (this.positionFailure) {
      console.warn(`Super Chess Bot: ${this.positionFailure}; move recording is paused.`);
      return;
    }
    const currentPlyCount = this.moves.length;
    const targetPlyCount = historyMoves.length;

    if (targetPlyCount > currentPlyCount) {
      const isSingleStep = targetPlyCount === currentPlyCount + 1;

      for (let i = currentPlyCount; i < targetPlyCount; i++) {
        const uci = historyMoves[i];
        if (!this.position) break;

        const turn: 'w' | 'b' = this.position.turn === 'white' ? 'w' : 'b';
        let san: string;
        // `parseEngineUci` accepts castling in either the king-destination or king-to-rook form
        // and returns null when the move is illegal, which is how a replay stops here.
        const move = parseEngineUci(this.position, uci);
        if (!move) break;
        try {
          san = makeSan(this.position, move);
          this.position.play(move);
        } catch {
          break;
        }
        const fen = makeFen(this.position.toSetup());

        let elapsedMs: number | null = null;

        if (isSingleStep && i === currentPlyCount) {
          const prevClock = turn === 'w' ? this.lastWhiteClock : this.lastBlackClock;
          const currClock = turn === 'w' ? currWhiteClock : currBlackClock;

          const increment =
            typeof snapshot.incrementMs === 'number' &&
            Number.isFinite(snapshot.incrementMs) &&
            snapshot.incrementMs >= 0
              ? snapshot.incrementMs
              : 0;
          const hasClock = prevClock != null && currClock != null;
          const delta =
            hasClock && (prevClock >= currClock || increment > 0) ? prevClock - currClock + increment : null;
          elapsedMs =
            delta != null && delta >= 0 && delta < 3600000 ? delta : Math.max(0, Math.round(now - this.turnStartTime));
        }

        const record: GameMoveRecord = {
          ply: i + 1,
          uci,
          san,
          turn,
          elapsedMs,
          fen,
          timestamp: Date.now(),
        };
        this.moves.push(record);
        this.turnStartTime = now;
      }

      gameMovesSignal.value = [...this.moves];
    }

    // Freeze the first observed clocks for this turn; ticking snapshots must not
    // replace its baseline. A confirmed move starts the next turn's baseline.
    if (this.moves.length > currentPlyCount) {
      this.lastWhiteClock = currWhiteClock;
      this.lastBlackClock = currBlackClock;
    } else {
      if (this.lastWhiteClock == null) this.lastWhiteClock = currWhiteClock;
      if (this.lastBlackClock == null) this.lastBlackClock = currBlackClock;
    }
  }

  getMoves(): readonly GameMoveRecord[] {
    return this.moves;
  }

  getStartFen(): string {
    return this.startFen;
  }

  getGameId(): string | null {
    return this.activeGameId;
  }

  getResult(): string | null {
    return this.result;
  }

  getMovePairs(): readonly MovePairView[] {
    const pairs: MovePairView[] = [];
    const { fullmove: rootFullmove, offset: rootOffset } = rootMoveNumbering(this.startFen);
    for (const move of this.moves) {
      const moveNumber = rootFullmove + Math.floor((move.ply - 1 + rootOffset) / 2);
      let pair = pairs.find((p) => p.moveNumber === moveNumber);
      if (!pair) {
        pair = { moveNumber };
        pairs.push(pair);
      }
      if (move.turn === 'w') {
        pair.white = move;
      } else {
        pair.black = move;
      }
    }
    return pairs;
  }

  exportPgn(siteName?: string, result?: string): string {
    const pgnMoves: PgnMove[] = this.moves.map((m) => ({
      ply: m.ply,
      san: m.san,
      elapsedMs: m.elapsedMs,
    }));
    return buildPgn(pgnMoves, {
      site: siteName,
      startFen: this.startFen,
      result: result ?? this.result ?? '*',
      ...(this.variant && this.variant !== 'standard' ? { variant: this.variant } : {}),
    });
  }
}

export const gameHistoryTracker = new GameHistoryTracker();
export const gameMovesSignal = signal<readonly GameMoveRecord[]>([]);
