import { state } from '../state.js';
import {
    addSupportedChessSite,
    getBoardOrientation,
    getMutationTurn,
    convertPieceStrToFen
} from './index.js';
import { pieceNameToFen, backendConfig } from '../utils/config.js';
import {
    getElemCoordinatesFromTransform,
    chessCoordinatesToIndex,
    getElemCoordinatesFromLeftTopPixels
} from '../utils/coordinates.js';

// --- chess.org ---
addSupportedChessSite('chess.org', {
    'boardElem': obj => {
        return document.querySelector('.cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('piece:not(.ghost)');
    },

    'chessVariant': obj => {
        return 'chess';
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

        return getElemCoordinatesFromTransform(pieceElem);
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

        if(state.isUserMouseDown) {
            return [false, null];
        }

        return [true, getMutationTurn(mutationArr)];
    }
});

// --- chess.coolmathgames.com & coolmathgames.com/0-chess ---
addSupportedChessSite(['chess.coolmathgames.com', 'coolmathgames.com'], {
    'boardElem': obj => {
        return document.querySelector('cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('piece:not(.ghost)');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        return document.querySelector('.ranks.black') ? 'b' : 'w';
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

        if(state.isUserMouseDown) {
            return [false, null];
        }

        return [true, getMutationTurn(mutationArr)];
    }
});

// --- papergames.io ---
addSupportedChessSite('papergames.io', {
    'boardElem': obj => {
        return document.querySelector('.cm-chessboard');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('*[data-piece][data-square]');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        const boardElem = document.querySelector('.cm-chessboard');

        if(boardElem) {
            const coords = boardElem.querySelector('.coordinates');
            const firstRankText = coords ? [...coords.childNodes]?.[0]?.textContent : null;

            return firstRankText == 'h' ? 'b' : 'w';
        }
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        return convertPieceStrToFen(pieceElem?.dataset?.piece);
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        const key = pieceElem?.dataset?.square;

        if(key) {
            return chessCoordinatesToIndex(key);
        }
    },

    'boardDimensions': obj => {
        return [8, 8];
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        const playerColor = getBoardOrientation();

        return playerColor || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;

        const isNewMove = mutationArr.length >= 12;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});

// --- immortal.game ---
addSupportedChessSite('immortal.game', {
    'boardElem': obj => {
        return document.querySelector('div.pawn.relative, div.knight.relative, div.bishop.relative, div.rook.relative, div.queen.relative, div.king.relative')?.parentElement?.parentElement;
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('div.pawn.relative, div.knight.relative, div.bishop.relative, div.rook.relative, div.queen.relative, div.king.relative');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        const coordA = [...document.querySelectorAll('svg text[x]')]
            .find(elem => elem?.textContent == 'a');

        const coordAX = Number(coordA?.getAttribute('x')) || 10;

        return coordAX < 15 ? 'w' : 'b';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        const pieceColor = pieceElem?.classList?.contains('white') ? 'w' : 'b';
        const elemPieceName = [...pieceElem?.classList]?.find(className => Object.keys(pieceNameToFen).includes(className));

        if(pieceColor && elemPieceName) {
            const pieceName = pieceNameToFen[elemPieceName];

            return pieceColor === 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
        }
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        return getElemCoordinatesFromTransform(pieceElem?.parentElement);
    },

    'boardDimensions': obj => {
        return [8, 8];
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        const playerColor = getBoardOrientation();

        return playerColor || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;

        if(state.isUserMouseDown) {
            return [false, null];
        }

        const isNewMove = mutationArr.length >= 5;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});

// --- chess.net ---
addSupportedChessSite('chess.net', {
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

// --- freechess.club ---
addSupportedChessSite('freechess.club', {
    'boardElem': obj => {
        return document.querySelector('cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('piece:not(.ghost)');
    },

    'chessVariant': obj => {
        return 'chess';
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

// --- play.chessclub.com ---
addSupportedChessSite('play.chessclub.com', {
    'boardElem': obj => {
        return document.querySelector('[data-boardid]');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('[data-piece]');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        return document.querySelector('[data-square]')?.dataset?.square === 'a8'
            ? 'w' : 'b';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;
        const [pieceColor, pieceName] = (pieceElem?.dataset?.piece || 'wp');

        if(pieceColor && pieceName) {
            return pieceColor === 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
        }
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        const parentParent = pieceElem?.parentElement?.parentElement;

        if(parentParent) {
            return chessCoordinatesToIndex(parentParent?.dataset?.square);
        }
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

        const isNewMove = mutationArr.find(mutation => mutation?.type === 'childList')
            ? true : false;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});

// --- app.edchess.io ---
addSupportedChessSite('app.edchess.io', {
    'boardElem': obj => {
        return document.querySelector('*[data-boardid="chessboard"]');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('*[data-piece]');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        return document.querySelector('*[data-square]')?.dataset?.square == 'h1' ? 'b' : 'w';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;
        const [pieceColor, pieceName] = pieceElem?.dataset?.piece?.split('');

        return pieceColor === 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
    },

    'pieceElemCoords': obj => {
        const pieceElem = obj.pieceElem;

        return chessCoordinatesToIndex(pieceElem?.parentElement?.parentElement?.dataset?.square);
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

        const isNewMove = mutationArr.length >= 2;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});

// --- ACAS backend GUI page ---
addSupportedChessSite([
    backendConfig?.hosts?.prod || 'quantavil.github.io',
    backendConfig?.hosts?.dev || 'localhost'
], {
    'boardElem': obj => {
        return document.querySelector('cg-board');
    },

    'pieceElem': obj => {
        return obj.boardQuerySelector('piece:not(.ghost)');
    },

    'chessVariant': obj => {
        return 'chess';
    },

    'boardOrientation': obj => {
        const filesElem = document.querySelector('coords.side');

        return filesElem?.classList?.contains('black') ? 'b' : 'w';
    },

    'pieceElemFen': obj => {
        const pieceElem = obj.pieceElem;

        const pieceColor = pieceElem?.classList?.contains('white') ? 'w' : 'b';

        const elemPieceName = [...(pieceElem?.classList ?? [])]
          .map(cls => cls.replace('-piece', ''))
          .find(cls => Object.values(pieceNameToFen).includes(cls));

        if(pieceColor && elemPieceName) {
            return pieceColor == 'w' ? elemPieceName.toUpperCase() : elemPieceName.toLowerCase();
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

        const mutationContainsBlack = mutationArr
            .find(mutation => mutation.target?.classList?.contains('black'));

        const turn = mutationContainsBlack ? 'w' : 'b';

        return turn || null;
    },

    'isMutationNewMove': obj => {
        const mutationArr = obj.mutationArr;
        const isNewMove = mutationArr.length >= 2;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});
