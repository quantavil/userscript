import { state } from '../state.js';
import { getBoardPiece, getBoardMatrix, getBoardOrientation } from '../adapters/index.js';
import { getConfigValue, configKeys, instanceVars, commLinkInstanceID } from './config.js';

export function getFenPieceColor(pieceFenStr) {
    return pieceFenStr == pieceFenStr.toUpperCase() ? 'w' : 'b';
}

export function getFenPieceOppositeColor(pieceFenStr) {
    return getFenPieceColor(pieceFenStr) == 'w' ? 'b' : 'w';
}

export function getRights() {
    let rights = '';

    const useChess960 = getConfigValue(configKeys.useChess960);

    if (useChess960) {
        // Chess960 Castling Rights
        // White (rank 1)
        let whiteKingX = -1;
        let whiteRooks = [];
        for (let x = 0; x < 8; x++) {
            const piece = getBoardPiece(String.fromCharCode(97 + x) + '1');
            if (piece === 'K') whiteKingX = x;
            else if (piece === 'R') whiteRooks.push(x);
        }
        if (whiteKingX !== -1) {
            // King-side (right of King)
            const kSideRook = whiteRooks.filter(x => x > whiteKingX).pop();
            if (kSideRook !== undefined) {
                rights += String.fromCharCode(65 + kSideRook);
            }
            // Queen-side (left of King)
            const qSideRook = whiteRooks.filter(x => x < whiteKingX).shift();
            if (qSideRook !== undefined) {
                rights += String.fromCharCode(65 + qSideRook);
            }
        }

        // Black (rank 8)
        let blackKingX = -1;
        let blackRooks = [];
        for (let x = 0; x < 8; x++) {
            const piece = getBoardPiece(String.fromCharCode(97 + x) + '8');
            if (piece === 'k') blackKingX = x;
            else if (piece === 'r') blackRooks.push(x);
        }
        if (blackKingX !== -1) {
            // King-side (right of King)
            const kSideRook = blackRooks.filter(x => x > blackKingX).pop();
            if (kSideRook !== undefined) {
                rights += String.fromCharCode(97 + kSideRook);
            }
            // Queen-side (left of King)
            const qSideRook = blackRooks.filter(x => x < blackKingX).shift();
            if (qSideRook !== undefined) {
                rights += String.fromCharCode(97 + qSideRook);
            }
        }
    } else {
        // Standard Chess Castling Rights
        const e1 = getBoardPiece('e1'),
              h1 = getBoardPiece('h1'),
              a1 = getBoardPiece('a1');

        if(e1 == 'K' && h1 == 'R') rights += 'K';
        if(e1 == 'K' && a1 == 'R') rights += 'Q';

        const e8 = getBoardPiece('e8'),
              h8 = getBoardPiece('h8'),
              a8 = getBoardPiece('a8');

        if(e8 == 'k' && h8 == 'r') rights += 'k';
        if(e8 == 'k' && a8 == 'r') rights += 'q';
    }

    return rights ? rights : '-';
}

function squeezeEmptySquares(fenStr) {
    return fenStr.replace(/1+/g, match => match.length);
}

export function getBasicFen() {
    const boardMatrix = getBoardMatrix();

    return squeezeEmptySquares(boardMatrix.map(x => x.join('')).join('/'));
}

export function getFen(onlyBasic) {
    const basicFen = getBasicFen();

    if(onlyBasic) {
        return basicFen;
    }

    const turn = instanceVars.turn.get(commLinkInstanceID) || getBoardOrientation();

    // FEN structure: [fen] [player color] [castling rights] [en passant targets] [halfmove clock] [fullmove clock]
    const fullFen = `${basicFen} ${turn} ${getRights()} - 0 1`;

    return fullFen;
}

export const countTotalPieces = fen => (fen.split(' ')[0].match(/[rnbqkp]/gi) || []).length;

export function getPieceChangeAmount(lastFen, newFen) {
    if(!lastFen || !newFen) return 0;

    const lastPieceCount = countTotalPieces(lastFen);
    const newPieceCount = countTotalPieces(newFen);

    const countChange = newPieceCount - lastPieceCount;

    return countChange;
}

export function getBoardSquareChangeAmount(lastFen, newFen) {
    if(!lastFen || !newFen) return 0;

    let board1 = lastFen.split(' ')[0].replace(/\d/g, d => ' '.repeat(d)).split('/').join('');
    let board2 = newFen.split(' ')[0].replace(/\d/g, d => ' '.repeat(d)).split('/').join('');

    let changedFrom = [];
    let diff = 0;

    for(let i = 0; i < board1.length; i++) {
        if(board1[i] !== board2[i]) {
            if(board1[i]?.trim()?.length > 0) changedFrom.push(board1[i]?.toLowerCase());

            diff += 1;
        }
    }

    return diff;
}
