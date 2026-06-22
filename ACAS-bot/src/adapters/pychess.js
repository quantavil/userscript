import {
    addSupportedChessSite,
    getBoardOrientation,
    getMutationTurn
} from './index.js';
import { chessCoordinatesToIndex, getBoardDimensionsFromSize } from '../utils/coordinates.js';

addSupportedChessSite('pychess.org', {
    'boardElem': obj => {
        return document.querySelector('cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('piece[class*="-piece"]:not(.ghost)');
    },

    'chessVariant': obj => {
        const variantLinkElem = document.querySelector('#main-wrap .tc .user-link');

        if(variantLinkElem) {
            let variant = variantLinkElem?.innerText
                ?.toLowerCase()
                ?.replaceAll(' ', '')
                ?.replaceAll('-', '');

            const replacementTable = {
                'correspondence': 'chess',
                'koth': 'kingofthehill',
                'nocastling': 'nocastle',
                'gorogoro+': 'gorogoro',
                'oukchaktrang': 'cambodian'
            };

            return replacementTable[variant] || variant;
        }
    },

    'boardOrientation': obj => {
        const cgWrapElem = document.querySelector('.cg-wrap');

        return cgWrapElem.classList?.contains('orientation-black') ? 'b' : 'w';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        const playerColor = getBoardOrientation();
        const pieceColor = pieceElem?.classList?.contains('ally') ? playerColor : (playerColor == 'w' ? 'b' : 'w');

        let pieceName = null;

        [...pieceElem?.classList]?.forEach(className => {
            if(className?.includes('-piece')) {
                const elemPieceName = className?.split('-piece')?.[0];

                if(elemPieceName && elemPieceName?.length === 1) {
                    pieceName = elemPieceName;
                }
            }
        });

        if(pieceColor && pieceName) {
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
        return getBoardDimensionsFromSize();
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        let ally = 0;
        let enemy = 0;

        const boardOrientation = getBoardOrientation();
        const isPlayerWhite = boardOrientation === 'w';

        mutationArr.forEach(mutation => {
            const classList = mutation.target?.classList;

            if(classList?.contains('ally')) ally += 1;
            if(classList?.contains('enemy')) enemy += 1;
        });

        const turn = isPlayerWhite
          ? ally > enemy ? 'b' : 'w'
          : ally > enemy ? 'w' : 'b';

        return turn || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;

        const isNewMove = mutationArr.length >= 4
            || mutationArr.some(m => m.type === 'childList')
            || mutationArr.some(m => m?.target?.classList?.contains('last-move'));

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});
