import { describe, expect, it } from 'vite-plus/test';
import type { MultiPvLine } from '../../../src/chess/types.js';
import { discoverMadmanMoves, selectMadmanMove } from '../../../src/engine/madman.js';

const ATTACK = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w - - 4 5';
const line = (uci: string, cp: number, depth = 12): MultiPvLine => ({
  uci,
  pv: uci,
  evaluation: { cp },
  depth,
  multipv: 1,
});

describe('maximum aggression selection', () => {
  it('rewards a quiet setup whose searched continuation sustains pressure over a one-move bluff', () => {
    const setup = { ...line('d2d3', 0), pv: 'd2d3 d7d6 f3g5' };
    const bluff = { ...line('f3g5', 0), pv: 'f3g5 d7d6 g5f3' };
    expect(selectMadmanMove(ATTACK, [bluff, setup])?.chosenLine.uci).toBe('d2d3');
  });
  it('accepts orthodox and Chess960 castling without treating a king move as an offered piece', () => {
    const fen = '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1';
    expect(selectMadmanMove(fen, [line('e1g1', 20)])?.chosenLine.uci).toBe('e1g1');
    expect(selectMadmanMove(fen, [line('e1h1', 20)], { variant: 'chess960' })?.captureMoves).toEqual([]);
  });

  it('discovers all four legal promotion choices rather than assuming queen-only moves', () => {
    const fen = '6k1/P7/8/8/8/8/8/6K1 w - - 0 1';
    const moves = discoverMadmanMoves(fen, ['g1f1', 'g1h1', 'g1f2', 'g1g2', 'g1h2']);
    expect(new Set(moves)).toEqual(new Set(['a7a8q', 'a7a8r', 'a7a8b', 'a7a8n']));
  });
  it('does not promote an optimistic shallow line into the baseline', () => {
    const result = selectMadmanMove(ATTACK, [line('h2h3', 20), line('f3g5', 200, 4)]);
    expect(result?.chosenLine.uci).toBe('h2h3');
  });
  it('selects an attacking move from a complete fast premove comparison at depth four', () => {
    expect(
      selectMadmanMove(ATTACK, [line('h2h3', 20, 4), line('f3g5', -100, 4)], { minimumDepth: 4 })?.chosenLine.uci,
    ).toBe('f3g5');
    expect(
      selectMadmanMove(ATTACK, [line('h2h3', 20, 3), line('f3g5', -100, 3)], { minimumDepth: 4 })?.chosenLine.uci,
    ).toBe('h2h3');
  });
  it('prefers knight pressure over a quiet move within 120 cp and keeps engine scores intact', () => {
    const result = selectMadmanMove(ATTACK, [line('h2h3', 20), line('f3g5', -100)]);
    expect(result?.chosenLine.uci).toBe('f3g5');
    expect(result?.chosenLine.evaluation.cp).toBe(-100);
    expect(result?.cpLoss).toBe(120);
    expect(result?.lines[0].uci).toBe('f3g5');
  });

  it('rejects a 121 cp concession while allowing repeated 120 cp attacking choices', () => {
    expect(selectMadmanMove(ATTACK, [line('h2h3', 20), line('f3g5', -101)])?.chosenLine.uci).toBe('h2h3');
    for (const turn of [5, 6, 7, 8]) {
      expect(
        selectMadmanMove(ATTACK.replace('4 5', `4 ${turn}`), [line('h2h3', 20), line('f3g5', -100)])?.chosenLine.uci,
      ).toBe('f3g5');
    }
  });

  it('keeps attacking alternatives available when already behind', () => {
    expect(selectMadmanMove(ATTACK, [line('h2h3', -180), line('f3g5', -280)])?.chosenLine.uci).toBe('f3g5');
  });

  it('preserves the fastest positive mate and never selects an avoidable negative mate', () => {
    const mate = { ...line('h2h3', 0), evaluation: { mate: 3 } };
    const losing = { ...line('f3g5', 0), evaluation: { mate: -2 } };
    expect(selectMadmanMove(ATTACK, [mate, line('f3g5', 900)])?.chosenLine.uci).toBe('h2h3');
    expect(selectMadmanMove(ATTACK, [line('h2h3', -900), losing])?.chosenLine.uci).toBe('h2h3');
    expect(selectMadmanMove(ATTACK, [losing])?.chosenLine.uci).toBe('f3g5');
  });

  it('fails closed on unknown scores, illegal moves and shallow or mixed-depth alternatives', () => {
    const unknown = { ...line('f3g5', 0), evaluation: {} };
    expect(selectMadmanMove(ATTACK, [line('h2h3', 20), unknown])?.chosenLine.uci).toBe('h2h3');
    expect(selectMadmanMove(ATTACK, [line('h2h3', 20), line('f3f7', 100)])?.chosenLine.uci).toBe('h2h3');
    expect(selectMadmanMove(ATTACK, [line('h2h3', 20), line('f3g5', 0, 4)])?.chosenLine.uci).toBe('h2h3');
    expect(selectMadmanMove('bad fen', [line('h2h3', 0)])).toBeNull();
    expect(selectMadmanMove(ATTACK, [])).toBeNull();
  });

  it('computes aggression for Black rather than assuming White pawn direction', () => {
    const black = 'rnbq1rk1/pppp1ppp/5n2/2b1p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5';
    expect(selectMadmanMove(black, [line('h7h6', 20), line('f6g4', 0)])?.chosenLine.uci).toBe('f6g4');
  });

  it('discovers legal attacking alternatives beyond supplied engine lines', () => {
    const moves = discoverMadmanMoves(ATTACK, ['h2h3']);
    expect(moves).toContain('f3g5');
    expect(moves).not.toContain('h2h3');
    expect(moves.length).toBeLessThanOrEqual(4);
    expect(discoverMadmanMoves('bad fen', [])).toEqual([]);
  });

  it('enumerates only legal captures of an offered piece, without declaring it poisoned', () => {
    const fen = '6k1/5ppp/8/8/8/8/3Q1PPP/6K1 w - - 0 1';
    const result = selectMadmanMove(fen, [line('d2d3', 0)]);
    expect(result?.captureMoves).toEqual([]);
    const offered = selectMadmanMove(fen, [line('d2h6', 0)]);
    expect(offered?.captureMoves).toContain('g7h6');
  });
});
