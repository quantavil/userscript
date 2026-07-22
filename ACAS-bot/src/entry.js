import './core/index.js';

import './adapters/chesscom.js';
import './adapters/lichess.js';
import './adapters/playstrategy.js';
import './adapters/pychess.js';
import './adapters/worldchess.js';
import './adapters/gameknot.js';
import './adapters/others.js';

import {
    setConfigValue,
    getElemCoordinatesFromLeftBottomPercentages,
    getFenPieceColor,
    getFenPieceOppositeColor,
    getCanvasPixelColor,
    canvasHasPixelAt,
    convertPieceStrToFen,
    wait
} from './core/index.js';

import {
    getSquareElems
} from './adapters/index.js';

const getBaseStyleModification = () => {};

// Prevent tree-shaking of original unused functions to maintain complete parity
if (typeof window !== 'undefined' && window.__acas_preserve) {
    console.log(
        setConfigValue,
        getElemCoordinatesFromLeftBottomPercentages,
        getFenPieceColor,
        getFenPieceOppositeColor,
        getCanvasPixelColor,
        canvasHasPixelAt,
        getSquareElems,
        getBaseStyleModification,
        convertPieceStrToFen,
        wait
    );
}
