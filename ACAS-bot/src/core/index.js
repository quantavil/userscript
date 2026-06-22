import { state } from '../state.js';

import {
    getBoardElem,
    getPieceElem,
    getSquareElems,
    getChessVariant,
    getPieceElemFen,
    getPieceElemCoords,
    getBoardDimensions,
    isMutationNewMove,
    getMutationTurn,
    getSiteData,
    supportedSites,
    addSupportedChessSite,
    resetCachedValues,
    getBoardOrientation,
    getBoardMatrix,
    isPawnPromotion,
    filterInvisibleElems,
    convertPieceStrToFen,
    getBoardPiece
} from '../adapters/index.js';

import {
    backendConfig,
    domain,
    pieceNameToFen,
    configKeys,
    getConfigValue,
    setConfigValue,
    setGmConfigValue,
    getGmConfigValue,
    debugModeActivated,
    runningOnDevPage,
    getUniqueID,
    commLinkInstanceID,
    instanceVars,
    config,
    runningOnBackend,
    isDevPage,
    getCurrentBackendURL,
    constructBackendURL,
    dbValues
} from '../utils/config.js';

import {
    activeAutomoves,
    makeMove,
    getPieceAmount
} from './autoMove.js';

import {
    lastBoardRanks,
    lastBoardFiles,
    lastBoardSize,
    lastPieceSize,
    chessBoardElem,
    setChessBoardElem,
    extractElemTransformData,
    getElemCoordinatesFromTransform,
    getElemCoordinatesFromLeftBottomPercentages,
    getElemCoordinatesFromLeftTopPixels,
    getBoardDimensionsFromSize,
    chessCoordinatesToIndex,
    chessCoordinatesToMatrixIndex,
    chessCoordinatesToDomIndex,
    indexToChessCoordinates,
    fenCoordArrToDomCoord
} from '../utils/coordinates.js';

import {
    BoardDrawer,
    setBoardDrawer,
    activeGuiMoveMarkings,
    activeMetricRenders,
    activeFeedback,
    getArrowStyle,
    clearMetricRenders,
    renderMetrics,
    clearFeedback,
    displayFeedback,
    maybeAnnounceMarkingsToPage,
    boardUtils,
    clearVisuals,
    getCanvasPixelColor,
    canvasHasPixelAt
} from '../drawing/drawing.js';

import {
    checkAndExposeSandbox
} from '../utils/sandbox.js';

import {
    createInputListener,
    applyAssistanceConcealment,
    toggleConcealAssistance
} from '../utils/input.js';

import {
    getFen,
    getPieceChangeAmount,
    getBoardSquareChangeAmount,
    getFenPieceColor,
    getFenPieceOppositeColor
} from '../utils/fen.js';

import {
    addMovesOnDemandListeners
} from '../utils/pathfinding.js';

import {
    setupCommLink
} from './comm.js';

// Parity Exports
export {
    backendConfig,
    domain,
    pieceNameToFen,
    configKeys,
    getConfigValue,
    setConfigValue,
    setGmConfigValue,
    getGmConfigValue,
    debugModeActivated,
    runningOnDevPage,
    getUniqueID,
    commLinkInstanceID,
    instanceVars,
    dbValues,
    isPawnPromotion,
    filterInvisibleElems,
    convertPieceStrToFen,
    getBoardOrientation,
    getBoardMatrix,
    getFenPieceColor,
    getFenPieceOppositeColor
};

export {
    lastPieceSize,
    extractElemTransformData,
    getElemCoordinatesFromTransform,
    getElemCoordinatesFromLeftBottomPercentages,
    getElemCoordinatesFromLeftTopPixels,
    getBoardDimensionsFromSize,
    chessCoordinatesToIndex,
    chessCoordinatesToMatrixIndex,
    indexToChessCoordinates,
    fenCoordArrToDomCoord
};

export {
    getCanvasPixelColor,
    canvasHasPixelAt,
    clearVisuals,
    boardUtils,
    renderMetrics,
    displayFeedback,
    clearFeedback,
    BoardDrawer,
    activeGuiMoveMarkings
};

// Register dynamic state providers immediately
state.getBoardDimensions = getBoardDimensions;
state.getPieceElem = getPieceElem;
state.getBoardOrientation = getBoardOrientation;

// Global initialization check logic runs immediately
checkAndExposeSandbox();

const blacklistedURLs = [
    constructBackendURL(backendConfig?.hosts?.prod),
    constructBackendURL(backendConfig?.hosts?.dev),
    'https://www.chess.com/play',
    'https://lichess.org/',
    'https://chess.org/',
    'https://papergames.io/en/chess',
    'https://playstrategy.org/',
    'https://www.pychess.org/',
    'https://www.coolmathgames.com/0-chess'
];

let boardObserver = null;
let dumbBoardObservingInterval = null;
let lastMutationObservationDate = 0;
let lastCalculatedFullFen = null;
let lastTurn = null;
let lastBoardOrientation = null;
let lastMutationObsProcessedTurn = null;
let isCheckingBackendReady = false;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function displayImportantNotification(title, text) {
    if(typeof GM_notification === 'function') {
        GM_notification({ title: title, text: text });
    } else {
        alert(`[${title}]` + '\n\n' + text);
    }
}

async function processBoardPosition(currentFullFen = getFen(), squareChangeAmount = 0) {
    lastCalculatedFullFen = currentFullFen;
    state.lastMoveRequestTime = Date.now();

    clearVisuals(true);

    boardUtils.setBoardDimensions(getBoardDimensions());

    if(!state.commLink) return;

    const didBoardOrientationChange = await checkBoardOrientationChange();

    if(didBoardOrientationChange || squareChangeAmount > 5) {
        resetCachedValues();

        state.matchFirstSuggestionGiven = false;

        state.commLink.commands.newMatchStarted();
    }

    state.commLink.commands.updateBoardFen(currentFullFen);
}

async function determineBoardPositionValidity(turn) {
    const currentFullFen = await getFen();
    const fenChanged = currentFullFen?.split(' ', 1)?.[0] !== lastCalculatedFullFen?.split(' ', 1)?.[0];

    const pieceAmountChange = getPieceChangeAmount(lastCalculatedFullFen, currentFullFen);
    const squareChangeAmount = getBoardSquareChangeAmount(lastCalculatedFullFen, currentFullFen);
    const pieceAmount = getPieceAmount();

    if(pieceAmount === 0) {
        lastCalculatedFullFen = null;

        await wait(100);

        return determineBoardPositionValidity(getBoardOrientation());
    }

    if(!fenChanged) return;

    if(turn) {
        if(lastTurn === turn) turn = getBoardOrientation();
        lastTurn = turn;

        instanceVars.turn.set(commLinkInstanceID, turn);
    }

    if(pieceAmountChange === -1) {
        if(squareChangeAmount === 1) {
            return;
        }
    }

    processBoardPosition(currentFullFen, squareChangeAmount);
}

function observeNewMoves() {
    if(boardObserver?.disconnect) boardObserver.disconnect();
    if(dumbBoardObservingInterval) clearInterval(dumbBoardObservingInterval);

    dumbBoardObservingInterval = setInterval(() => {
        if(state.isUserMouseDown) return;
        determineBoardPositionValidity(lastMutationObsProcessedTurn || getBoardOrientation());
    }, 250);

    boardObserver = new MutationObserver(mutationArr => {
        try {
            lastMutationObservationDate = Date.now();

            const mutationMoveArr = isMutationNewMove(mutationArr); // returns [isNewMove, turn]
            const isNewMove = mutationMoveArr?.[0];
            let turn = mutationMoveArr?.[1];

            if(turn) lastMutationObsProcessedTurn = turn;

            if(!isNewMove) return;

            determineBoardPositionValidity(turn);
        } catch(e) {
            if(debugModeActivated) console.error(e);
        }
    });

    boardObserver.observe(state.chessBoardElem, { childList: true, subtree: true, attributes: true });
}

async function checkBoardOrientationChange() {
    const boardOrientation = getBoardOrientation();

    const boardOrientationChanged = lastBoardOrientation !== boardOrientation;
    const boardOrientationDiffers = state.BoardDrawer && state.BoardDrawer?.orientation !== boardOrientation;

    if(boardOrientationChanged || boardOrientationDiffers) {
        lastBoardOrientation = boardOrientation;

        instanceVars.playerColor.set(commLinkInstanceID, boardOrientation);

        boardUtils.setBoardOrientation(boardOrientation);

        await state.commLink.commands.updateBoardOrientation(boardOrientation);
    }

    return boardOrientationChanged;
}

async function isAcasBackendReady() {
    const res = await state.commLink.commands.ping();

    return res ? true : false;
}

async function refreshSettings() {
    const config = GM_getValue(dbValues.AcasConfig);
    const profiles = config?.global?.profiles;

    if(typeof profiles != 'object') return;

    state.isMovesOnDemandActive = Object.keys(profiles).some(profileName =>
        profiles[profileName]?.movesOnDemand === true);
}

function isBoardDrawerNeeded() {
    const config = GM_getValue(dbValues.AcasConfig);

    const gP = config?.global?.profiles;
    const iP = config?.instance?.[commLinkInstanceID]?.profiles;

    const isGhost = config?.global?.[configKeys.isUserscriptGhost];
    if(isGhost) return false;

    const check = cfg => Object.values(cfg || {}).some(p =>
        p[configKeys.displayMovesOnExternalSite] ||
        p[configKeys.renderOnExternalSite] ||
        p[configKeys.feedbackOnExternalSite] ||
        p[configKeys.movesOnDemand]
    );

    if(gP && check(gP)) return true;
    if(iP && check(iP)) return true;

    return false;
}

async function start() {
    await state.commLink.commands.createInstance(commLinkInstanceID);

    const pathname = window.location.pathname;
    const boardOrientation = getBoardOrientation();

    instanceVars.playerColor.set(commLinkInstanceID, boardOrientation);
    instanceVars.fen.set(commLinkInstanceID, getFen());

    if(isBoardDrawerNeeded()) {
        if(state.BoardDrawer) state.BoardDrawer?.terminate();

        setBoardDrawer(new UniversalBoardDrawer(state.chessBoardElem, {
            'window': window,
            'boardDimensions': getBoardDimensions(),
            'playerColor': getBoardOrientation(),
            'zIndex': Math.floor(Math.random() * (99 - 10 + 1)) + 10,
            'prepend': true,
            'debugMode': debugModeActivated,
            'adjustSizeByDimensions': domain === 'chess.com' && pathname?.includes('/variants'),
            'adjustSizeConfig': {
                'noLeftAdjustment': true
            }
        }));

        const waitForBoardMatrix = setInterval(() => {
            if(state.lastBoardMatrix) {
                clearInterval(waitForBoardMatrix);

                addMovesOnDemandListeners();
            }
        }, 50);
    }

    await checkBoardOrientationChange();

    refreshSettings();
    observeNewMoves();

    state.commLink.setIntervalAsync(async () => {
        await state.commLink.commands.createInstance(commLinkInstanceID);
    }, 1000);

    createInputListener(
        'concealAssistance',
        await getGmConfigValue('concealAssistanceTriggerCode'),
        toggleConcealAssistance
    );

    createInputListener(
        'instanceRestart',
        await getGmConfigValue('instanceRestartTriggerCode'),
        () => { state.commLink.commands.forceInstanceRestart() }
    );
}

function startWhenBackendReady() {
    if(isCheckingBackendReady) return;
    isCheckingBackendReady = true;

    let timesUrlForceOpened = 0;
    let i = 0;

    const interval = state.commLink.setIntervalAsync(async () => {
        i++;

        if(await isAcasBackendReady()) {
            start();

            isCheckingBackendReady = false;
            interval.stop();
        } else if(timesUrlForceOpened === 0 && (i % 10 === 0)) {
            timesUrlForceOpened++;

            const config = GM_getValue(dbValues.AcasConfig);
            const isGhost = config?.global?.[configKeys.isUserscriptGhost];

            const lastForceOpen = GM_getValue('lastForceOpenTime') || 0;
            const now = Date.now();

            if(!isGhost && (now - lastForceOpen > 10000)) {
                GM_setValue('lastForceOpenTime', now);
                const url = getCurrentBackendURL();
                const finalUrl = url.endsWith('/') ? url + 'app/' : url + '/app/';
                GM_openInTab(finalUrl, true);
            }
        }
    }, 100);
}

function initializeIfSiteReady() {
    const boardElem = getBoardElem();
    const firstPieceElem = getPieceElem();

    const bothElemsExist = boardElem && firstPieceElem;
    const isChessComImageBoard = domain === 'chess.com' && boardElem?.className.includes('webgl-2d');
    const boardElemChanged = state.chessBoardElem != boardElem;

    if((bothElemsExist || isChessComImageBoard) && boardElemChanged) {
        setChessBoardElem(boardElem);

        state.chessBoardElem.addEventListener('mousedown', () => { state.isUserMouseDown = true; });
        state.chessBoardElem.addEventListener('mouseup', () => { state.isUserMouseDown = false; });
        state.chessBoardElem.addEventListener('touchstart', () => { state.isUserMouseDown = true; });
        state.chessBoardElem.addEventListener('touchend', () => { state.isUserMouseDown = false; });

        if(!blacklistedURLs.includes(window.location.href)) {
            startWhenBackendReady();
        }
    }
}

// Side effects execution check:
if (!(runningOnBackend && !isDevPage)) {
    Object.values(configKeys).forEach(key => {
        config[key] = {
            get:  profile => getGmConfigValue(key, commLinkInstanceID, profile),
            set:  (val, profile) => setGmConfigValue(key, val, commLinkInstanceID, profile)
        };
    });

    setupCommLink();

    if(typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('[o] Open GUI Manually', e => {
            const url = getCurrentBackendURL();
            const finalUrl = url.endsWith('/') ? url + 'app/' : url + '/app/';
            GM_openInTab(finalUrl, true);
        }, 'o');

        GM_registerMenuCommand('[s] Start Manually', e => {
            if(state.chessBoardElem) {
                start();
            } else {
                displayImportantNotification('Failed to start manually', 'No chessboard element found!');
            }
        }, 's');

        GM_registerMenuCommand('[g] Get Moves Manually', e => {
            if(state.chessBoardElem) {
                processBoardPosition();
            } else {
                displayImportantNotification('Failed to get moves', 'No chessboard element found!');
            }
        }, 'g');

        GM_registerMenuCommand('[r] Render BoardDrawer Manually', e => {
            if(typeof state.BoardDrawer?.updateDimensions === 'function') {
                state.BoardDrawer.updateDimensions();
            } else {
                displayImportantNotification('Failed to render BoardDrawer', 'BoardDrawer not initialized or something else went wrong!');
            }
        }, 'r');

        if(typeof GM_setClipboard === 'function') {
            GM_registerMenuCommand('[c] Copy FEN to Clipboard', e => {
                if(state.chessBoardElem) {
                    GM_setClipboard(getFen());
                } else {
                    displayImportantNotification('Failed to get FEN', 'No chessboard element found!');
                }
            }, 'c');
        }
    }

    setInterval(initializeIfSiteReady, 100);
    setInterval(refreshSettings, 2500);
}
