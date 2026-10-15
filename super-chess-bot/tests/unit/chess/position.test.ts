import { describe, expect, it } from 'vite-plus/test';
import {
  canonicalFen,
  countLegalMoves,
  predictFen,
  replaySanLine,
  toFourFieldFen,
} from '../../../src/chess/position.js';

/** Black has just played d7-d5, leaving a live e5 pawn that can take d6 en passant. */
const EP_CAPTURE_FEN = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
/** White takes dxe6 style: the pawn lands on d6 and the black d5 pawn is removed. */
const AFTER_EP_CAPTURE = '4k3/8/3P4/8/8/8/8/4K3 b - - 0 1';

/** A d2 pawn with no black pawn on c4 or e4, so the double push leaves no legal capture. */
const NO_CAPTURE_PUSH_FEN = '4k3/8/8/8/8/8/3P4/4K3 w - - 0 1';
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('predictFen with en passant', () => {
  it('plays an en passant capture, removing the passed pawn', () => {
    // The captured pawn sits beside the mover, not on the destination square, so a bug that
    // only models the destination would leave a stray black pawn on d5.
    const next = predictFen(EP_CAPTURE_FEN, 'e5d6');

    expect(next).toBe(AFTER_EP_CAPTURE);
    expect(next?.split(' ')[0]?.split('/')[4]).toBe('8');
    expect(next?.split(' ')[0]?.split('/')[2]).toBe('3P4');
  });

  it('leaves no en passant field behind after a capture', () => {
    // An ep capture is not a double push, so no new ep right can arise.
    expect(predictFen(EP_CAPTURE_FEN, 'e5d6')?.split(' ')[3]).toBe('-');
  });

  it('keeps the host en passant field after a double push that offers no capture', () => {
    // Chess.com's raw controller FEN records the target square after any double push, and the
    // predicted position feeds straight back into position comparison, so it must not be
    // dropped here. `canonicalFen` is what normalizes the two host conventions.
    expect(predictFen(NO_CAPTURE_PUSH_FEN, 'd2d4')?.split(' ')[3]).toBe('d3');
  });

  it('rejects a capture that the position does not actually allow', () => {
    // The same shape without the black d5 pawn: e5d6 is a diagonal move to an empty square.
    expect(countLegalMoves('4k3/8/8/4P3/8/8/8/4K3 w - - 0 1')).not.toBeNull();
    expect(predictFen('4k3/8/8/4P3/8/8/8/4K3 w - - 0 1', 'e5d6')).toBeNull();
  });
});

describe('canonicalFen normalizes host en passant conventions', () => {
  it('keeps the field when a capture is legal and drops it when none is', () => {
    // A capture is available here, so the legal-only convention retains the target square.
    expect(canonicalFen(EP_CAPTURE_FEN)).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');

    // The predicted double push carries the raw host field; canonicalizing strips it because no
    // black pawn can use it. Both hosts therefore agree on one comparison string.
    const afterPush = predictFen(NO_CAPTURE_PUSH_FEN, 'd2d4');
    expect(afterPush?.split(' ')[3]).toBe('d3');
    expect(canonicalFen(afterPush ?? '')).toBe('4k3/8/8/8/3P4/8/8/4K3 b - - 0 1');
  });

  it('treats the predicted en passant result as the same position as an independent replay', () => {
    // This is the comparison the Lichess adapter performs before it will dispatch a move.
    const predicted = canonicalFen(predictFen(EP_CAPTURE_FEN, 'e5d6') ?? '');
    expect(predicted).toBe(canonicalFen(AFTER_EP_CAPTURE));
  });
});

describe('replaySanLine', () => {
  it('correctly replays a sequence of SAN moves into UCI moves and canonical FENs', () => {
    const replay = replaySanLine(START_FEN, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    expect(replay).toBeDefined();
    expect(replay?.history.moves).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5']);
    expect(replay?.fens).toHaveLength(6);
    expect(replay?.fens[0]).toBe(canonicalFen(START_FEN));
  });

  it('handles castling and pawn promotion in replaySanLine', () => {
    const replay = replaySanLine('3k4/P7/8/8/8/8/8/R3K2R w KQ - 0 1', ['O-O', 'Ke7', 'a8=Q']);
    expect(replay).toBeDefined();
    expect(replay?.history.moves).toEqual(['e1g1', 'd8e7', 'a7a8q']);
    expect(replay?.fens).toHaveLength(4);
  });

  it('returns undefined if any SAN move is illegal or malformed', () => {
    expect(replaySanLine(START_FEN, ['e4', 'e4'])).toBeUndefined();
    expect(replaySanLine(START_FEN, ['invalidMove'])).toBeUndefined();
    expect(replaySanLine(START_FEN, [''])).toBeUndefined();
  });
});

describe('toFourFieldFen', () => {
  it('extracts the first four fields from standard FEN', () => {
    expect(toFourFieldFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
    );
  });

  it('handles strings with fewer than four fields gracefully', () => {
    expect(toFourFieldFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
    );
  });
});
