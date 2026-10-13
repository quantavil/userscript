import { STANDARD_INITIAL_FEN } from '../chess/position.js';
import { getVariantDefinition } from '../chess/variants.js';

export interface PgnMove {
  /** One-based ply index relative to the supplied root position. */
  ply: number;
  san: string;
  elapsedMs?: number | null;
}

export interface PgnOptions {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white?: string;
  black?: string;
  result?: string;
  startFen?: string;
  /** Engine variant key; a non-standard variant needs a `[Variant "..."]` tag to be readable. */
  variant?: string;
  warningNotice?: string;
}

const DEFAULT_WARNING = 'Warning: Move timings and evaluations are client-side browser telemetry estimates.';

/**
 * Format elapsed milliseconds into standard PGN Elapsed Move Time (EMT).
 * Format: H:MM:SS or H:MM:SS.s (e.g. 0:00:01.2 or 0:00:05).
 */
export function formatEmt(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00:00';
  const totalSeconds = Math.round(ms / 100) / 10;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainderSec = totalSeconds % 60;
  const roundedRemainder = Math.round(remainderSec * 10) / 10;
  const isWhole = roundedRemainder % 1 === 0;
  const secPart = isWhole ? Math.floor(roundedRemainder).toString() : roundedRemainder.toFixed(1);
  const paddedSec = roundedRemainder < 10 ? `0${secPart}` : secPart;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minStr}:${paddedSec}`;
}

/**
 * Escape a PGN header string.
 *
 * A raw newline would split one header tag into two and produce a file that no reader accepts,
 * so line breaks collapse to spaces rather than surviving.
 */
function escapeHeader(val: string): string {
  return val.replace(/["\\]/g, '\\$&').replace(/\r?\n/g, ' ');
}

/** Sanitize commentary text to prevent premature PGN comment closure. */
function sanitizeComment(text: string): string {
  return text.replace(/[{}]/g, '').trim();
}

/** `YYYY.MM.DD` in the player's local calendar day, which is what a PGN date means. */
function localPgnDate(now: Date): string {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
}

/** Absolute move number and side-to-move offset implied by a root FEN. */
export function rootMoveNumbering(startFen?: string): { fullmove: number; offset: number } {
  const fields = startFen?.trim().split(/\s+/);
  return {
    fullmove: Math.max(1, Number.parseInt(fields?.[5] ?? '1', 10) || 1),
    offset: fields?.[1] === 'b' ? 1 : 0,
  };
}

/**
 * Builds a standard, pasteable PGN string complete with headers,
 * elapsed move times ({ [%emt ...] }), and a terminal telemetry warning notice.
 */
export function buildPgn(moves: readonly PgnMove[], options: PgnOptions = {}): string {
  const event = options.event ?? 'Live Chess';
  const site = options.site ?? 'Super Chess Bot';
  const date = options.date ?? localPgnDate(new Date());
  const round = options.round ?? '-';
  const white = options.white ?? 'White';
  const black = options.black ?? 'Black';
  // Without an observed game result the honest tag is the PGN "unfinished" marker.
  const result = options.result ?? '*';
  const startFen = options.startFen;
  const warningNotice = options.warningNotice ?? DEFAULT_WARNING;

  const headers: [string, string][] = [
    ['Event', event],
    ['Site', site],
    ['Date', date],
    ['Round', round],
    ['White', white],
    ['Black', black],
    ['Result', result],
  ];

  const trimmedStart = startFen?.trim();
  if (trimmedStart && trimmedStart !== STANDARD_INITIAL_FEN) {
    headers.push(['SetUp', '1']);
    headers.push(['FEN', trimmedStart]);
  }
  // Aliases such as `fromPosition` are played as ordinary chess and must not be tagged.
  const variantId = getVariantDefinition(options.variant)?.id ?? options.variant;
  if (variantId && variantId !== 'standard') {
    headers.push(['Variant', variantId]);
  }

  const headerLines = headers.map(([k, v]) => `[${k} "${escapeHeader(v)}"]`).join('\n');

  const { fullmove: rootFullmove, offset: rootOffset } = rootMoveNumbering(startFen);
  const tokens: string[] = [];
  for (const move of moves) {
    const relativePly = move.ply - 1 + rootOffset;
    const isWhite = relativePly % 2 === 0;
    const moveNumber = rootFullmove + Math.floor(relativePly / 2);
    tokens.push(isWhite ? `${moveNumber}.` : `${moveNumber}...`);
    tokens.push(move.san);

    if (typeof move.elapsedMs === 'number' && Number.isFinite(move.elapsedMs) && move.elapsedMs > 0) {
      tokens.push(`{ [%emt ${formatEmt(move.elapsedMs)}] }`);
    }
  }

  if (warningNotice) {
    tokens.push(`{ ${sanitizeComment(warningNotice)} }`);
  }
  tokens.push(result);

  const moveText = tokens.join(' ');
  return `${headerLines}\n\n${moveText}\n`;
}
