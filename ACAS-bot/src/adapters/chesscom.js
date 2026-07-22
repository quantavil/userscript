import { state } from '../state.js';
import {
    addSupportedChessSite,
    filterInvisibleElems,
    getBoardOrientation,
    getBoardElem,
    getMutationTurn,
    setResetCachedValues
} from './index.js';
import { getElemCoordinatesFromTransform } from '../utils/coordinates.js';

export let chesscomVariantPlayerColorsTable = null;

export function resetChesscomCachedValues() {
    chesscomVariantPlayerColorsTable = null;
}

setResetCachedValues(resetChesscomCachedValues);

export function updateChesscomVariantPlayerColorsTable() {
    let colors = [];

    document.querySelectorAll('*[data-color]').forEach(pieceElem => {
        const colorCode = Number(pieceElem?.dataset?.color);

        if(!colors?.includes(colorCode)) {
            colors.push(colorCode);
        }
    });

    if(colors?.length > 1) {
        colors = colors.sort((a, b) => a - b);

        chesscomVariantPlayerColorsTable = { [colors[0]]: 'w', [colors[1]]: 'b' };
    }
}

addSupportedChessSite('chess.com', {
    'boardElem': obj => {
        const pathname = obj.pathname;

        if(pathname?.includes('/variants')) {
            return document.querySelector('.TheBoard-layers');
        }

        return document.querySelector('#board-layout-chessboard > .board');
    },

    'pieceElem': obj => {
        const pathname = obj.pathname;
        const getAll = obj.getAll;

        if(pathname?.includes('/variants')) {
            const filteredPieceElems = filterInvisibleElems(
                document.querySelectorAll('.TheBoard-layers *[data-piece]')
            )
                .filter(elem => {
                    if(elem?.dataset?.piece?.toLowerCase() === 'x') return false;

                    return !elem.closest('[class*="captured-pieces"]');
                });

            return getAll ? filteredPieceElems : filteredPieceElems[0];
        }

        return obj.boardQuerySelector('.piece');
    },

    'squareElems': obj => {
        const pathname = obj.pathname;
        const element = obj.element;

        if(pathname?.includes('/variants')) {
            return [...element.querySelectorAll('.square')];
        }
    },

    'chessVariant': obj => {
        const pathname = obj.pathname;

        if(pathname?.includes('/variants')) {
            const variant = pathname.match(/variants\/([^\/]*)/)?.[1]
                .replaceAll('-chess', '')
                .replaceAll('-', '');

            const replacementTable = {
                'doubles-bughouse': 'bughouse',
                'paradigm-chess30': 'paradigm'
            };

            return replacementTable[variant] || variant;
        }
    },

    'boardOrientation': obj => {
        const pathname = obj.pathname;

        if(pathname?.includes('/variants')) {
            const playerNumberStr = document.querySelector('.playerbox-bottom [data-player]')?.dataset?.player;

            if(!playerNumberStr)
                return 'w';

            return playerNumberStr === '0' ? 'w' : 'b';
        }

        const boardElem = getBoardElem();

        return boardElem?.classList.contains('flipped') ? 'b' : 'w';
    },

    'pieceElemFen': obj => {
        const pathname = obj.pathname;
        const pieceElem = obj.pieceElem;

        let pieceColor = null;
        let pieceName = null;

        if(pathname?.includes('/variants')) {
            if(!chesscomVariantPlayerColorsTable) {
                updateChesscomVariantPlayerColorsTable();
            }

            pieceColor = chesscomVariantPlayerColorsTable?.[pieceElem?.dataset?.color];
            pieceName = pieceElem?.dataset?.piece;

            if(pieceName?.length > 1) {
                pieceName = pieceName[0];
            }
        } else {
            const pieceStr = [...pieceElem.classList].find(x => x.match(/^(b|w)[prnbqk]{1}$/));

            if(!pieceStr) return null;

            [pieceColor, pieceName] = pieceStr.split('');
        }

        return pieceColor == 'w' ? pieceName.toUpperCase() : pieceName.toLowerCase();
    },

    'pieceElemCoords': obj => {
        const pathname = obj.pathname;
        const pieceElem = obj.pieceElem;

        if(pathname?.includes('/variants')) {
            const coords = getElemCoordinatesFromTransform(pieceElem);

            return coords;
        }

        return pieceElem.classList.toString()
            ?.match(/square-(\d)(\d)/)
            ?.slice(1)
            ?.map(x => Number(x) - 1);
    },

    'boardDimensions': obj => {
        const pathname = obj.pathname;

        if(pathname?.includes('/variants')) {
            const squaresContainerElem = document.querySelector('.TheBoard-squares');

            let ranks = 0;
            let files = 0;

            [...squaresContainerElem.childNodes].forEach((x, i) => {
                const visibleChildElems = filterInvisibleElems([...x.childNodes]);

                if(visibleChildElems?.length > 0) {
                    ranks = ranks + 1;

                    if(visibleChildElems.length > files) {
                        files = visibleChildElems.length;
                    }
                }
            });

            return [ranks, files];
        } else {
            return [8, 8];
        }
    },

    'getMutationTurn': obj => {
        const mutationArr = obj.mutationArr;

        let blacks = 0;
        let whites = 0;

        mutationArr.forEach(mutation => {
            const classList = mutation.target?.classList;

            if(!classList) return;

            for(let i = 0; i < classList.length; i++) {
                const cls = classList[i];

                if(cls.match(/^(b|w)[prnbqk]{1}$/)) {
                    if(cls[0] === 'b') blacks = blacks + 1;
                    if(cls[0] === 'w') whites = whites + 1;
                }
            }
        });

        const turn = blacks > whites ? 'w' : 'b';

        return turn || null;
    },

    'isMutationNewMove': obj => {
        const pathname = obj.pathname;
        const mutationArr = obj.mutationArr;

        if(pathname?.includes('/variants')) {
            if(state.isUserMouseDown) return [false, null];
            return [true, getBoardOrientation()]; // allow everything, always make own turn
        }

        if(mutationArr.length === 1)
            return [false, null];

        const isPremove = mutationArr.filter(m => m?.target?.classList?.contains('highlight'))
            .map(x => x?.target?.style?.['background-color'])
            .find(x => x === 'rgb(244, 42, 50)') ? true : false;

        const isNewMove = mutationArr.length >= 3 && !isPremove;

        if(isNewMove) return [isNewMove, getMutationTurn(mutationArr)];
        return [isNewMove, null];
    }
});
