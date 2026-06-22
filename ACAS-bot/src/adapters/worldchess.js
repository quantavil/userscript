import { state } from '../state.js';
import {
    addSupportedChessSite,
    getMutationTurn
} from './index.js';
import { getElemCoordinatesFromTransform } from '../utils/coordinates.js';

addSupportedChessSite('worldchess.com', {
    'boardElem': obj => {
        return document.querySelector('*[data-component="GameBoard"] cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('cg-piece:not(*[style*="visibility: hidden;"])');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        const titlesElem = document.querySelector('cg-titles');

        return titlesElem?.classList?.contains('rotated') ? 'b' : 'w';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        const pieceColor = pieceElem?.className?.[0];
        const elemPieceName = pieceElem?.className?.[1];

        if(pieceColor && elemPieceName) {
            const pieceName = elemPieceName;

            return pieceColor === 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
        }
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        return getElemCoordinatesFromTransform(pieceElem, { 'onlyFlipY': true });
    },

    'boardDimensions': obj => {
        return [8, 8];
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        let blacks = 0;
        let whites = 0;

        mutationArr.forEach(mutation => {
            const classList = mutation?.target?.classList;

            for(let i = 0; i < classList.length; i++) {
                const cls = classList[i];

                if(cls.length === 2) {
                    const prefix = cls[0];

                    if(prefix === 'b') blacks++;
                    else if(prefix === 'w') whites++;
                }
            }
        });

        const turn = blacks > whites ? 'w' : 'b';

        return turn || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;

        if(state.isUserMouseDown) {
            return false;
        }

        const isNewMove = mutationArr.find(m => m?.attributeName === 'style') ? true : false;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});
