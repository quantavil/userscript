import { commLinkInstanceID, instanceVars } from './utils/config.js';

export const state = {
    isUserMouseDown: false,
    lastMoveRequestTime: 0,
    activeAutomoves: [],
    chessBoardElem: null,
    BoardDrawer: null,
    activeGuiMoveMarkings: [],
    activeMetricRenders: [],
    activeFeedback: [],
    lastPieceSize: null,
    lastBoardSize: null,
    lastBoardRanks: null,
    lastBoardFiles: null,
    lastBoardMatrix: null,
    isMovesOnDemandActive: false,
    matchFirstSuggestionGiven: false,
    commLink: null,
    lastCalculatedFullFen: null,
    moveRetryCount: 0,

    // Dynamic providers to avoid circular dependencies
    getBoardDimensions: () => [8, 8],
    getPieceElem: () => null,
    getBoardOrientation: () => 'w',
};
