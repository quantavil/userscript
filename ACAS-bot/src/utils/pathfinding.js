import { state } from '../state.js';
import { indexToChessCoordinates } from './coordinates.js';

export const modListeners = [];
export const modDrawerListeners = [];
export const modLastEnteredSquare = { 'squareIndex': null, 'squareFen': null, 'pieceFen': null };

export function coordinatesFromMoves(board, piecePos, moves, isPieceWhite) {
    const result = [];

    for(let i = 0; i < moves.length; i++) {
        const x = piecePos[0] + moves[i][0];
        const y = piecePos[1] + moves[i][1];
        const square = board?.[y]?.[x];

        if(!square) continue;

        if(square === 1) {
            result.push([x, y]);
        } else {
            const squareIsWhite = square === square.toUpperCase();

            if(squareIsWhite !== isPieceWhite)
                result.push([x, y]);
        }
    }

    return result;
}

export function getPiecePaths(board, piecePos, pieceFen, isPieceWhite) {
    const [xPos, yPos] = piecePos;

    if(!pieceFen || typeof pieceFen !== 'string') return;

    const pieceType = pieceFen.toUpperCase();

    const boardHeight = board.length;
    const boardWidth = board[0]?.length || 0;
    const longerBoardSide = Math.max(boardWidth, boardHeight);
    const shorterBoardSide = Math.min(boardWidth, boardHeight);

    function cast(directions, length) {
        const moves = [];

        for(let direction of directions) {
            for(let i = 1; i < length; i++) {
                const x = xPos + direction[0] * i;
                const y = yPos + direction[1] * i;

                const square = board?.[y]?.[x];
                if(!square) break;

                if(square === 1) {
                    moves.push([x, y]);
                } else {
                    const squareIsWhite = square === square.toUpperCase();

                    if(squareIsWhite !== isPieceWhite) {
                        moves.push([x, y]);
                        break;
                    } else
                        break;
                }
            }
        }

        return moves;
    }

    function castDiagonal() {
        return cast(
            [
                [1, -1], [-1, -1], // top right, top left
                [1, 1], [-1, 1]    // bottom right, bottom left
            ],
            shorterBoardSide
        );
    }

    function castStraight() {
        return cast(
            [
                [0, -1], [0, 1], // top, bottom
                [-1, 0], [1, 0]  // left, right
            ],
            longerBoardSide
        );
    }

    if(pieceType === 'P') {
        const direction = isPieceWhite ? [[-1, -1], [1, -1], [0, -1], [0, -2]] : [[-1, 1], [1, 1], [0, 1], [0, 2]];
        return coordinatesFromMoves(board, piecePos, direction, isPieceWhite);
    }

    if(pieceType === 'N') {
        return coordinatesFromMoves(board, piecePos, [
            [-2, -1], [-2, 1], [2, -1], [2, 1],
            [-1, -2], [-1, 2], [1, -2], [1, 2]
        ], isPieceWhite);
    }

    if(pieceType === 'K') {
        return coordinatesFromMoves(board, piecePos, [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [1, 1], [-1, 1], [1, -1]
        ], isPieceWhite);
    }

    if(pieceType === 'B') return castDiagonal();
    if(pieceType === 'R') return castStraight();
    if(pieceType === 'Q') return [...castDiagonal(), ...castStraight()];

    return [0, 0];
}

export function addMovesOnDemandListeners() {
    let lastProcessedSquareFen = null;

    if(!state.BoardDrawer) return;

    function handle() {
        if((lastProcessedSquareFen !== modLastEnteredSquare.squareFen) || !modLastEnteredSquare.squareFen) {
            const lastIdx = modLastEnteredSquare.squareIndex;

            if(!modLastEnteredSquare.squareFen && lastIdx) {
                const lastPieceFen = modLastEnteredSquare.pieceFen;

                modLastEnteredSquare.squareFen = indexToChessCoordinates(lastIdx);
                modLastEnteredSquare.pieceFen = state.lastBoardMatrix?.[lastIdx?.[1]]?.[lastIdx?.[0]];

                if(lastPieceFen === 1) return;
            }

            lastProcessedSquareFen = modLastEnteredSquare.squareFen;

            const pieceFen = modLastEnteredSquare.pieceFen;
            const isPieceWhite = pieceFen >= 'A' && pieceFen <= 'Z';
            const isPlayerPiece = (state.lastBoardOrientation === 'w') === isPieceWhite;

            if(!pieceFen) return;

            const legalMovesArr = getPiecePaths(state.lastBoardMatrix, modLastEnteredSquare.squareIndex, pieceFen, isPieceWhite)
                ?.map(pathArr => lastProcessedSquareFen + indexToChessCoordinates(pathArr));

            if(legalMovesArr?.length > 0 && state.commLink)
                state.commLink.commands.calculateSpecificMoves({ 'moves': legalMovesArr, 'isOpponent': !isPlayerPiece });
        }
    }

    modListeners.forEach(({ type, handler }) => {
        document.removeEventListener(type, handler);
    }); modListeners.length = 0;

    modDrawerListeners.forEach(x => x?.remove());
    modDrawerListeners.length = 0;

    const mouseDownHandler = () => handle(true);
    const touchStartHandler = () => handle(true);

    [
        ['mousedown', mouseDownHandler],
        ['touchstart', touchStartHandler]
    ].forEach(([type, handler]) => {
        document.addEventListener(type, handler);
        modListeners.push({ type, handler });
    });

    for (let y = 0; y < state.lastBoardMatrix.length; y++)
        for (let x = 0; x < state.lastBoardMatrix[y].length; x++) {
            const squareFen = indexToChessCoordinates([x, y]);

            const squareListener = state.BoardDrawer.addSquareListener(squareFen, type => {
                if(!state.isMovesOnDemandActive) return;

                switch(type) {
                    case 'enter':
                        modLastEnteredSquare.pieceFen = state.lastBoardMatrix[y][x];
                        modLastEnteredSquare.squareFen = squareFen;
                        modLastEnteredSquare.squareIndex = [x, y];

                        break;
                }
            });

            modDrawerListeners.push(squareListener);
        }
}
