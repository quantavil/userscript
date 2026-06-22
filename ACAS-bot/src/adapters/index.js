import { state } from '../state.js';
import {
    chessCoordinatesToIndex
} from '../utils/coordinates.js';
import {
    domain
} from '../utils/config.js';

export const supportedSites = {};

export let resetCachedValues = () => {};

export function setResetCachedValues(fn) {
    resetCachedValues = fn;
}

export function filterInvisibleElems(elementArr, inverse) {
    return [...elementArr].filter(elem => {
        const style = getComputedStyle(elem);
        const bounds = elem.getBoundingClientRect();

        const isHidden =
            style.visibility === 'hidden' ||
            style.display === 'none' ||
            style.opacity === '0' ||
            bounds.width == 0 ||
            bounds.height == 0;

        return inverse ? isHidden : !isHidden;
    });
}

export function convertPieceStrToFen(str) {
    if(!str || str.length !== 2) {
        return null;
    }

    const firstChar = str[0].toLowerCase();
    const secondChar = str[1];

    if(firstChar === 'w') {
        return secondChar.toUpperCase();
    } else if (firstChar === 'b') {
        return secondChar.toLowerCase();
    }

    return null;
}

export function getBoardOrientation() {
    const boardOrientation = getSiteData('boardOrientation');
    const playerColor = state.commLink ? state.commLink.commands.playerColor : null;

    return boardOrientation || playerColor || null;
}

export function getBoardMatrix() {
    const [boardRanks, boardFiles] = getBoardDimensions();

    const board = Array.from({ length: boardFiles }, () => Array(boardRanks).fill(1));
    const pieceElems = getPieceElem(true);
    const isValidPieceElemsArray = Array.isArray(pieceElems) || pieceElems instanceof NodeList;

    if(isValidPieceElemsArray) {
        pieceElems.forEach(pieceElem => {
            const pieceFenCode = getPieceElemFen(pieceElem);
            const pieceCoordsArr = getPieceElemCoords(pieceElem);

            try {
                const [xIdx, yIdx] = pieceCoordsArr;

                board[boardFiles - (yIdx + 1)][xIdx] = pieceFenCode;
            } catch(e) {
                if(state.commLink && state.commLink.debugMode) console.error(e);
            }
        });
    }

    state.lastBoardMatrix = board;

    return board;
}

export function getBoardPiece(fenCoord) {
    const [boardRanks, boardFiles] = getBoardDimensions();
    const indexArr = chessCoordinatesToIndex(fenCoord);

    return getBoardMatrix()?.[boardFiles - (indexArr[1] + 1)]?.[indexArr[0]];
}

export function isPawnPromotion(bestMove) {
    const [fenCoordFrom, fenCoordTo] = bestMove;
    const piece = getBoardPiece(fenCoordFrom);

    if(typeof piece !== 'string' || piece.toLowerCase() !== 'p')
        return false;

    const endingRow = parseInt(fenCoordTo[1], 10);
    const [boardRanks] = getBoardDimensions();

    if ((piece === 'P' && endingRow === (boardRanks ?? 8)) || (piece === 'p' && endingRow === 1)) {
        return true;
    }

    return false;
}

export function getSiteData(dataType, obj) {
    const pathname = window.location.pathname;

    let dataObj = { pathname };

    if(obj && typeof obj === 'object') {
        dataObj = { ...dataObj, ...obj };
    }

    const dataHandlerFunction = supportedSites[domain]?.[dataType];

    if(typeof dataHandlerFunction !== 'function') {
        return null;
    }

    const result = dataHandlerFunction(dataObj);

    return result;
}

export function addSupportedChessSite(domains, typeHandlerObj) {
    const domainList = Array.isArray(domains) ? domains : [domains];

    domainList.forEach(domain => {
        supportedSites[domain] = typeHandlerObj;
    });
}

export function getBoardElem() {
    const boardElem = getSiteData('boardElem');

    return boardElem || null;
}

export function getPieceElem(getAll) {
    const boardElem = getBoardElem();

    const boardQuerySelector = (getAll ? query => {
      const elems = boardElem?.querySelectorAll(query);
      return elems?.length ? [...elems] : null;
    } : boardElem?.querySelector?.bind(boardElem));

    if(typeof boardQuerySelector !== 'function')
        return null;

    const pieceElem = getSiteData('pieceElem', { boardQuerySelector, getAll });

    return pieceElem || null;
}

export function getSquareElems(element) {
    const squareElems = getSiteData('squareElems', { element });

    return squareElems || null;
}

export function getChessVariant() {
    const chessVariant = getSiteData('chessVariant');

    return chessVariant || null;
}

export function getPieceElemFen(pieceElem) {
    const pieceFen = getSiteData('pieceElemFen', { pieceElem });

    return pieceFen || null;
}

export function getPieceElemCoords(pieceElem) {
    const pieceCoords = getSiteData('pieceElemCoords', { pieceElem });

    return pieceCoords || null;
}

export function getBoardDimensions() {
    const boardDimensionArr = getSiteData('boardDimensions');

    if(boardDimensionArr) {
        return boardDimensionArr;
    } else {
        return [8, 8];
    }
}

export function isMutationNewMove(mutationArr) {
    const isNewMoveArr = getSiteData('isMutationNewMove', { mutationArr }); // [isNewMove, turn]

    return isNewMoveArr || false;
}

export function getMutationTurn(mutationArr) {
    const turn = getSiteData('getMutationTurn', { mutationArr });

    return turn || null;
}
