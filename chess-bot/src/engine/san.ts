/**
 * UCI to SAN (Standard Algebraic Notation) converter
 * Uses LocalEngine for board representation and move generation
 */

import { LocalEngine } from './local-engine.js';
import {
    WP, WN, WB, WR, WQ, WK,
    BP, BN, BB, BR, BQ, BK,
    FLAG_EP, FLAG_CASTLE, FLAG_PROMO
} from './constants.js';
import { sqName, sqFile, sqRank, nameToSq } from './utils.js';
import type { Move } from '../types/chess';

// Piece symbols for SAN
const PIECE_SYMBOLS: Record<number, string> = {
    [WN]: 'N', [WB]: 'B', [WR]: 'R', [WQ]: 'Q', [WK]: 'K',
    [BN]: 'N', [BB]: 'B', [BR]: 'R', [BQ]: 'Q', [BK]: 'K'
};

// Promotion pieces
const PROMO_SYMBOLS: Record<string, string> = { q: 'Q', r: 'R', b: 'B', n: 'N' };

// Shared engine instance for conversion
let sanEngine: LocalEngine | null = null;

function getEngine(): LocalEngine {
    if (!sanEngine) sanEngine = new LocalEngine();
    return sanEngine;
}

/**
 * Convert UCI move to SAN notation
 * @param {string} fen - Current position FEN
 * @param {any} uci - Move in UCI format (e.g., "e2e4", "e7e8q") or object
 * @returns {string} SAN notation (e.g., "e4", "Nf3", "O-O", "e8=Q")
 */
export function uciToSan(fen: string, uci: any): any {
    if (!uci) return '';

    let uciStr = uci;
    // If uci is an object, convert it to a UCI string representation
    if (typeof uci === 'object') {
        if (typeof uci.uci === 'string') {
            uciStr = uci.uci;
        } else if (typeof uci.from === 'string' && typeof uci.to === 'string') {
            uciStr = uci.from + uci.to + (uci.promo || uci.promotion || '');
        }
    }

    if (typeof uciStr !== 'string' || uciStr.length < 4) return uciStr;

    const engine = getEngine();
    engine.loadFen(fen);

    const from = nameToSq(uciStr.substring(0, 2));
    const to = nameToSq(uciStr.substring(2, 4));
    const promo = uciStr.length >= 5 ? uciStr[4].toLowerCase() : null;

    // Generate legal moves to find the matching move
    const moves = engine.generateLegalMoves();
    const move = moves.find((m: Move) => m.from === from && m.to === to &&
        (!promo || (m.flags & FLAG_PROMO)));

    if (!move) return uciStr; // Fallback to UCI if not found

    // Handle castling
    if (move.flags & FLAG_CASTLE) {
        const toFile = sqFile(to);
        if (toFile === 6) return 'O-O';   // Kingside
        if (toFile === 2) return 'O-O-O'; // Queenside
    }

    const piece = engine.board[from];
    const pieceType = Math.abs(piece);
    const isPawn = pieceType === 1;
    const isCapture = engine.board[to] !== 0 || (move.flags & FLAG_EP);

    let san = '';

    // Piece letter (not for pawns)
    if (!isPawn) {
        san += PIECE_SYMBOLS[piece] || '';
    }

    // Disambiguation for non-pawn moves
    if (!isPawn && moves.length > 1) {
        const samePieceMoves = moves.filter((m: Move) =>
            m.to === to &&
            m.from !== from &&
            engine.board[m.from] === piece
        );

        if (samePieceMoves.length > 0) {
            const fromFile = sqFile(from);
            const fromRank = sqRank(from);

            // Check if file disambiguation is sufficient
            const sameFile = samePieceMoves.some((m: Move) => sqFile(m.from) === fromFile);
            const sameRank = samePieceMoves.some((m: Move) => sqRank(m.from) === fromRank);

            if (!sameFile) {
                san += uciStr[0]; // File
            } else if (!sameRank) {
                san += uciStr[1]; // Rank
            } else {
                san += uciStr.substring(0, 2); // Both
            }
        }
    }

    // Pawn captures need file
    if (isPawn && isCapture) {
        san += uciStr[0]; // File of departure
    }

    // Capture symbol
    if (isCapture) {
        san += 'x';
    }

    // Destination square
    san += uciStr.substring(2, 4);

    // Promotion
    if ((move.flags & FLAG_PROMO) && promo) {
        san += '=' + (PROMO_SYMBOLS[promo] || promo.toUpperCase());
    }

    // Check for check/checkmate (requires making the move)
    engine.makeMove(move);
    const opponentMoves = engine.generateLegalMoves();
    const inCheck = engine.inCheck(-engine.side);

    if (opponentMoves.length === 0 && inCheck) {
        san += '#';
    } else if (inCheck) {
        san += '+';
    }

    return san;
}

/**
 * Get move number from FEN
 * @param {string} fen - Position FEN
 * @returns {number} Full move number
 */
export function getMoveNumber(fen: string): number {
    const parts = fen.split(' ');
    return parseInt(parts[5]) || 1;
}

/**
 * Check if it's white's turn from FEN
 * @param {string} fen - Position FEN
 * @returns {boolean} True if white to move
 */
export function isWhiteToMove(fen: string): boolean {
    const parts = fen.split(' ');
    return parts[1] === 'w';
}

/**
 * Format a move with move number (e.g., "1. e4", "1... e5")
 * @param {string} fen - Position FEN before move
 * @param {string} uci - Move in UCI format
 * @returns {string} Formatted move with number
 */
export function formatMove(fen: string, uci: string): string {
    const san = uciToSan(fen, uci);
    const moveNum = getMoveNumber(fen);
    const isWhite = isWhiteToMove(fen);

    if (isWhite) {
        return `${moveNum}. ${san}`;
    } else {
        return `${moveNum}... ${san}`;
    }
}

/**
 * Convert a PV string (space-separated UCI moves) to SAN notation.
 * Walks the engine through each move, converting as it goes.
 * @param {string} fen - Starting position FEN
 * @param {string} pv - PV string (e.g., "e2e4 e7e5 g1f3")
 * @returns {string} SAN PV string (e.g., "e4 e5 Nf3")
 */
export function pvToSan(fen: string, pv: string): string {
    if (!fen || !pv) return pv || '';
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (moves.length === 0) return '';

    const engine = getEngine();
    engine.loadFen(fen);

    const sanMoves: string[] = [];
    const appliedMoves: Move[] = [];

    for (const uci of moves) {
        if (!uci || uci.length < 4) break;

        const from = nameToSq(uci.substring(0, 2));
        const to = nameToSq(uci.substring(2, 4));
        const promo = uci.length >= 5 ? uci[4].toLowerCase() : null;

        const legalMoves = engine.generateLegalMoves();
        const move = legalMoves.find((m: Move) => m.from === from && m.to === to &&
            (!promo || (m.flags & FLAG_PROMO)));

        if (!move) break; // Illegal move in this position

        // Build SAN from current position
        const san = uciToSanFromEngine(engine, move, legalMoves, uci, promo);
        sanMoves.push(san);

        engine.makeMove(move);
        appliedMoves.push(move);
    }

    // Clean up — restore engine state
    for (let i = appliedMoves.length - 1; i >= 0; i--) {
        engine.unmakeMove(appliedMoves[i]);
    }

    return sanMoves.join(' ');
}

/**
 * Build SAN string from an engine state and a matched move object.
 * Internal helper for pvToSan to avoid re-loading FEN for each move.
 */
function uciToSanFromEngine(engine: LocalEngine, move: Move, moves: Move[], uci: string, promo: string | null): string {
    const from = move.from;
    const to = move.to;

    // Handle castling
    if (move.flags & FLAG_CASTLE) {
        const toFile = sqFile(to);
        if (toFile === 6) return 'O-O';
        if (toFile === 2) return 'O-O-O';
    }

    const piece = engine.board[from];
    const pieceType = Math.abs(piece);
    const isPawn = pieceType === 1;
    const isCapture = engine.board[to] !== 0 || (move.flags & FLAG_EP);

    let san = '';

    if (!isPawn) {
        san += PIECE_SYMBOLS[piece] || '';
    }

    // Disambiguation
    if (!isPawn && moves.length > 1) {
        const samePieceMoves = moves.filter((m: Move) =>
            m.to === to && m.from !== from && engine.board[m.from] === piece
        );
        if (samePieceMoves.length > 0) {
            const fromFile = sqFile(from);
            const fromRank = sqRank(from);
            const sameFile = samePieceMoves.some((m: Move) => sqFile(m.from) === fromFile);
            const sameRank = samePieceMoves.some((m: Move) => sqRank(m.from) === fromRank);
            if (!sameFile) san += uci[0];
            else if (!sameRank) san += uci[1];
            else san += uci.substring(0, 2);
        }
    }

    if (isPawn && isCapture) san += uci[0];
    if (isCapture) san += 'x';
    san += uci.substring(2, 4);

    if ((move.flags & FLAG_PROMO) && promo) {
        san += '=' + (PROMO_SYMBOLS[promo] || promo.toUpperCase());
    }

    // Check/checkmate
    engine.makeMove(move);
    const opponentMoves = engine.generateLegalMoves();
    const inCheck = engine.inCheck(-engine.side);
    if (opponentMoves.length === 0 && inCheck) san += '#';
    else if (inCheck) san += '+';
    engine.unmakeMove(move);

    return san;
}
