import {
    configKeys,
    getConfigValue,
    debugModeActivated,
    runningOnDevPage
} from '../utils/config.js';
import { state } from '../state.js';

export let BoardDrawer = null;
export let activeGuiMoveMarkings = [];
export let activeMetricRenders = [];
export let activeFeedback = [];

export function setBoardDrawer(val) {
    BoardDrawer = val;
    state.BoardDrawer = val;
}

const arrowDefaults = { best: ['limegreen', 0.9], secondary: ['dodgerblue', 0.7], opponent: ['crimson', 0.3] };

export function getArrowStyle(type, fill, opacity) {
    const [f, o] = arrowDefaults[type] || [];
    return `stroke: rgb(0 0 0 / 50%);\nstroke-width: 2px;\nstroke-linejoin: round;\nfill: ${fill || f};\nopacity: ${opacity || o};`;
}

export function clearMetricRenders() {
    state.activeMetricRenders.forEach(elem => {
        if(elem) elem.remove();
    });
    activeMetricRenders = [];
    state.activeMetricRenders = [];
}

export function renderMetrics(addedMetrics) {
    if(!state.BoardDrawer) return;

    clearMetricRenders();

    function processMetric(metric) {
        const data = metric?.data;

        if(!data) return;

        const shapeType = data?.shapeType;
        const shapeSquare = data?.shapeSquare;
        const shapeConfig = data?.shapeConfig;

        if(shapeType && shapeSquare && shapeConfig) {
            const shape = state.BoardDrawer.createShape(shapeType, shapeSquare, shapeConfig);

            state.activeMetricRenders.push(shape);
            activeMetricRenders.push(shape);
        }
    }

    function findMetricByType(type) {
        return addedMetrics.filter(metric => metric?.data?.shapeType === type) || [];
    }

    findMetricByType('text')
        .forEach(processMetric);

    findMetricByType('rectangle')
        .forEach(processMetric);
}

export function clearFeedback() {
    state.activeFeedback.forEach(elem => {
        if(elem) elem.remove();
    });
    activeFeedback = [];
    state.activeFeedback = [];
}

export function displayFeedback(addedFeedback) {
    if(!state.BoardDrawer) return;

    clearFeedback();

    function processFeedback(feedback) {
        const data = feedback?.data;

        if(!data) return;

        const shapeType = data?.shapeType;
        const shapeSquare = data?.shapeSquare;
        const shapeConfig = data?.shapeConfig;

        if(shapeType && shapeSquare && shapeConfig) {
            const shape = state.BoardDrawer.createShape(shapeType, shapeSquare, shapeConfig);

            state.activeFeedback.push(shape);
            activeFeedback.push(shape);
        }
    }

    addedFeedback.forEach(processFeedback);
}

export function maybeAnnounceMarkingsToPage(moveMarkings) {
    if(!runningOnDevPage || typeof unsafeWindow === 'undefined') return;

    const markings = moveMarkings || [];

    let selectedMarking = null;

    if(markings.length === 1) {
        selectedMarking = markings[0].player;
    } else if (markings.length > 1) {
        const randomIndex = Math.floor(Math.random() * markings.length);
        selectedMarking = markings[randomIndex].player;
    }

    unsafeWindow.postMessage({ name: 'bestMoveArr', value: selectedMarking });
}

export const boardUtils = {
    markMoves: moveObjArr => {
        if(!state.BoardDrawer) return;

        const maxScale = 1;
        const minScale = 0.5;
        const totalRanks = moveObjArr.length;

        function fillSquare(square, style) {
            const shapeType = 'rectangle';
            const shapeConfig = { style };

            const rect = state.BoardDrawer.createShape(shapeType, square, shapeConfig);

            return rect;
        }

        const markedSquares = { 0: [], 1: [] };

        moveObjArr.forEach((markingObj, idx) => {
            const profile = markingObj.profile;

            const [from, to] = markingObj.player;
            const [oppFrom, oppTo] = markingObj.opponent;
            const oppMovesExist = oppFrom && oppTo;
            const rank = idx + 1;
            const cp = markingObj?.cp;

            const showOpponentMoveGuess = getConfigValue(configKeys.showOpponentMoveGuess, profile);
            const showOpponentMoveGuessConstantly = getConfigValue(configKeys.showOpponentMoveGuessConstantly, profile);
            const arrowOpacity = getConfigValue(configKeys.arrowOpacity, profile) / 100;
            const primaryArrowColorHex = getConfigValue(configKeys.primaryArrowColorHex, profile);
            const secondaryArrowColorHex = getConfigValue(configKeys.secondaryArrowColorHex, profile);
            const opponentArrowColorHex = getConfigValue(configKeys.opponentArrowColorHex, profile);
            const moveAsFilledSquares = getConfigValue(configKeys.moveAsFilledSquares, profile);
            const onlySuggestPieces = getConfigValue(configKeys.onlySuggestPieces, profile);
            const movesOnDemand = getConfigValue(configKeys.movesOnDemand, profile);

            if(onlySuggestPieces && !movesOnDemand) {
                const fillType = idx === 0 ? 1 : 0,
                      fillColor = fillType ? primaryArrowColorHex : secondaryArrowColorHex;

                const fromSquareMarking = fillSquare(from, `opacity: ${arrowOpacity}; stroke-width: 5; stroke: black; rx: 2; ry: 2; fill: ${fillColor};`);
                let markedSquareElems = [fromSquareMarking];

                if(oppFrom) {
                    const oppFromSquareMarking = fillSquare(oppFrom, `opacity: ${arrowOpacity}; stroke-width: 5; stroke: black; rx: 2; ry: 2; display: none; fill: ${opponentArrowColorHex};`);

                    const squareListener = state.BoardDrawer.addSquareListener(from, type => {
                        if(!oppFromSquareMarking) squareListener.remove();

                        switch(type) {
                            case 'enter':
                                oppFromSquareMarking.style.display = 'inherit';
                                break;
                            case 'leave':
                                oppFromSquareMarking.style.display = 'none';
                                break;
                        }
                    });

                    markedSquareElems.push(oppFromSquareMarking);
                }

                activeGuiMoveMarkings.push(
                    { 'otherElems': markedSquareElems, profile }
                );
                state.activeGuiMoveMarkings.push(
                    { 'otherElems': markedSquareElems, profile }
                );

            } else if(moveAsFilledSquares) {
                const fillType = idx === 0 ? 1 : 0,
                      fillColor = fillType ? primaryArrowColorHex : secondaryArrowColorHex,
                      styling = `opacity: ${arrowOpacity}; stroke-width: 5; stroke: black; rx: 2; ry: 2; fill: ${fillColor};`,
                      skipFromSquare = markedSquares[fillType].find(x => x === from) ? 'opacity: 0;' : '',
                      skipToSquare = markedSquares[fillType].find(x => x === to) ? 'opacity: 0;' : '';

                const fromSquareStyle = `${styling} ${skipFromSquare}`;
                const toSquareStyle = `filter: brightness(1.5); stroke-dasharray: 4 4; ${styling} ${skipToSquare}`;

                const fromSquareFill = fillSquare(from, fromSquareStyle);
                const toSquareFill = fillSquare(to, toSquareStyle);

                const markedSquareFens = [from, to];
                const markedSquareElems = [fromSquareFill, toSquareFill];

                if(oppMovesExist && showOpponentMoveGuess) {
                    const oppFromSquareFill = fillSquare(oppFrom, fromSquareStyle + ` fill: ${opponentArrowColorHex};`);
                    const oppToSquareFill = fillSquare(oppTo, toSquareStyle + ` fill: ${opponentArrowColorHex};`);

                    markedSquareElems.push(oppFromSquareFill, oppToSquareFill);

                    if(showOpponentMoveGuessConstantly) {
                        oppFromSquareFill.style.display = 'block';
                        oppToSquareFill.style.display = 'block';
                    } else {
                        oppFromSquareFill.style.display = 'none';
                        oppToSquareFill.style.display = 'none';

                        const squareListener = state.BoardDrawer.addSquareListener(from, type => {
                            if(!oppFromSquareFill || !oppToSquareFill) {
                                squareListener.remove();
                            }

                            switch(type) {
                                case 'enter':
                                    oppFromSquareFill.style.display = 'inherit';
                                    oppToSquareFill.style.display = 'inherit';
                                    break;
                                case 'leave':
                                    oppFromSquareFill.style.display = 'none';
                                    oppToSquareFill.style.display = 'none';
                                    break;
                            }
                        });
                    }
                }

                markedSquares[fillType].push(...markedSquareFens);
                activeGuiMoveMarkings.push(
                    { 'otherElems': markedSquareElems, profile }
                );
                state.activeGuiMoveMarkings.push(
                    { 'otherElems': markedSquareElems, profile }
                );

            } else {
                let playerArrowElem = null;
                let oppArrowElem = null;
                let arrowStyle = getArrowStyle('best', primaryArrowColorHex, arrowOpacity);
                let lineWidth = 30;
                let arrowheadWidth = 80;
                let arrowheadHeight = 60;
                let startOffset = 30;

                if(idx !== 0) {
                    arrowStyle = getArrowStyle('secondary', secondaryArrowColorHex, arrowOpacity);

                    const arrowScale = totalRanks === 2
                        ? 0.75
                        : maxScale - (maxScale - minScale) * ((rank - 1) / (totalRanks - 1));

                    lineWidth = lineWidth * arrowScale;
                    arrowheadWidth = arrowheadWidth * arrowScale;
                    arrowheadHeight = arrowheadHeight * arrowScale;
                    startOffset = startOffset;
                }

                playerArrowElem = state.BoardDrawer.createShape('arrow', [from, to],
                    {
                        style: arrowStyle,
                        lineWidth, arrowheadWidth, arrowheadHeight, startOffset
                    }
                );

                if(oppMovesExist && showOpponentMoveGuess) {
                    oppArrowElem = state.BoardDrawer.createShape('arrow', [oppFrom, oppTo],
                        {
                            style: getArrowStyle('opponent', opponentArrowColorHex, arrowOpacity),
                            lineWidth, arrowheadWidth, arrowheadHeight, startOffset
                        }
                    );

                    if(showOpponentMoveGuessConstantly) {
                        oppArrowElem.style.display = 'block';
                    } else {
                        oppArrowElem.style.display = 'none';

                        const squareListener = state.BoardDrawer.addSquareListener(from, type => {
                            if(!oppArrowElem) {
                                squareListener.remove();
                            }

                            switch(type) {
                                case 'enter':
                                    oppArrowElem.style.display = 'inherit';
                                    break;
                                case 'leave':
                                    oppArrowElem.style.display = 'none';
                                    break;
                            }
                        });
                    }
                }

                if(idx === 0 && playerArrowElem) {
                    const parentElem = playerArrowElem.parentElement;

                    // move best arrow element on top (multiple same moves can hide the best move)
                    parentElem.appendChild(playerArrowElem);

                    if(oppArrowElem) {
                        parentElem.appendChild(oppArrowElem);
                    }
                }

                activeGuiMoveMarkings.push(
                    { ...markingObj, playerArrowElem, oppArrowElem, profile }
                );
                state.activeGuiMoveMarkings.push(
                    { ...markingObj, playerArrowElem, oppArrowElem, profile }
                );
            }
        });

        maybeAnnounceMarkingsToPage(moveObjArr);
    },
    removeMarkings: profile => {
        let removalArr = activeGuiMoveMarkings;

        if(profile) {
            removalArr = removalArr.filter(obj => obj.profile === profile);

            activeGuiMoveMarkings =  activeGuiMoveMarkings.filter(obj => obj.profile !== profile);
            state.activeGuiMoveMarkings = state.activeGuiMoveMarkings.filter(obj => obj.profile !== profile);
        } else {
            activeGuiMoveMarkings = [];
            state.activeGuiMoveMarkings = [];
        }

        removalArr.forEach(markingObj => {
            markingObj.oppArrowElem?.remove();
            markingObj.playerArrowElem?.remove();
            markingObj?.otherElems?.forEach(x => x?.remove());
        });
    },
    setBoardOrientation: orientation => {
        if(state.BoardDrawer) {
            if(debugModeActivated) console.warn('setBoardOrientation', orientation);

            state.BoardDrawer.setOrientation(orientation);
        }
    },
    setBoardDimensions: dimensionArr => {
        if(state.BoardDrawer) {
            if(debugModeActivated) console.warn('setBoardDimensions', dimensionArr);

            state.BoardDrawer.setBoardDimensions(dimensionArr);
        }
    }
};

export function clearVisuals(noMetricsRemoval = false) {
    if(!noMetricsRemoval) clearMetricRenders();
    clearFeedback();
    boardUtils.removeMarkings();
}

export function getCanvasPixelColor(canvas, [xPercentage, yPercentage], debug) {
    const ctx = canvas.getContext('2d');

    const x = xPercentage * canvas.width;
    const y = yPercentage * canvas.height;

    const imageData = ctx.getImageData(x, y, 1, 1);
    const pixel = imageData.data;
    const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;

    if(debug) {
        const clonedCanvas = document.createElement('canvas');
                clonedCanvas.width = canvas.width;
                clonedCanvas.height = canvas.height;

        const clonedCtx = clonedCanvas.getContext('2d');
                clonedCtx.drawImage(canvas, 0, 0);

        clonedCtx.fillStyle = 'red';
        clonedCtx.beginPath();
        clonedCtx.arc(x, y, 1, 0, Math.PI * 2);
        clonedCtx.fill();

        const dataURL = clonedCanvas.toDataURL();
    }

    return brightness < 128 ? 'b' : 'w';
}

export function canvasHasPixelAt(canvas, [xPercentage, yPercentage], debug) {
    xPercentage = Math.min(Math.max(xPercentage, 0), 100);
    yPercentage = Math.min(Math.max(yPercentage, 0), 100);

    const ctx = canvas.getContext('2d');
    const x = xPercentage * canvas.width;
    const y = yPercentage * canvas.height;

    const imageData = ctx.getImageData(x, y, 1, 1);
    const pixel = imageData.data;

    if(debug) {
        const clonedCanvas = document.createElement('canvas');
                clonedCanvas.width = canvas.width;
                clonedCanvas.height = canvas.height;

        const clonedCtx = clonedCanvas.getContext('2d');
                clonedCtx.drawImage(canvas, 0, 0);

        clonedCtx.fillStyle = 'red';
        clonedCtx.beginPath();
        clonedCtx.arc(x, y, 1, 0, Math.PI * 2);
        clonedCtx.fill();

        const dataURL = clonedCanvas.toDataURL();
    }

    return pixel[3] !== 0;
}
