import {
    addSupportedChessSite,
    getBoardOrientation,
    getMutationTurn
} from './index.js';
import { getElemCoordinatesFromLeftTopPixels } from '../utils/coordinates.js';

addSupportedChessSite('gameknot.com', {
    'boardElem': obj => {
        return document.querySelector('#chess-board-acboard');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('*[class*="chess-board-piece"] > img[src*="chess56."][style*="visible"]');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        return document.querySelector('#chess-board-my-side-color .player_white') ? 'w' : 'b';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        const left = Number(pieceElem.style.left.replace('px', ''));
        const top = Number(pieceElem.style.top.replace('px', ''));

        const pieceColor = left >= 0 ? 'w' : 'b';
        const pieceName = 'kqrnbp'[(top * -1) / 60];

        return pieceColor === 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        return getElemCoordinatesFromLeftTopPixels(pieceElem.parentElement);
    },

    'boardDimensions': obj => {
        return [8, 8];
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        return getBoardOrientation() || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;

        const isNewMove = mutationArr.some(m => m.type === 'childList')
            || mutationArr.some(m => m?.target?.classList?.contains('last-move'));

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});
