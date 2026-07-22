import { domain, getConfigValue, configKeys, getUniqueID, debugModeActivated } from '../utils/config.js';
import { getPieceElem, getBoardMatrix, isPawnPromotion } from '../adapters/index.js';
import { state } from '../state.js';
import { getFen } from '../utils/fen.js';
import {
    chessCoordinatesToMatrixIndex,
    fenCoordArrToDomCoord,
    indexToChessCoordinates
} from '../utils/coordinates.js';



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

        state.activeAutomoves.push({ 'id': this.id, 'move': this });

        this.profile = profile;
        this.fenMoveArr = fenMoveArr;
        this.isLegit = isLegit;

        this.active = true;
        this.isPromotingPawn = false;

        this.onFinished = function(...args) {
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

    delay(ms) {
        return this.active ? new Promise(resolve => setTimeout(resolve, ms)) : true;
    }

    async triggerPieceClick(input) {
        const parentExists = state.activeAutomoves.find(x => x.move === this) ? true : false;

        if(!parentExists) {
            return;
        }

        let clientX, clientY;

        if(input instanceof Element) {
            const rect = input.getBoundingClientRect();
            clientX = rect.left + rect.width / 2;
            clientY = rect.top + rect.height / 2;
        } else if (Array.isArray(input)) {
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

        const overlay = state.BoardDrawer?.boardContainerElem;
        let originalPointerEvents = '';
        if(overlay) {
            originalPointerEvents = overlay.style.pointerEvents;
            overlay.style.pointerEvents = 'none';
        }

        const elementToTrigger = (input instanceof Element) ? input : document.elementFromPoint(clientX, clientY);

        if(overlay) {
            overlay.style.pointerEvents = originalPointerEvents;
        }

        if(elementToTrigger) {
            const releaseDelay = this.isLegit ? this.getRandomIntegerBetween(40, 110) : 0;
            switch(domain) {
                case 'chess.com':
                    elementToTrigger.dispatchEvent(new PointerEvent('pointerdown', pointerEventOptions));

                    if(releaseDelay > 0) await this.delay(releaseDelay);

                    elementToTrigger.dispatchEvent(new PointerEvent('pointerup', pointerEventOptions));

                    break;
                case 'lichess.org':
                case 'worldchess.com':
                default:
                    elementToTrigger.dispatchEvent(new MouseEvent('mousedown', pointerEventOptions));

                    if(releaseDelay > 0) await this.delay(releaseDelay);

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

    async drag(fromCoord, toCoord) {
        const parentExists = state.activeAutomoves.find(x => x.move === this) ? true : false;
        if(!parentExists) return;

        const usePointer = !!window.PointerEvent;
        const [xStart, yStart] = fromCoord;
        const [xEnd, yEnd] = toCoord;

        const overlay = state.BoardDrawer?.boardContainerElem;
        let originalPointerEvents = '';
        if(overlay) {
            originalPointerEvents = overlay.style.pointerEvents;
            overlay.style.pointerEvents = 'none';
        }

        const startEl = document.elementFromPoint(xStart, yStart);
        if(!startEl) {
            if(overlay) overlay.style.pointerEvents = originalPointerEvents;
            return;
        }

        const pointerEventOptions = (x, y, buttons) => ({
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            buttons,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true
        });

        // Dispatch pointerdown / mousedown
        const downOpts = pointerEventOptions(xStart, yStart, 1);
        if(usePointer) {
            startEl.dispatchEvent(new PointerEvent('pointerdown', downOpts));
        } else {
            startEl.dispatchEvent(new MouseEvent('mousedown', downOpts));
        }

        // Wait 20ms for UI to register the grab
        await this.delay(20);

        // Path Jitter Profiles / Presets
        let steps = 10;
        let baseStepDelay = 12;
        let delayVarianceFn = () => 0;
        let curveJitter = 0;
        let useCurve = this.isLegit;

        if (useCurve) {
            const profiles = ['fast-flicker', 'slow-steady', 'tired-drag'];
            const chosenProfile = profiles[Math.floor(Math.random() * profiles.length)];
            
            if (chosenProfile === 'fast-flicker') {
                steps = this.getRandomIntegerBetween(5, 7);
                baseStepDelay = this.getRandomIntegerBetween(4, 8);
                delayVarianceFn = () => (Math.random() - 0.5) * 2;
                curveJitter = (Math.random() - 0.5) * 0.15;
            } else if (chosenProfile === 'slow-steady') {
                steps = this.getRandomIntegerBetween(12, 16);
                baseStepDelay = this.getRandomIntegerBetween(10, 14);
                delayVarianceFn = () => (Math.random() - 0.5) * 1;
                curveJitter = (Math.random() - 0.5) * 0.20;
            } else if (chosenProfile === 'tired-drag') {
                steps = this.getRandomIntegerBetween(15, 22);
                baseStepDelay = this.getRandomIntegerBetween(16, 24);
                delayVarianceFn = () => {
                    const baseJitter = (Math.random() - 0.5) * 6;
                    const pauseJitter = Math.random() < 0.2 ? 15 : 0;
                    return baseJitter + pauseJitter;
                };
                curveJitter = (Math.random() - 0.5) * 0.45;
            }
        }

        const p1x = useCurve ? ((xStart + xEnd) / 2) + (yStart - yEnd) * curveJitter : 0;
        const p1y = useCurve ? ((yStart + yEnd) / 2) + (xEnd - xStart) * curveJitter : 0;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            let mx, my;

            if (useCurve) {
                const mt = 1 - t;
                mx = mt * mt * xStart + 2 * mt * t * p1x + t * t * xEnd;
                my = mt * mt * yStart + 2 * mt * t * p1y + t * t * yEnd;
            } else {
                mx = xStart + (xEnd - xStart) * t;
                my = yStart + (yEnd - yStart) * t;
            }

            const stepTarget = document.elementFromPoint(mx, my) || startEl;
            const moveOpts = pointerEventOptions(mx, my, 1);

            if(usePointer) {
                stepTarget.dispatchEvent(new PointerEvent('pointermove', moveOpts));
            } else {
                stepTarget.dispatchEvent(new MouseEvent('mousemove', moveOpts));
            }

            const stepDelay = Math.max(1, Math.round(baseStepDelay + delayVarianceFn()));
            await this.delay(stepDelay);
        }

        // Release at target
        const endEl = document.elementFromPoint(xEnd, yEnd) || startEl;
        const upOpts = pointerEventOptions(xEnd, yEnd, 0);
        if(usePointer) {
            endEl.dispatchEvent(new PointerEvent('pointerup', upOpts));
        } else {
            endEl.dispatchEvent(new MouseEvent('mouseup', upOpts));
        }

        if(overlay) {
            overlay.style.pointerEvents = originalPointerEvents;
        }
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
                if(secondHesitationPieceDomCoord) {
                    this.click(secondHesitationPieceDomCoord);
                    await this.delay(this.secondHesitationResolveDelay);
                }
            }
        }

        this.finishMove(this.toSquareSelectDelay, this.promotionDelay);
    }

    async finishMove(delay01, delay02) {
        let moveMethod = getConfigValue('moveMethod', this.profile) || 'click';

        if(moveMethod === 'natural') {
            // ponytail: randomize choice between click and drag to mimic human behavior
            moveMethod = Math.random() < 0.5 ? 'click' : 'drag';
        }

        if(moveMethod === 'drag') {
            await this.delay(delay01);
            await this.drag(this.moveDomCoords[0], this.moveDomCoords[1]);
        } else {
            this.click(this.moveDomCoords[0]);
            await this.delay(delay01);
            this.click(this.moveDomCoords[1]);
        }

        if(this.isPromotion) {
            this.isPromotingPawn = true;

            await this.delay(delay02);

            const promoPiece = this.fenMoveArr[1]?.[2]?.toLowerCase();
            let promoClicked = false;
            if(promoPiece) {
                const selectors = [
                    `.promotion-menu .${promoPiece}`,
                    `#promotion-choice .${promoPiece}`,
                    `.promotion-piece.${promoPiece}`,
                    `[data-promotion="${promoPiece}"]`,
                    `.promotion-menu [data-piece*="${promoPiece}"]`,
                    `#promotion-choice [data-piece*="${promoPiece}"]`
                ];
                for(const selector of selectors) {
                    const el = document.querySelector(selector);
                    if(el) {
                        this.click(el);
                        promoClicked = true;
                        break;
                    }
                }
            }

            if(!promoClicked) {
                this.click(this.moveDomCoords[1]);
            }

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
