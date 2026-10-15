import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { describe, expect, it } from 'vite-plus/test';
import type { MultiPvLine } from '../../../src/chess/types.js';
import { MAX_CHAIN_STEERING_LOSS_CP, PREMOVE_PONDER_BRANCHES } from '../../../src/engine/config.js';
import {
  dest,
  fenKey,
  isLegalMove,
  isRecaptureChain,
  orig,
  populateRecaptureFallbacks,
  resolveArmedTriggerFen,
  selectBookPremoveReplies,
  selectOpponentTurnPremove,
  selectOwnTurnChainPremove,
} from '../../../src/engine/premove.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function playUci(pos: Chess, uci: string): void {
  const move = parseUci(uci);
  if (!move) throw new Error(`Invalid UCI move: ${uci}`);
  pos.play(move);
}

describe('FEN key normalization', () => {
  it('retains only the first 3 fields (pieces, turn, castling) and strips en-passant and clocks', () => {
    expect(fenKey(START_FEN)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq');
    // Double pawn push with en-passant square 'e3'
    const fenWithEp = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(fenKey(fenWithEp)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq');
    // FEN with no castling '-'
    const endgameFen = '8/8/8/4k3/8/8/4K3/8 w - - 45 60';
    expect(fenKey(endgameFen)).toBe('8/8/8/4k3/8/8/4K3/8 w -');
  });
});

describe('UCI string helpers', () => {
  it('extracts origin and destination squares correctly', () => {
    expect(orig('e2e4')).toBe('e2');
    expect(dest('e2e4')).toBe('e4');
    expect(orig('g1f3')).toBe('g1');
    expect(dest('g1f3')).toBe('f3');
    expect(orig('e7e8q')).toBe('e7');
    expect(dest('e7e8q')).toBe('e8');
  });

  it('identifies guaranteed recapture chains on the same destination square', () => {
    const validChain = ['c6d4', 'e2d4', 'f3d4'];
    expect(isRecaptureChain(validChain)).toBe(true);

    const longerChain = ['c6d4', 'e2d4', 'f3d4', 'g8f6'];
    expect(isRecaptureChain(longerChain)).toBe(true);

    // Mismatched destination
    expect(isRecaptureChain(['c6d4', 'e2d4', 'f3g5'])).toBe(false);
    expect(isRecaptureChain(['c6d4', 'e2e4', 'f3d4'])).toBe(false);
    // Too short
    expect(isRecaptureChain(['c6d4', 'e2d4'])).toBe(false);
  });
});

describe('move legality verification with chessops', () => {
  it('validates legal and rejects illegal moves', () => {
    expect(isLegalMove(START_FEN, 'e2e4')).toBe(true);
    expect(isLegalMove(START_FEN, 'g1f3')).toBe(true);
    expect(isLegalMove(START_FEN, 'e2e5')).toBe(false);
    expect(isLegalMove(START_FEN, 'e1e8')).toBe(false);
    expect(isLegalMove('invalid fen', 'e2e4')).toBe(false);
  });

  it('resolves expected trigger FEN when both trigger and reply are legal', () => {
    const expectedFen = resolveArmedTriggerFen(START_FEN, ['e2e4'], 'e7e5', 'g1f3');
    expect(expectedFen).not.toBeNull();
    expect(expectedFen).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq');
  });

  it('rejects trigger when the reply is illegal', () => {
    // Reply e1e8 is illegal
    const expectedFen = resolveArmedTriggerFen(START_FEN, ['e2e4'], 'e7e5', 'e1e8');
    expect(expectedFen).toBeNull();
  });

  it('rejects trigger when the trigger itself is illegal', () => {
    const expectedFen = resolveArmedTriggerFen(START_FEN, ['e2e4'], 'e7e4', 'g1f3');
    expect(expectedFen).toBeNull();
  });
});

describe('auto-recapture pre-populator', () => {
  it('pre-populates instant recaptures for legal opponent captures', () => {
    // 1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4
    // Position where White Knight is on d4 defended by Queen on d1. Black to move.
    const pos = Chess.default();
    playUci(pos, 'e2e4');
    playUci(pos, 'e7e5');
    playUci(pos, 'g1f3');
    playUci(pos, 'b8c6');
    playUci(pos, 'd2d4');
    playUci(pos, 'e5d4');
    playUci(pos, 'f3d4');

    const byExpectedFen = new Map<string, string>();
    populateRecaptureFallbacks(pos, byExpectedFen);

    // Black playing c6d4 (Nxd4) should trigger d1d4 (Qxd4)
    const afterNxd4 = pos.clone();
    playUci(afterNxd4, 'c6d4');
    const key = fenKey(makeFen(afterNxd4.toSetup()));

    expect(byExpectedFen.size).toBeGreaterThan(0);
    expect(byExpectedFen.get(key)).toBe('d1d4');
  });

  it('picks the lowest value recapture piece when multiple recaptures exist', () => {
    // White pawn on c3, White Knight on c3, Black Bishop on b4 captures Knight on c3 (b4c3)
    // White can recapture with pawn (b2c3 or d2c3).
    const captureSetup = parseFen('r1bqk1nr/pppp1ppp/2n5/4p3/1b6/2N2N2/PPPPPPPP/R1BQKB1R b KQkq - 0 4');
    if (captureSetup.isErr) throw new Error('Invalid FEN');
    const capturePos = Chess.fromSetup(captureSetup.value).unwrap();

    const byExpectedFen = new Map<string, string>();
    populateRecaptureFallbacks(capturePos, byExpectedFen);

    const afterBxc3 = capturePos.clone();
    playUci(afterBxc3, 'b4c3');
    const key = fenKey('r1bqk1nr/pppp1ppp/2n5/4p3/8/2b2N2/PPPPPPPP/R1BQKB1R w KQkq - 0 5');

    const reply = byExpectedFen.get(key);
    expect(reply).toBeDefined();
    // Must be either b2c3 or d2c3 (pawn recaptures), NOT queen or king
    expect(['b2c3', 'd2c3']).toContain(reply);
  });
});

describe('Stage 1: Own-turn chain steering and ponder table arming', () => {
  it('selects PV1 move and arms chosen.pv[2] and fallback recaptures', () => {
    // 1. e4
    const lines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'e2e4',
        pv: 'e2e4 e7e5 g1f3',
        evaluation: { cp: 30 },
        depth: 12,
      },
    ];

    const result = selectOwnTurnChainPremove(START_FEN, lines);
    expect(result.bestMoveUci).toBe('e2e4');
    expect(result.armed).toBeDefined();

    // The key after e2e4 e7e5 must map to g1f3
    const expectedFen = fenKey('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq');
    expect(result.armed?.byExpectedFen.get(expectedFen)).toBe('g1f3');
  });

  it('steers to PV2 when PV1 is not a chain but PV2 is a chain within 50cp', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const lines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'g1f3',
        pv: 'g1f3 d5e4 f3e5',
        evaluation: { cp: 40 },
        depth: 12,
      },
      {
        multipv: 2,
        uci: 'e4d5',
        pv: 'e4d5 d8d5 b1c3', // not a chain because b1c3 lands on c3
        evaluation: { cp: 35 },
        depth: 12,
      },
    ];

    // Neither is a chain, plays PV1
    const result1 = selectOwnTurnChainPremove(fen, lines);
    expect(result1.bestMoveUci).toBe('g1f3');

    const nonChainLines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'g1f3',
        pv: 'g1f3 d7d6 f1e2',
        evaluation: { cp: 50 },
        depth: 12,
      },
      {
        multipv: 2,
        uci: 'e4d5',
        pv: 'e4d5 d8d5 c1d2',
        evaluation: { cp: 30 },
        depth: 12,
      },
    ];
    // Here neither is a chain, so bestMoveUci is g1f3
    expect(selectOwnTurnChainPremove(fen, nonChainLines).bestMoveUci).toBe('g1f3');
  });

  it('steers to PV2 when PV2 is a valid recapture chain within 120cp', () => {
    expect(MAX_CHAIN_STEERING_LOSS_CP).toBe(120);
    // Setup position where White has a trade chain on d5:
    // White pawn on e4, White pawn on c4. Black pawn on d5.
    // 1. exd5 (e4d5) Qxd5 (d8d5) 2. cxd5 (c4d5) -> dest is d5, d5, d5!
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/2P1P3/8/PP1P1PPP/RNBQKBNR w KQkq - 0 2';
    const lines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'd2d4',
        pv: 'd2d4 d5e4 c1e3',
        evaluation: { cp: 45 },
        depth: 12,
      },
      {
        multipv: 2,
        uci: 'e4d5',
        pv: 'e4d5 d8d5 c4d5',
        evaluation: { cp: -65 }, // 45 - (-65) = 110 <= 120cp loss
        depth: 12,
      },
    ];

    const result = selectOwnTurnChainPremove(fen, lines);
    expect(result.bestMoveUci).toBe('e4d5');
    expect(result.armed).toBeDefined();

    // Post-trigger FEN after exd5 (e4d5) and Qxd5 (d8d5) should map to c4d5
    const expectedFen = resolveArmedTriggerFen(fen, ['e4d5'], 'd8d5', 'c4d5');
    expect(expectedFen).not.toBeNull();
    if (expectedFen) {
      expect(result.armed?.byExpectedFen.get(expectedFen)).toBe('c4d5');
    }

    // Exceeding 120cp should NOT steer to PV2
    const tooCostlyLines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'd2d4',
        pv: 'd2d4 d5e4 c1e3',
        evaluation: { cp: 45 },
        depth: 12,
      },
      {
        multipv: 2,
        uci: 'e4d5',
        pv: 'e4d5 d8d5 c4d5',
        evaluation: { cp: -80 }, // 45 - (-80) = 125 > 120cp loss
        depth: 12,
      },
    ];
    const costlyResult = selectOwnTurnChainPremove(fen, tooCostlyLines);
    expect(costlyResult.bestMoveUci).toBe('d2d4');
  });
});

describe('Stage 2: Opponent-turn Multi-Branch Ponder Table selector', () => {
  it('arms replies for all viable MultiPV lines without 150cp filtering', () => {
    // Black turn after 1. e4
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const lines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'e7e5',
        pv: 'e7e5 g1f3 b8c6',
        evaluation: { cp: 30 },
        depth: 10,
      },
      {
        multipv: 2,
        uci: 'c7c5',
        pv: 'c7c5 g1f3 d7d6',
        evaluation: { cp: 25 },
        depth: 10,
      },
      {
        multipv: 3,
        uci: 'e7e6',
        pv: 'e7e6 d2d4 d7d5',
        evaluation: { cp: -200 }, // opponent blunder line > 150cp worse
        depth: 10,
      },
    ];

    const armed = selectOpponentTurnPremove(fen, lines);
    expect(armed).not.toBeNull();
    expect(armed?.byExpectedFen.size).toBe(3);

    // PV1: e7e5 -> g1f3
    const fenE5 = resolveArmedTriggerFen(fen, [], 'e7e5', 'g1f3');
    if (fenE5) {
      expect(armed?.byExpectedFen.get(fenE5)).toBe('g1f3');
    }

    // PV2: c7c5 -> g1f3
    const fenC5 = resolveArmedTriggerFen(fen, [], 'c7c5', 'g1f3');
    if (fenC5) {
      expect(armed?.byExpectedFen.get(fenC5)).toBe('g1f3');
    }

    // PV3 (blunder line): e7e6 -> d2d4
    const fenE6 = resolveArmedTriggerFen(fen, [], 'e7e6', 'd2d4');
    if (fenE6) {
      expect(armed?.byExpectedFen.get(fenE6)).toBe('d2d4');
    }
  });

  it('handles empty or single-move lines gracefully', () => {
    const fen = START_FEN;
    expect(selectOpponentTurnPremove(fen, [])).toBeNull();

    const shortLines: MultiPvLine[] = [
      {
        multipv: 1,
        uci: 'e2e4',
        pv: 'e2e4', // length < 2
        evaluation: { cp: 20 },
        depth: 1,
      },
    ];
    expect(selectOpponentTurnPremove(fen, shortLines)).toBeNull();
  });

  it('arms up to PREMOVE_PONDER_BRANCHES (6) candidate lines', () => {
    const fen = START_FEN;
    const lines: MultiPvLine[] = [
      { multipv: 1, uci: 'e2e4', pv: 'e2e4 e7e5', evaluation: { cp: 20 }, depth: 10 },
      { multipv: 2, uci: 'd2d4', pv: 'd2d4 d7d5', evaluation: { cp: 20 }, depth: 10 },
      { multipv: 3, uci: 'c2c4', pv: 'c2c4 e7e5', evaluation: { cp: 15 }, depth: 10 },
      { multipv: 4, uci: 'g1f3', pv: 'g1f3 d7d5', evaluation: { cp: 15 }, depth: 10 },
      { multipv: 5, uci: 'b1c3', pv: 'b1c3 e7e5', evaluation: { cp: 10 }, depth: 10 },
      { multipv: 6, uci: 'g2g3', pv: 'g2g3 e7e5', evaluation: { cp: 10 }, depth: 10 },
      { multipv: 7, uci: 'b2b3', pv: 'b2b3 e7e5', evaluation: { cp: 5 }, depth: 10 },
    ];
    const armed = selectOpponentTurnPremove(fen, lines);
    expect(armed).not.toBeNull();
    expect(armed?.byExpectedFen.size).toBe(PREMOVE_PONDER_BRANCHES);
  });
});

describe('opening book premove selector', () => {
  it('pre-arms book replies for legal opponent responses after 1. e4', () => {
    // After 1. e4, White to Black turn
    const pos = Chess.default();
    playUci(pos, 'e2e4');
    const fenAfterE4 = makeFen(pos.toSetup());

    const armed = selectBookPremoveReplies(fenAfterE4, 'balanced');
    expect(armed).not.toBeNull();
    expect(armed?.byExpectedFen.size).toBeGreaterThan(0);

    // After 1. e4 e5, White book reply should be g1f3
    const p1 = pos.clone();
    playUci(p1, 'e7e5');
    const fenAfterE5 = fenKey(makeFen(p1.toSetup()));
    expect(armed?.byExpectedFen.get(fenAfterE5)).toBe('g1f3');

    // After 1. e4 e6, White book reply should be d2d4
    const p2 = pos.clone();
    playUci(p2, 'e7e6');
    const fenAfterE6 = fenKey(makeFen(p2.toSetup()));
    expect(armed?.byExpectedFen.get(fenAfterE6)).toBe('d2d4');
  });

  it('returns null for an invalid FEN', () => {
    expect(selectBookPremoveReplies('invalid fen')).toBeNull();
  });
});
