/**
 * @license GPL-3.0-or-later
 *
 * Super Chess Bot - Ultra-fast in-memory opening book (plies 1–8)
 * Normalized EPD dictionary with configurable opening styles:
 * - hyper-defensive: Solid fortresses, Berlin Wall, Petroff, Slav, Réti
 * - defensive: French, Caro-Kann, Queen's Gambit Declined, Nimzo-Indian
 * - balanced: Classical GM mainlines, Italian Giuoco Piano, Ruy Lopez Morphy, Open Sicilian
 * - aggressive: King's Gambit, Evans Gambit, Scotch Gambit, Smith-Morra, Sicilian Dragon
 * - hyper-aggressive: Danish Gambit, Halloween, Blackmar-Diemer, Traxler Counterattack, Stafford
 */

import { toFourFieldFen } from '../../chess/position.js';
import type { OpeningStyle } from '../../chess/types';

import { type BookEntry, type CandidateMove, EPD_BOOK } from './positions.js';

export function normalizeEpd(fen: string): string {
  return toFourFieldFen(fen);
}

/**
 * Opening positions are keyed on placement, side to move, and castling rights only.
 *
 * Hosts disagree on the en passant field: Chess.com returns the raw controller
 * FEN, which keeps the ep square after every double push, while the Lichess
 * adapter passes chessops' canonical FEN, which emits the ep square only
 * when a capture is actually available. Matching the ep field exactly made most
 * of the book unreachable on Lichess, so the field is ignored on both
 * the key and the lookup. No book move is an en passant capture, so no candidate
 * depends on it.
 */
function bookKey(epd: string): string {
  return `${epd.split(' ').slice(0, 3).join(' ')} -`;
}

/** Ep-insensitive view of EPD_BOOK. Duplicate keys would silently shadow each other. */
const EPD_INDEX: Record<string, BookEntry> = (() => {
  const index: Record<string, BookEntry> = {};
  for (const [epd, entry] of Object.entries(EPD_BOOK)) {
    const key = bookKey(epd);
    if (index[key]) throw new Error(`duplicate opening book key: ${key}`);
    index[key] = entry;
  }
  return index;
})();

/**
 * Returns candidate moves for the given EPD position, taking the requested opening style into account.
 */
function getCandidatesForPosition(epd: string, style: OpeningStyle = 'balanced'): CandidateMove[] | null {
  const entry = EPD_INDEX[bookKey(epd)];
  if (!entry) return null;

  if (Array.isArray(entry)) {
    return entry;
  }

  const styleCandidates = entry[style];
  if (styleCandidates && styleCandidates.length > 0) {
    return styleCandidates;
  }

  return entry.default ?? entry.balanced ?? null;
}

/**
 * Looks up the best or weighted opening move for the given FEN.
 * Accepts either:
 * - (fen) -> style defaults to 'balanced', rng defaults to Math.random
 * - (fen, rng) -> style defaults to 'balanced', custom rng function (for deterministic testing)
 * - (fen, style) -> specified style, rng defaults to Math.random
 * - (fen, style, rng) -> specified style and custom rng function
 */
export function lookupBookMove(
  fen: string,
  styleOrRng?: OpeningStyle | (() => number),
  rng?: () => number,
): string | null {
  let style: OpeningStyle = 'balanced';
  let rand = rng ?? Math.random;

  if (typeof styleOrRng === 'function') {
    rand = styleOrRng;
  } else if (styleOrRng !== undefined) {
    style = styleOrRng;
  }

  const epd = normalizeEpd(fen);
  const candidates = getCandidatesForPosition(epd, style);
  if (!candidates || candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, [, w]) => sum + w, 0);
  let threshold = rand() * totalWeight;
  for (const [move, weight] of candidates) {
    threshold -= weight;
    if (threshold <= 0) return move;
  }
  return candidates[0][0];
}
