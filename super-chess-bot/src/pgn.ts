export interface PgnMove {
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
  warningNotice?: string;
}

const DEFAULT_WARNING = 'Warning: Move timings and evaluations are client-side browser telemetry estimates.';

const STANDARD_INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Format elapsed milliseconds into standard PGN Elapsed Move Time (EMT).
 * Format: H:MM:SS or H:MM:SS.s (e.g. 0:00:01.2 or 0:00:05).
 */
export function formatEmt(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00:00';
  const totalSeconds = ms / 1000;
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

/** Escape special characters in PGN header strings. */
function escapeHeader(val: string): string {
  return val.replace(/["\\]/g, '\\$&');
}

/** Sanitize commentary text to prevent premature PGN comment closure. */
function sanitizeComment(text: string): string {
  return text.replace(/[{}]/g, '').trim();
}

/**
 * Builds a standard, pasteable PGN string complete with headers,
 * elapsed move times ({ [%emt ...] }), and a terminal telemetry warning notice.
 */
export function buildPgn(moves: readonly PgnMove[], options: PgnOptions = {}): string {
  const event = options.event ?? 'Live Chess';
  const site = options.site ?? 'Super Chess Bot';
  const date = options.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const round = options.round ?? '-';
  const white = options.white ?? 'White';
  const black = options.black ?? 'Black';
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

  if (startFen && startFen.trim() !== STANDARD_INITIAL_FEN) {
    headers.push(['SetUp', '1']);
    headers.push(['FEN', startFen.trim()]);
  }

  const headerLines = headers.map(([k, v]) => `[${k} "${escapeHeader(v)}"]`).join('\n');

  const tokens: string[] = [];
  for (const move of moves) {
    const isWhite = move.ply % 2 === 1;
    const moveNumber = Math.floor((move.ply - 1) / 2) + 1;
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
