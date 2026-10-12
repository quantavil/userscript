import { signal } from '@preact/signals';
import type { Position } from 'chessops/chess';
import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseUci } from 'chessops/util';
import { setupPosition } from 'chessops/variant';
import { parseRules } from './history.js';
import { buildPgn, type PgnMove } from './pgn.js';
import type { GameSnapshot } from './sites/types.js';

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

const STANDARD_INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class GameHistoryTracker {
  private activeGameId: string | null = null;
  private startFen = STANDARD_INITIAL_FEN;
  private position: Position = Chess.default();
  private moves: GameMoveRecord[] = [];
  private lastWhiteClock: number | null = null;
  private lastBlackClock: number | null = null;
  private turnStartTime: number = performance.now();

  reset(gameId?: string, startFen?: string, initialTime: number = performance.now(), variant?: string): void {
    this.activeGameId = gameId ?? null;
    this.startFen = startFen?.trim() || STANDARD_INITIAL_FEN;
    try {
      const setup = parseFen(this.startFen);
      if (setup.isOk) {
        const rules = parseRules(variant);
        const chessRes = rules ? setupPosition(rules, setup.value) : Chess.fromSetup(setup.value);
        if (chessRes.isOk) {
          this.position = chessRes.value;
        } else {
          this.position = Chess.default();
        }
      } else {
        this.position = Chess.default();
      }
    } catch {
      this.position = Chess.default();
    }
    this.moves = [];
    this.lastWhiteClock = null;
    this.lastBlackClock = null;
    this.turnStartTime = initialTime;
    gameMovesSignal.value = [];
  }

  updateFromSnapshot(snapshot: GameSnapshot, now: number = performance.now()): void {
    const gameId = snapshot.gameId;
    const historyStartFen = snapshot.history?.startFen?.trim() || STANDARD_INITIAL_FEN;

    // Reset on new game or altered root position
    if (gameId !== this.activeGameId || historyStartFen !== this.startFen) {
      this.reset(gameId, historyStartFen, now, snapshot.variant);
    }

    const currWhiteClock = snapshot.whiteRemainingMs ?? (snapshot.playerColor === 'w' ? snapshot.remainingMs : null);
    const currBlackClock = snapshot.blackRemainingMs ?? (snapshot.playerColor === 'b' ? snapshot.remainingMs : null);

    const historyMoves = snapshot.history?.moves ?? [];
    const currentPlyCount = this.moves.length;
    const targetPlyCount = historyMoves.length;

    if (targetPlyCount > currentPlyCount) {
      const isSingleStep = targetPlyCount === currentPlyCount + 1;

      for (let i = currentPlyCount; i < targetPlyCount; i++) {
        const uci = historyMoves[i];
        const move = parseUci(uci);
        if (!move) break;

        const turn: 'w' | 'b' = this.position.turn === 'white' ? 'w' : 'b';
        let san = uci;
        try {
          if (this.position.isLegal(move)) {
            san = makeSan(this.position, move);
            this.position.play(move);
          }
        } catch {
          // Graceful fallback to raw UCI if position/move cannot be replayed
        }
        const fen = makeFen(this.position.toSetup());

        let elapsedMs: number | null = null;

        if (isSingleStep && i === currentPlyCount) {
          const prevClock = turn === 'w' ? this.lastWhiteClock : this.lastBlackClock;
          const currClock = turn === 'w' ? currWhiteClock : currBlackClock;

          if (prevClock != null && currClock != null && prevClock > currClock) {
            const delta = prevClock - currClock;
            if (delta > 0 && delta < 3600000) {
              elapsedMs = delta;
            } else {
              elapsedMs = Math.max(100, Math.round(now - this.turnStartTime));
            }
          } else {
            elapsedMs = Math.max(100, Math.round(now - this.turnStartTime));
          }
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

    if (currWhiteClock != null) this.lastWhiteClock = currWhiteClock;
    if (currBlackClock != null) this.lastBlackClock = currBlackClock;
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

  getMovePairs(): readonly MovePairView[] {
    const pairs: MovePairView[] = [];
    for (const move of this.moves) {
      const moveNumber = Math.floor((move.ply - 1) / 2) + 1;
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
      result: result ?? '*',
    });
  }
}

export const gameHistoryTracker = new GameHistoryTracker();
export const gameMovesSignal = signal<readonly GameMoveRecord[]>([]);
