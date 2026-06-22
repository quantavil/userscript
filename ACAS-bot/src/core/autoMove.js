import { domain, getConfigValue, configKeys, getUniqueID, debugModeActivated } from '../utils/config.js';
import { getPieceElem, getBoardMatrix, isPawnPromotion } from '../adapters/index.js';
import { state } from '../state.js';
import { getFen } from '../utils/fen.js';
import {
    chessCoordinatesToMatrixIndex,
    fenCoordArrToDomCoord,
    indexToChessCoordinates
} from '../utils/coordinates.js';

export let activeAutomoves = [];

function getRandomOwnPieceDomCoord(fenCoord, boardMatrix) {
    let [x, y] = chessCoordinatesToMatrixIndex(fenCoord);

    const pieceAtFenCoord = boardMatrix[y][x];

    if(pieceAtFenCoord === 1) {
        return null;
    }

    const isWhitePiece = pieceAtFenCoord === pieceAtFenCoord.toUpperCase();

    const getDistance = (row1, col1, row2, col2) => {
        return Math.abs(row1 - row2) + Math.abs(col1 - col2);
    };

    let candidatePieces = [];

    for(let row = 0; row < boardMatrix.length; row++) {
        for(let col = 0; col < boardMatrix[row].length; col++) {
            const currentPiece = boardMatrix[row][col];

            if(currentPiece === 1 || (isWhitePiece && currentPiece === currentPiece.toLowerCase()) || (!isWhitePiece && currentPiece === currentPiece.toUpperCase())) {
                continue;
            }

            const distance = getDistance(y, x, row, col);

            if(distance < 6) {
                candidatePieces.push({ distance, coord: [col, row], piece: currentPiece });
            }
        }
    }

    if (candidatePieces.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidatePieces.length);
        const chosenPiece = candidatePieces[randomIndex];

        return fenCoordArrToDomCoord([indexToChessCoordinates(chosenPiece.coord)])[0];
    }

    return null;
}

export function getPieceAmount() {
    return getPieceElem(true)?.length ?? 0;
}

export class AutomaticMove {
    constructor(profile, fenMoveArr, isLegit, callback) {
        this.id = getUniqueID();

        activeAutomoves.push({ 'id': this.id, 'move': this });
        state.activeAutomoves.push({ 'id': this.id, 'move': this });

        this.profile = profile;
        this.fenMoveArr = fenMoveArr;
        this.isLegit = isLegit;

        this.active = true;
        this.isPromotingPawn = false;

        this.onFinished = function(...args) {
            activeAutomoves = activeAutomoves.filter(x => x.id !== this.id);
            state.activeAutomoves = state.activeAutomoves.filter(x => x.id !== this.id);

            this.active = false;

            callback(...args);

            if (args[0]) {
                const startingFen = state.lastCalculatedFullFen;
                setTimeout(() => {
                    const checkRetry = () => {
                        if (state.isUserMouseDown) {
                            // User is holding or dragging a piece; wait and check again later
                            setTimeout(checkRetry, 100);
                            return;
                        }
                        if (state.lastCalculatedFullFen === startingFen) {
                            if (state.moveRetryCount < 3) {
                                state.moveRetryCount++;
                                if (debugModeActivated) console.warn(`Move failed to execute. Retry attempt ${state.moveRetryCount}/3...`);
                                if (state.processBoardPosition) {
                                    state.processBoardPosition(getFen());
                                }
                            } else {
                                if (debugModeActivated) console.warn("Move failed 3 times. Giving up to prevent infinite loops.");
                            }
                        }
                    };
                    checkRetry();
                }, 1500);
            }
        };

        this.moveDomCoords = fenCoordArrToDomCoord(fenMoveArr);
        this.isPromotion = isPawnPromotion(fenMoveArr);

        if(this.isLegit) {
            const legitModeType = getConfigValue(configKeys.legitModeType, this.profile) ?? 'casual';

            const pieceRanges = [
                { minPieces: 30, maxPieces: Infinity }, // Opening (60+ pieces)
                { minPieces: 23, maxPieces: 29 },       // Early Middlegame (48 to 64 pieces)
                { minPieces: 16, maxPieces: 22 },       // Mid Middlegame (32 to 48 pieces)
                { minPieces: 10, maxPieces: 15 },       // Late Middlegame (16 to 32 pieces)
                { minPieces: 6, maxPieces: 9 },         // Endgame (8 to 16 pieces)
                { minPieces: 3, maxPieces: 5 },         // Very Endgame (2 to 8 pieces)
                { minPieces: 1, maxPieces: 2 },         // Extremely Few Pieces (1 piece)
            ];

            const timeRanges = {
                beginner: [
                    [2000, 4000],
                    [3000, 15000],
                    [5000, 25000],
                    [4000, 30000],
                    [3000, 15000],
                    [2000, 10000],
                    [1000, 4000],
                ],
                casual: [
                    [900, 3000],    // Opening
                    [1000, 15000],  // Early Middlegame
                    [3000, 20000],  // Mid Middlegame
                    [2000, 13000],  // Late Middlegame
                    [1500, 10000],  // Endgame
                    [1000, 9000],   // Very Endgame
                    [500, 3000],    // Extremely Few Pieces
                ],
                intermediate: [
                    [750, 2000],
                    [1000, 10000],
                    [2000, 15000],
                    [1500, 12000],
                    [1000, 8000],
                    [750, 7000],
                    [500, 2000],
                ],
                advanced: [
                    [500, 1500],
                    [1000, 8000],
                    [750, 8000],
                    [750, 12000],
                    [750, 5000],
                    [750, 3000],
                    [500, 1200],
                ],
                master: [
                    [333, 999],
                    [400, 2000],
                    [400, 3000],
                    [400, 2500],
                    [400, 2000],
                    [400, 1500],
                    [333, 750],
                ],
                professional: [
                    [333, 666],
                    [333, 666],
                    [333, 1000],
                    [333, 1500],
                    [333, 1000],
                    [333, 666],
                    [333, 666],
                ],
                god: [
                    [50, 333],
                    [50, 233],
                    [50, 300],
                    [50, 250],
                    [50, 200],
                    [50, 150],
                    [50, 100],
                ]
            };

            this.timeRanges = pieceRanges.map((range, index) => ({
                ...range,
                timeRange: timeRanges[legitModeType][index],
            }));

            this.shouldHesitate = this.isLegit && Math.random() < 0.15;
            this.shouldHesitateTwice = this.isLegit && Math.random() < 0.25;
            this.hesitationTypeOne = this.isLegit && Math.random() < 0.35;

            const legitTotalMoveTime = this.calculateMoveTime(getPieceAmount());
            const elapsedMoveTime = (Date.now() - state.lastMoveRequestTime);
            const remainingTime = Math.max(legitTotalMoveTime - elapsedMoveTime, 500);

            const delays = this.generateDelaysForDesiredTime(remainingTime);

            for(const key of Object.keys(delays)) {
                this[key] = delays[key];
            }
        }

        this.start();
    }

    generateDelaysForDesiredTime(desiredTotalTime) {
        const PROMOTION_DELAY = this.getRandomIntegerBetween(1000, 1111);

        if(desiredTotalTime > 6000) {
            const timelines = [
                { move: .4, to: .2, hesitation: .15, hesitationResolve: .15, secondHesitationResolve: .15 },
                { move: .1, to: .3, hesitation: .25, hesitationResolve: .15, secondHesitationResolve: .2 },
                { move: .2, to: .25, hesitation: .2, hesitationResolve: .2, secondHesitationResolve: .15 }
            ];

            const timeline = timelines[Math.floor(Math.random() * timelines.length)];

            return {
                promotionDelay: PROMOTION_DELAY,
                moveDelay: desiredTotalTime * timeline.move,
                toSquareSelectDelay: desiredTotalTime * timeline.to,
                hesitationDelay: desiredTotalTime * timeline.hesitation,
                hesitationResolveDelay: desiredTotalTime * timeline.hesitationResolve,
                secondHesitationResolveDelay: desiredTotalTime * timeline.secondHesitationResolve
            };
        }
        if(desiredTotalTime > 3000) {
            const timelines = [
                { move: .3, to: .2, hesitation: .25, hesitationResolve: .25 },
                { move: .1, to: .3, hesitation: .45, hesitationResolve: .15 },
                { move: .2, to: .25, hesitation: .2, hesitationResolve: .35 }
            ];

            const timeline = timelines[Math.floor(Math.random() * timelines.length)];

            return {
                promotionDelay: PROMOTION_DELAY,
                moveDelay: desiredTotalTime * timeline.move,
                toSquareSelectDelay: desiredTotalTime * timeline.to,
                hesitationDelay: desiredTotalTime * timeline.hesitation,
                hesitationResolveDelay: desiredTotalTime * timeline.hesitationResolve,
                secondHesitationResolveDelay: -1
            };
        }
        else {
            const timelines = [
                { move: .9, to: .1 },
                { move: .45, to: .55 },
                { move: .6, to: .4 },
                { move: .4, to: .6 },
                { move: .1, to: .9 }
            ];

            const timeline = timelines[Math.floor(Math.random() * timelines.length)];

            return {
                promotionDelay: PROMOTION_DELAY,
                moveDelay: desiredTotalTime * timeline.move,
                toSquareSelectDelay: desiredTotalTime * timeline.to,
                hesitationDelay: -1, hesitationResolveDelay: -1, secondHesitationResolveDelay: -1
            };
        }
    }

    calculateMoveTime(pieceCount) {
        for(let range of this.timeRanges) {
            if(pieceCount >= range.minPieces && pieceCount <= range.maxPieces) {
                return this.getRandomIntegerBetween(range.timeRange[0], range.timeRange[1]);
            }
        }

        return 500;
    }

    getRandomIntegerBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandomIntegerNearAverage(min, max) {
        const mid = (min + max) / 2;
        const range = (max - min) / 2;

        let value = Math.floor(mid + (Math.random() - 0.5) * range * 1.5);

        return Math.max(min, Math.min(max, value));
    }

    delay(ms) {
        return this.active ? new Promise(resolve => setTimeout(resolve, ms)) : true;
    }

    async triggerPieceClick(input) {
        const parentExists = activeAutomoves.find(x => x.move === this) ? true : false;

        if(!parentExists) {
            return;
        }

        let clientX, clientY;

        if(input instanceof Element) {
            const rect = input.getBoundingClientRect();
            clientX = rect.left + rect.width / 2;
            clientY = rect.top + rect.height / 2;
        } else if (typeof input === 'object') {
            clientX = input[0];
            clientY = input[1];
        } else {
            return;
        }

        const xDivider = Math.random() < 0.85 ? 4 : Math.random() < 0.15 ? 3 : 2;
        const yDivider = Math.random() < 0.65 ? 3 : Math.random() < 0.35 ? 2 : 4;

        const randomVariationX = (state.lastPieceSize?.width - 4) / xDivider;
        const randomVariationY = (state.lastPieceSize?.height - 4) / yDivider;

        const randomOffsetX = (Math.random() - 0.5) * 2 * randomVariationX;
        const randomOffsetY = (Math.pow(Math.random(), 0.5) - 0.5) * 2 * randomVariationY;

        const randomizedX = clientX + randomOffsetX;
        const randomizedY = clientY + randomOffsetY;

        const pointerEventOptions = {
            bubbles: true,
            cancelable: true,
            clientX: randomizedX,
            clientY: randomizedY,
        };

        const elementToTrigger = (input instanceof Element) ? input : document.elementFromPoint(clientX, clientY);

        if(elementToTrigger) {
            switch(domain) {
                case 'chess.com':
                    elementToTrigger.dispatchEvent(new PointerEvent('pointerdown', pointerEventOptions));

                    if(this.isLegit) await this.delay(this.getRandomIntegerNearAverage(35, 125));

                    elementToTrigger.dispatchEvent(new PointerEvent('pointerup', pointerEventOptions));

                    break;
                case 'lichess.org':
                    elementToTrigger.dispatchEvent(new MouseEvent('mousedown', pointerEventOptions));

                    if(this.isLegit) await this.delay(this.getRandomIntegerNearAverage(35, 125));

                    elementToTrigger.dispatchEvent(new MouseEvent('mouseup', pointerEventOptions));

                    break;
                case 'worldchess.com':
                    elementToTrigger.dispatchEvent(new MouseEvent('mousedown', pointerEventOptions));

                    if(this.isLegit) await this.delay(this.getRandomIntegerNearAverage(35, 125));

                    elementToTrigger.dispatchEvent(new MouseEvent('mouseup', pointerEventOptions));

                    break;
            }
        }

        if(debugModeActivated) {
            const dot = document.createElement('div');
                    dot.style.position = 'absolute';
                    dot.style.width = '7px';
                    dot.style.height = '7px';
                    dot.style.borderRadius = '50%';
                    dot.style.backgroundColor = 'lime';
                    dot.style.left = `${randomizedX - 2.5}px`;
                    dot.style.top = `${randomizedY - 2.5}px`;

            const container = document.createElement('div');
                    container.style.position = 'absolute';
                    container.style.width = `${Math.round(randomVariationX * 2)}px`;
                    container.style.height = `${Math.round(randomVariationY * 2)}px`;
                    container.style.border = '2px dashed green';
                    container.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    container.style.left = `${clientX - randomVariationX}px`;
                    container.style.top = `${clientY - randomVariationY}px`;

            document.body.appendChild(container);
            document.body.appendChild(dot);

            setTimeout(() => {
                dot.remove();
                container.remove();
            }, 1000);
        }
    }

    click(domCoord) {
        if(this.active)
            this.triggerPieceClick(domCoord);
    }

    async hesitate() {
        const hesitationPieceDomCoord = getRandomOwnPieceDomCoord(this.fenMoveArr[0], getBoardMatrix());

        if(hesitationPieceDomCoord) {
            if(this.hesitationTypeOne) {
                this.click(this.moveDomCoords[0]);
                await this.delay(this.hesitationDelay);
            }

            this.click(hesitationPieceDomCoord);

            await this.delay(this.hesitationResolveDelay);

            if(this.shouldHesitateTwice && this.secondHesitationResolveDelay !== -1) {
                const secondHesitationPieceDomCoord = getRandomOwnPieceDomCoord(this.fenMoveArr[0], getBoardMatrix());
                this.click(secondHesitationPieceDomCoord);
                await this.delay(this.secondHesitationResolveDelay);
            }
        }

        this.finishMove(this.toSquareSelectDelay, this.promotionDelay);
    }

    async finishMove(delay01, delay02) {
        this.click(this.moveDomCoords[0]);

        await this.delay(delay01);

        this.click(this.moveDomCoords[1]);

        if(this.isPromotion) {
            this.isPromotingPawn = true;

            await this.delay(delay02);

            this.click(this.moveDomCoords[1]);

            this.isPromotingPawn = false;
        }

        this.onFinished(true);
    }

    async playLegit() {
        await this.delay(this.moveDelay);

        if(this.shouldHesitate && this.hesitationDelay !== -1)
            this.hesitate();
        else
            this.finishMove(this.toSquareSelectDelay, this.promotionDelay);
    }

    async start() {
        if(this.isLegit) {
            this.playLegit();
        } else {
            this.finishMove(5, 1111);
        }
    }

    async stop() {
        if(this.isPromotingPawn) {
            this.click(this.moveDomCoords[1]);
        }

        this.onFinished(false);
    }
}

export async function makeMove(profile, fenMoveArr, isLegit) {
    const move = new AutomaticMove(profile, fenMoveArr, isLegit, e => {

        if(debugModeActivated) console.warn('Move', fenMoveArr, move.id, 'finished', 'for profile:', profile);
    });
}
