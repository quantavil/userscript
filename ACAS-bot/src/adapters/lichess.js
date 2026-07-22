import {
    addSupportedChessSite,
    getMutationTurn
} from './index.js';
import { pieceNameToFen } from '../utils/config.js';
import { chessCoordinatesToIndex } from '../utils/coordinates.js';

addSupportedChessSite('lichess.org', {
    'boardElem': obj => {
        return document.querySelector('cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('piece:not(.ghost)');
    },

    'chessVariant': obj => {
        const variantLinkElem = document.querySelector('.variant-link');

        if(variantLinkElem) {
            let variant = variantLinkElem?.innerText?.toLowerCase()?.replaceAll(' ', '-');

            const replacementTable = {
                'correspondence': 'chess',
                'koth': 'kingofthehill',
                'three-check': '3check'
            };

            return replacementTable[variant] || variant;
        }
    },

    'boardOrientation': obj => {
        const filesElem = document.querySelector('coords.files');

        return filesElem?.classList?.contains('black') ? 'b' : 'w';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        const pieceColor = pieceElem?.classList?.contains('white') ? 'w' : 'b';
        const elemPieceName = [...pieceElem?.classList]?.find(className => Object.keys(pieceNameToFen).includes(className));

        if(pieceColor && elemPieceName) {
            const pieceName = pieceNameToFen[elemPieceName];

            return pieceColor == 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
        }
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        const key = pieceElem?.cgKey;

        if(key) {
            return chessCoordinatesToIndex(key);
        }
    },

    'boardDimensions': obj => {
        return [8, 8];
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        let blacks = 0;
        let whites = 0;

        mutationArr.forEach(mutation => {
            const classList = mutation.target?.classList;

            if(classList?.contains('black')) blacks += 1;
            if(classList?.contains('white')) whites += 1;
        });

        const turn = blacks > whites ? 'w' : 'b';

        return turn || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;

        const isNewMove = mutationArr.length >= 3;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});
