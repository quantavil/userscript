import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';

export interface PositionHistory {
  startFen: string;
  moves: string[];
}
interface HistorySource {
  getHistoryFENs?: () => unknown;
  getHistorySANs?: () => unknown;
}
const comparable = (fen: string) =>
  fen
    .split(' ')
    .filter((_, i) => i !== 3)
    .join(' ');

/** Reconstruct the selected line; discard partial or mismatched histories. */
export function readPositionHistory(game: HistorySource, currentFen: string): PositionHistory | undefined {
  try {
    const fens = game.getHistoryFENs?.();
    const sans = game.getHistorySANs?.();
    if (!Array.isArray(fens) || !Array.isArray(sans) || typeof fens[0] !== 'string') return undefined;
    const setup = parseFen(fens[0]);
    if (setup.isErr) return undefined;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return undefined;
    const moves: string[] = [];
    for (const san of sans) {
      if (!san) continue;
      if (typeof san !== 'string') return undefined;
      const move = parseSan(position.value, san);
      if (!move) return undefined;
      moves.push(makeUci(move));
      position.value.play(move);
      if (comparable(makeFen(position.value.toSetup())) === comparable(currentFen)) return { startFen: fens[0], moves };
    }
    if (comparable(fens[0]) === comparable(currentFen)) return { startFen: fens[0], moves: [] };
    return undefined;
  } catch {
    return undefined;
  }
}
