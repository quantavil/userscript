// Debounce helper
export function debounce(fn, wait = 150) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

export function getRandomDepth(botPower) {
    const minDepth = 5;
    const maxDepth = Math.max(botPower || 10, minDepth);
    return Math.floor(Math.random() * (maxDepth - minDepth + 1)) + minDepth;
}

export function getHumanDelay(baseDelay, randomDelay) {
    return baseDelay + Math.floor(Math.random() * randomDelay);
}

// Helpers
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export async function waitForElement(selector, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const existing = qs(selector);
        if (existing) return resolve(existing);

        let timeoutId;
        const obs = new MutationObserver(() => {
            const el = qs(selector);
            if (el) {
                clearTimeout(timeoutId);
                obs.disconnect();
                resolve(el);
            }
        });

        obs.observe(document.body, { childList: true, subtree: true });
        timeoutId = setTimeout(() => {
            obs.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

// Data extraction helpers
export function scoreFrom(obj) {
    if (!obj) return {};
    if (typeof obj === 'object') {
        if ('mate' in obj && obj.mate !== 0) return { mate: parseInt(obj.mate, 10) };
        if ('cp' in obj) return { cp: parseInt(obj.cp, 10) };
    }
    if (typeof obj === 'string') {
        if (obj.toUpperCase().includes('M')) {
            const m = parseInt(obj.replace(/[^-0-9]/g, ''), 10);
            if (!isNaN(m)) return { mate: m };
        }
        const cpFloat = parseFloat(obj);
        if (!isNaN(cpFloat)) return { cp: Math.round(cpFloat * 100) };
    }
    if (typeof obj === 'number') return { cp: Math.round(obj * 100) };
    return {};
}

export function scoreToDisplay(score) {
    if (score && typeof score.mate === 'number' && score.mate !== 0) return `M${score.mate}`;
    if (score && typeof score.cp === 'number') return (score.cp / 100).toFixed(2);
    return '-';
}

export function scoreNumeric(s) {
    if (!s) return -Infinity;
    if (typeof s.mate === 'number') return s.mate > 0 ? 100000 - s.mate : -100000 - s.mate;
    if (typeof s.cp === 'number') return s.cp;
    return -Infinity;
}

// Parse FEN placement once into 8x8 array for fast repeated lookups
// Returns an object with .get(square) method e.g. board.get('e4') → 'P' or null
export function parseFenToBoard(fen) {
    if (!fen) return null;
    const placement = fen.split(' ')[0];
    const ranks = placement.split('/');
    if (ranks.length !== 8) return null;
    const cells = new Array(64).fill(null);
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        const rank = 7 - rankIdx; // ranks[0] = rank 8 → index 7
        let file = 0;
        for (const ch of ranks[rankIdx]) {
            if (ch >= '1' && ch <= '8') { file += parseInt(ch, 10); }
            else { cells[rank * 8 + file] = ch; file++; }
        }
    }
    return {
        cells,
        get(square) {
            if (!square || square.length < 2) return null;
            const f = square.charCodeAt(0) - 97; // 'a' = 0
            const r = parseInt(square[1], 10) - 1;
            if (f < 0 || f > 7 || r < 0 || r > 7) return null;
            return cells[r * 8 + f];
        }
    };
}

// FEN helpers for piece info
export function fenCharAtSquare(fen, square) {
    if (!fen || !square) return null;
    const placement = fen.split(' ')[0];
    const ranks = placement.split('/');
    const file = 'abcdefgh'.indexOf(square[0]);
    const rankNum = parseInt(square[1], 10);
    if (file < 0 || rankNum < 1 || rankNum > 8 || ranks.length !== 8) return null;
    const row = 8 - rankNum;
    const rowStr = ranks[row];
    let col = 0;
    for (const ch of rowStr) {
        if (/\d/.test(ch)) {
            col += parseInt(ch, 10);
            if (col > file) return null;
        } else {
            if (col === file) return ch;
            col++;
        }
    }
    return null;
}

export function pieceFromFenChar(ch) {
    if (!ch) return null;
    const isUpper = ch === ch.toUpperCase();
    return { color: isUpper ? 'w' : 'b', type: ch.toLowerCase() };
}

// Find king position
export function findKing(fen, color) {
    const placement = fen.split(' ')[0];
    const ranks = placement.split('/');
    const kingChar = color === 'w' ? 'K' : 'k';

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        const rank = 8 - rankIdx;
        let file = 0;
        for (const ch of ranks[rankIdx]) {
            if (/\d/.test(ch)) {
                file += parseInt(ch, 10);
            } else {
                if (ch === kingChar) {
                    return 'abcdefgh'[file] + rank;
                }
                file++;
            }
        }
    }
    return null;
}

// Simple FEN after move simulation (for king safety check)
export function makeSimpleMove(fen, from, to) {
    const parts = fen.split(' ');
    const placement = parts[0];
    const ranks = placement.split('/');

    const fromFile = 'abcdefgh'.indexOf(from[0]);
    const fromRank = parseInt(from[1], 10);
    const toFile = 'abcdefgh'.indexOf(to[0]);
    const toRank = parseInt(to[1], 10);

    if (fromFile < 0 || toFile < 0 || fromRank < 1 || toRank < 1) return fen;

    const fromRowIdx = 8 - fromRank;
    const toRowIdx = 8 - toRank;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    // Expand rank string to array (pieces or '1's)
    const expandRank = (rankStr) => {
        let row = [];
        for (const ch of rankStr) {
            if (/\d/.test(ch)) {
                const spaces = parseInt(ch, 10);
                for (let i = 0; i < spaces; i++) row.push('1');
            } else {
                row.push(ch);
            }
        }
        return row;
    };

    // Compress array back to rank string
    const compressRank = (rowArr) => {
        let rankStr = '';
        let emptyCount = 0;
        for (const ch of rowArr) {
            if (ch === '1') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rankStr += emptyCount;
                    emptyCount = 0;
                }
                rankStr += ch;
            }
        }
        if (emptyCount > 0) rankStr += emptyCount;
        return rankStr;
    };

    // -------------------------------------------------------------------------
    // Core Logic
    // -------------------------------------------------------------------------

    const movingPiece = fenCharAtSquare(fen, from);
    if (!movingPiece) return fen;

    // 1. Expand ranks
    // If same rank, modify the same array in-place
    const fromRowArr = expandRank(ranks[fromRowIdx]);
    const toRowArr = (fromRowIdx === toRowIdx)
        ? fromRowArr
        : expandRank(ranks[toRowIdx]);

    // 2. Clear source square
    fromRowArr[fromFile] = '1';

    // 3. Set destination square
    toRowArr[toFile] = movingPiece;

    // 4. Compress and update FEN ranks
    ranks[fromRowIdx] = compressRank(fromRowArr);
    if (fromRowIdx !== toRowIdx) {
        ranks[toRowIdx] = compressRank(toRowArr);
    }

    parts[0] = ranks.join('/');
    return parts.join(' ');
}

// Get all squares attacking a given square (fast heuristic)
export function getAttackersOfSquare(fen, targetSquare, attackerColor) {
    const attackers = [];
    const tFile = 'abcdefgh'.indexOf(targetSquare[0]);
    const tRank = parseInt(targetSquare[1], 10);

    if (tFile < 0 || tRank < 1 || tRank > 8) return attackers;

    // Helper: check square and add if it contains attacker piece
    const checkSquare = (file, rank, pieceTypes) => {
        if (file < 0 || file > 7 || rank < 1 || rank > 8) return;
        const sq = 'abcdefgh'[file] + rank;
        const ch = fenCharAtSquare(fen, sq);
        const piece = pieceFromFenChar(ch);
        if (piece && piece.color === attackerColor && pieceTypes.includes(piece.type)) {
            attackers.push({ square: sq, piece: piece.type });
        }
    };

    // Pawn attacks (diagonal)
    const pawnDir = attackerColor === 'w' ? 1 : -1;
    checkSquare(tFile - 1, tRank - pawnDir, ['p']);
    checkSquare(tFile + 1, tRank - pawnDir, ['p']);

    // Knight attacks
    const knightMoves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];
    knightMoves.forEach(([df, dr]) => checkSquare(tFile + df, tRank + dr, ['n']));

    // King attacks
    for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            checkSquare(tFile + df, tRank + dr, ['k']);
        }
    }

    // Sliding pieces (rook, bishop, queen)
    const directions = [
        { dx: 1, dy: 0, pieces: ['r', 'q'] },   // right
        { dx: -1, dy: 0, pieces: ['r', 'q'] },  // left
        { dx: 0, dy: 1, pieces: ['r', 'q'] },   // up
        { dx: 0, dy: -1, pieces: ['r', 'q'] },  // down
        { dx: 1, dy: 1, pieces: ['b', 'q'] },   // diagonal
        { dx: 1, dy: -1, pieces: ['b', 'q'] },
        { dx: -1, dy: 1, pieces: ['b', 'q'] },
        { dx: -1, dy: -1, pieces: ['b', 'q'] }
    ];

    directions.forEach(({ dx, dy, pieces }) => {
        let f = tFile + dx;
        let r = tRank + dy;
        while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
            const sq = 'abcdefgh'[f] + r;
            const ch = fenCharAtSquare(fen, sq);
            if (ch) {
                const piece = pieceFromFenChar(ch);
                if (piece && piece.color === attackerColor && pieces.includes(piece.type)) {
                    attackers.push({ square: sq, piece: piece.type });
                }
                break; // Blocked
            }
            f += dx;
            r += dy;
        }
    });

    return attackers;
}

// Check if square is attacked by opponent
export function isSquareAttackedBy(fen, square, attackerColor) {
    return getAttackersOfSquare(fen, square, attackerColor).length > 0;
}

// Fast board-based versions (operate on pre-parsed board from parseFenToBoard)
export function getAttackersOnBoard(board, targetSquare, attackerColor) {
    const attackers = [];
    const tFile = targetSquare.charCodeAt(0) - 97;
    const tRank = parseInt(targetSquare[1], 10);
    if (tFile < 0 || tFile > 7 || tRank < 1 || tRank > 8) return attackers;

    const checkSq = (file, rank, pieceTypes) => {
        if (file < 0 || file > 7 || rank < 1 || rank > 8) return;
        const sq = 'abcdefgh'[file] + rank;
        const ch = board.get(sq);
        if (!ch) return;
        const piece = pieceFromFenChar(ch);
        if (piece && piece.color === attackerColor && pieceTypes.includes(piece.type)) {
            attackers.push({ square: sq, piece: piece.type });
        }
    };

    // Pawn attacks
    const pawnDir = attackerColor === 'w' ? 1 : -1;
    checkSq(tFile - 1, tRank - pawnDir, ['p']);
    checkSq(tFile + 1, tRank - pawnDir, ['p']);

    // Knight
    for (const [df, dr] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
        checkSq(tFile + df, tRank + dr, ['n']);
    }

    // King
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        checkSq(tFile + df, tRank + dr, ['k']);
    }

    // Sliding pieces
    for (const { dx, dy, pieces } of [
        { dx: 1, dy: 0, pieces: ['r', 'q'] }, { dx: -1, dy: 0, pieces: ['r', 'q'] },
        { dx: 0, dy: 1, pieces: ['r', 'q'] }, { dx: 0, dy: -1, pieces: ['r', 'q'] },
        { dx: 1, dy: 1, pieces: ['b', 'q'] }, { dx: 1, dy: -1, pieces: ['b', 'q'] },
        { dx: -1, dy: 1, pieces: ['b', 'q'] }, { dx: -1, dy: -1, pieces: ['b', 'q'] }
    ]) {
        let f = tFile + dx, r = tRank + dy;
        while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
            const sq = 'abcdefgh'[f] + r;
            const ch = board.get(sq);
            if (ch) {
                const piece = pieceFromFenChar(ch);
                if (piece && piece.color === attackerColor && pieces.includes(piece.type)) {
                    attackers.push({ square: sq, piece: piece.type });
                }
                break;
            }
            f += dx; r += dy;
        }
    }

    return attackers;
}

export function isAttackedOnBoard(board, square, attackerColor) {
    return getAttackersOnBoard(board, square, attackerColor).length > 0;
}

// Fast board-based king finder
export function findKingOnBoard(board, color) {
    const king = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            if (board.cells[r * 8 + f] === king) return 'abcdefgh'[f] + (r + 1);
        }
    }
    return null;
}

// Fast board-based simple move (returns a new board with the move applied)
export function makeMoveOnBoard(board, from, to) {
    const ff = from.charCodeAt(0) - 97, fr = parseInt(from[1], 10) - 1;
    const tf = to.charCodeAt(0) - 97, tr = parseInt(to[1], 10) - 1;
    const newCells = board.cells.slice();
    newCells[tr * 8 + tf] = newCells[fr * 8 + ff];
    newCells[fr * 8 + ff] = null;
    return {
        cells: newCells,
        get(sq) {
            if (!sq || sq.length < 2) return null;
            const f2 = sq.charCodeAt(0) - 97, r2 = parseInt(sq[1], 10) - 1;
            if (f2 < 0 || f2 > 7 || r2 < 0 || r2 > 7) return null;
            return newCells[r2 * 8 + f2];
        }
    };
}
