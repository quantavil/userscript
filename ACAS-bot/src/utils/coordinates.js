import { state } from '../state.js';

export let lastBoardRanks = null;
export let lastBoardFiles = null;
export let lastBoardSize = null;
export let lastPieceSize = null;
export let chessBoardElem = null;

export function setChessBoardElem(elem) {
    chessBoardElem = elem;
    state.chessBoardElem = elem;
}

function getElementSize(elem) {
    const rect = elem.getBoundingClientRect();

    if(rect.width !== 0 && rect.height !== 0) {
        return { width: rect.width, height: rect.height };
    }

    const computedStyle = window.getComputedStyle(elem);
    const width = parseFloat(computedStyle.width);
    const height = parseFloat(computedStyle.height);

    return { width, height };
}

export function extractElemTransformData(elem) {
    const computedStyle = window.getComputedStyle(elem);
    const transformMatrix = new DOMMatrix(computedStyle.transform);

    const x = transformMatrix.e;
    const y = transformMatrix.f;

    return [x, y];
}

export function getElemCoordinatesFromTransform(elem, config) {
    const onlyFlipX = config?.onlyFlipX;
    const onlyFlipY = config?.onlyFlipY;

    lastBoardSize = getElementSize(state.chessBoardElem);
    state.lastBoardSize = lastBoardSize;

    const [boardRanks, boardFiles] = state.getBoardDimensions();

    lastBoardRanks = boardRanks;
    lastBoardFiles = boardFiles;
    state.lastBoardRanks = boardRanks;
    state.lastBoardFiles = boardFiles;

    const boardOrientation = state.getBoardOrientation();

    let [x, y] = extractElemTransformData(elem);

    const boardDimensions = lastBoardSize;
    let squareDimensions = boardDimensions.width / lastBoardFiles;

    const normalizedX = Math.round(x / squareDimensions);
    const normalizedY = Math.round(y / squareDimensions);

    if(onlyFlipY || boardOrientation === 'w') {
        const flippedY = lastBoardRanks - normalizedY - 1;

        return [normalizedX, flippedY];
    } else {
        const flippedX = lastBoardFiles - normalizedX - 1;

        return [flippedX, normalizedY];
    }
}

export function getElemCoordinatesFromLeftBottomPercentages(elem) {
    if(!lastBoardRanks || !lastBoardFiles) {
        const [boardRanks, boardFiles] = state.getBoardDimensions();

        lastBoardRanks = boardRanks;
        lastBoardFiles = boardFiles;
        state.lastBoardRanks = boardRanks;
        state.lastBoardFiles = boardFiles;
    }

    const boardOrientation = state.getBoardOrientation();

    const leftPercentage = parseFloat(elem.style.left?.replace('%', ''));
    const bottomPercentage = parseFloat(elem.style.bottom?.replace('%', ''));

    const x = Math.max(Math.round(leftPercentage / (100 / lastBoardFiles)), 0);
    const y = Math.max(Math.round(bottomPercentage / (100 / lastBoardRanks)), 0);

    if (boardOrientation === 'w') {
        return [x, y];
    } else {
        const flippedX = lastBoardFiles - (x + 1);
        const flippedY = lastBoardRanks - (y + 1);

        return [flippedX, flippedY];
    }
}

export function getElemCoordinatesFromLeftTopPixels(elem) {
    const pieceSize = getElementSize(elem);

    lastPieceSize = pieceSize;
    state.lastPieceSize = pieceSize;

    const leftPixels = parseFloat(elem.style.left?.replace('px', ''));
    const topPixels = parseFloat(elem.style.top?.replace('px', ''));

    const x = Math.max(Math.round(leftPixels / pieceSize.width), 0);
    const y = Math.max(Math.round(topPixels / pieceSize.width), 0);

    const boardOrientation = state.getBoardOrientation();

    if (boardOrientation === 'w') {
        const flippedY = lastBoardRanks - (y + 1);

        return [x, flippedY];
    } else {
        const flippedX = lastBoardFiles - (x + 1);

        return [flippedX, y];
    }
}

export function getBoardDimensionsFromSize() {
    const boardDimensions = getElementSize(state.chessBoardElem);

    lastBoardSize = boardDimensions;
    state.lastBoardSize = boardDimensions;

    const boardWidth = boardDimensions?.width;
    const boardHeight = boardDimensions.height;

    const boardPiece = state.getPieceElem();

    if(boardPiece) {
        const pieceDimensions = getElementSize(boardPiece);

        lastPieceSize = pieceDimensions;
        state.lastPieceSize = pieceDimensions;

        const boardPieceWidth = pieceDimensions?.width;
        const boardPieceHeight = pieceDimensions?.height;

        const boardRanks = Math.floor(boardHeight / boardPieceHeight);
        const boardFiles = Math.floor(boardWidth / boardPieceWidth);

        const ranksInAllowedRange = 0 < boardRanks && boardRanks <= 69;
        const filesInAllowedRange = 0 < boardFiles && boardFiles <= 69;

        if(ranksInAllowedRange && filesInAllowedRange) {
            return [boardRanks, boardFiles];
        }
    }
}

export function chessCoordinatesToIndex(coord) {
    const x = coord.charCodeAt(0) - 97;
    let y = null;

    const lastHalf = coord.slice(1);

    if(lastHalf === ':') {
        y = 9;
    } else {
        y = Number(coord.slice(1)) - 1;
    }

    return [x, y];
}

export function chessCoordinatesToMatrixIndex(coord) {
    const [boardRanks, boardFiles] = state.getBoardDimensions();
    const indexArr = chessCoordinatesToIndex(coord);

    let x, y;

    y = boardFiles - (indexArr[1] + 1);
    x = indexArr[0];

    return [x, y];
}

export function chessCoordinatesToDomIndex(coord) {
    const [boardRanks, boardFiles] = state.getBoardDimensions();
    const indexArr = chessCoordinatesToIndex(coord);
    const boardOrientation = state.getBoardOrientation();

    let x, y;

    if(boardOrientation === 'w') {
        x = indexArr[0];
        y = boardFiles - (indexArr[1] + 1);
    } else {
        x = boardRanks - (indexArr[0] + 1);
        y = indexArr[1];
    }

    return [x, y];
}

export function indexToChessCoordinates(coord) {
    const [boardRanks, boardFiles] = state.getBoardDimensions();

    const [x, y] = coord;
    const file = String.fromCharCode('a'.charCodeAt(0) + x);

    let rank;

    rank = boardRanks - y;

    return `${file}${rank}`;
}

export function fenCoordArrToDomCoord(fenCoordArr) {
    const boardClientRect = state.chessBoardElem.getBoundingClientRect();

    const pieceElem = state.getPieceElem();
    const pieceDimensions = getElementSize(pieceElem);
    const pieceWidth = pieceDimensions?.width;
    const pieceHeight = pieceDimensions?.height;

    lastPieceSize = pieceDimensions;
    state.lastPieceSize = pieceDimensions;

    const [boardRanks, boardFiles] = state.getBoardDimensions();

    const centerCoordinates = fenCoordArr.map(coord => {
        const [x, y] = chessCoordinatesToDomIndex(coord);

        const centerX = boardClientRect.x + (x * pieceWidth) + (pieceWidth / 2);
        const centerY = boardClientRect.y + (y * pieceHeight) + (pieceHeight / 2);

        return [centerX, centerY];
    });

    return centerCoordinates;
}
