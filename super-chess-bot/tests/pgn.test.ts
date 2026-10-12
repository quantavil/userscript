import { parseComment, parsePgn } from 'chessops/pgn';
import { describe, expect, it } from 'vitest';
import { buildPgn, formatEmt, type PgnMove } from '../src/pgn.js';

describe('formatEmt', () => {
  it('formats sub-second move times', () => {
    expect(formatEmt(800)).toBe('0:00:00.8');
    expect(formatEmt(250)).toBe('0:00:00.3');
  });

  it('formats typical move times in seconds with tenths', () => {
    expect(formatEmt(1200)).toBe('0:00:01.2');
    expect(formatEmt(14500)).toBe('0:00:14.5');
  });

  it('formats exact whole seconds cleanly', () => {
    expect(formatEmt(5000)).toBe('0:00:05');
    expect(formatEmt(20000)).toBe('0:00:20');
  });

  it('formats times over a minute', () => {
    expect(formatEmt(65400)).toBe('0:01:05.4');
    expect(formatEmt(125000)).toBe('0:02:05');
  });

  it('handles zero and non-positive elapsed times safely', () => {
    expect(formatEmt(0)).toBe('0:00:00');
    expect(formatEmt(-500)).toBe('0:00:00');
  });

  it('parses correctly with chessops parseComment', () => {
    const emt = formatEmt(1200);
    const parsed = parseComment(`[%emt ${emt}]`);
    expect(parsed.emt).toBe(1.2);
  });
});

describe('buildPgn', () => {
  it('generates a valid PGN with standard headers and terminal warning', () => {
    const moves: PgnMove[] = [
      { ply: 1, san: 'e4', elapsedMs: 1200 },
      { ply: 2, san: 'e5', elapsedMs: 800 },
      { ply: 3, san: 'Nf3', elapsedMs: 2100 },
      { ply: 4, san: 'Nc6', elapsedMs: 1000 },
    ];

    const pgn = buildPgn(moves, {
      site: 'Chess.com',
      date: '2026.10.12',
      white: 'HeroBot',
      black: 'Opponent',
      result: '*',
    });

    expect(pgn).toContain('[Event "Live Chess"]');
    expect(pgn).toContain('[Site "Chess.com"]');
    expect(pgn).toContain('[Date "2026.10.12"]');
    expect(pgn).toContain('[White "HeroBot"]');
    expect(pgn).toContain('[Black "Opponent"]');
    expect(pgn).toContain('[Result "*"]');
    expect(pgn).toContain('1. e4 { [%emt 0:00:01.2] } 1... e5 { [%emt 0:00:00.8] }');
    expect(pgn).toContain('2. Nf3 { [%emt 0:00:02.1] } 2... Nc6 { [%emt 0:00:01] }');
    expect(pgn).toContain('{ Warning: Move timings and evaluations are client-side browser telemetry estimates. } *');

    // Verify it is 100% compliant with chessops PGN parser
    const parsedGames = parsePgn(pgn);
    expect(parsedGames.length).toBe(1);
    expect(parsedGames[0]?.headers.get('White')).toBe('HeroBot');
    expect(parsedGames[0]?.headers.get('Black')).toBe('Opponent');
  });

  it('handles moves without elapsed times gracefully', () => {
    const moves: PgnMove[] = [
      { ply: 1, san: 'd4' },
      { ply: 2, san: 'd5', elapsedMs: null },
      { ply: 3, san: 'c4', elapsedMs: 1500 },
    ];

    const pgn = buildPgn(moves);
    expect(pgn).toContain('1. d4 1... d5 2. c4 { [%emt 0:00:01.5] }');

    const parsedGames = parsePgn(pgn);
    expect(parsedGames.length).toBe(1);
  });

  it('includes SetUp and FEN headers for non-standard start positions', () => {
    const customFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const moves: PgnMove[] = [
      { ply: 5, san: 'Bb5', elapsedMs: 1100 },
      { ply: 6, san: 'a6', elapsedMs: 900 },
    ];

    const pgn = buildPgn(moves, { startFen: customFen });
    expect(pgn).toContain('[SetUp "1"]');
    expect(pgn).toContain(`[FEN "${customFen}"]`);

    const parsedGames = parsePgn(pgn);
    expect(parsedGames.length).toBe(1);
    expect(parsedGames[0]?.headers.get('SetUp')).toBe('1');
    expect(parsedGames[0]?.headers.get('FEN')).toBe(customFen);
  });

  it('formats custom game results like 1-0 or 0-1', () => {
    const moves: PgnMove[] = [
      { ply: 1, san: 'e4', elapsedMs: 500 },
      { ply: 2, san: 'e5', elapsedMs: 500 },
    ];

    const pgn = buildPgn(moves, { result: '1-0' });
    expect(pgn).toContain('[Result "1-0"]');
    expect(
      pgn.trim().endsWith('{ Warning: Move timings and evaluations are client-side browser telemetry estimates. } 1-0'),
    ).toBe(true);

    const parsedGames = parsePgn(pgn);
    expect(parsedGames.length).toBe(1);
    expect(parsedGames[0]?.headers.get('Result')).toBe('1-0');
  });
});
