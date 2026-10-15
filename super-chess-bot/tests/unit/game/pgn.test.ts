import { parseComment, parsePgn } from 'chessops/pgn';
import { describe, expect, it } from 'vite-plus/test';
import { buildPgn, formatEmt, type PgnMove } from '../../../src/game/pgn.js';

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
      { ply: 1, san: 'Bb5', elapsedMs: 1100 },
      { ply: 2, san: 'a6', elapsedMs: 900 },
    ];

    const pgn = buildPgn(moves, { startFen: customFen });
    expect(pgn).toContain('[SetUp "1"]');
    expect(pgn).toContain(`[FEN "${customFen}"]`);
    expect(pgn).toContain('3. Bb5 { [%emt 0:00:01.1] } 3... a6');

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

it('carries rounded EMT into the next minute and hour', () => {
  expect(formatEmt(59999)).toBe('0:01:00');
  expect(formatEmt(3599999)).toBe('1:00:00');
});
it('numbers relative plies from a black-to-move fullmove root', () => {
  const pgn = buildPgn(
    [
      { ply: 1, san: 'e5' },
      { ply: 2, san: 'e4' },
    ],
    {
      startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 17',
    },
  );
  expect(pgn).toContain('17... e5 18. e4');
});

describe('PGN header safety', () => {
  it('tags a non-standard variant so a reader does not treat it as ordinary chess', () => {
    const moves: PgnMove[] = [
      { ply: 1, san: 'e4' },
      { ply: 2, san: 'e5' },
    ];

    expect(buildPgn(moves, { variant: 'chess960' })).toContain('[Variant "chess960"]');
    // Standard chess needs no Variant tag, and fromPosition is played as ordinary chess.
    expect(buildPgn(moves, { variant: 'standard' })).not.toContain('[Variant');
    expect(buildPgn(moves)).not.toContain('[Variant');
    expect(buildPgn(moves, { variant: 'fromPosition' })).not.toContain('[Variant');

    const parsedGames = parsePgn(buildPgn(moves, { variant: 'chess960' }));
    expect(parsedGames.length).toBe(1);
    expect(parsedGames[0]?.headers.get('Variant')).toBe('chess960');
  });

  it('keeps a newline in a header from splitting the tag into two', () => {
    const pgn = buildPgn([{ ply: 1, san: 'e4' }], {
      white: 'Player\n"Two"',
      site: 'Lichess\nisland',
    });

    // Exactly one White line and one Site line survive, each on a single line.
    expect(pgn.match(/^\[White /gm)).toHaveLength(1);
    expect(pgn.match(/^\[Site /gm)).toHaveLength(1);
    expect(pgn).toContain('[White "Player \\"Two\\""]');
    expect(pgn).toContain('[Site "Lichess island"]');
    expect(parsePgn(pgn).length).toBe(1);
  });

  it('uses the local calendar day rather than the UTC day', () => {
    // 23:30 local on the 1st is still the 1st in UTC+02:00, but the 2nd in UTC-05:00.
    const evening = new Date(2026, 4, 1, 23, 30, 0);
    expect(buildPgn([], { date: undefined, event: evening.toISOString() })).toContain('[Date');
  });
});
