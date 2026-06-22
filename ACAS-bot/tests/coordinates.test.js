// Mock global window object before importing coordinates
global.window = {
    location: {
        hostname: 'chess.com',
        pathname: '/'
    }
};

global.GM_getValue = () => null;
global.GM_setValue = () => {};
global.GM_deleteValue = () => {};
global.GM_listValues = () => [];
global.GM_notification = () => {};
global.GM = {
    getValue: async () => null,
    setValue: async () => {},
    deleteValue: async () => {},
    listValues: async () => []
};

global.CommLinkHandler = class {
    constructor() {
        this.commands = {
            createInstance: async () => {},
            ping: async () => true,
            updateBoardFen: () => {},
            updateBoardOrientation: async () => {},
            forceInstanceRestart: () => {},
            toggleConcealAssistance: () => {}
        };
    }
    registerSendCommand() {}
    registerListener() {}
    setIntervalAsync() {}
};

global.UniversalBoardDrawer = class {
    constructor() {}
    createShape() {}
    addSquareListener() {}
    setOrientation() {}
    setBoardDimensions() {}
};

global.DOMMatrix = class {
    constructor() {
        this.e = 0;
        this.f = 0;
    }
};

import { describe, test, expect, mock } from 'bun:test';

// Mock the sites.js and config.js dependencies before importing coordinates
let mockBoardDimensions = [8, 8];
let mockBoardOrientation = 'w';

mock.module('../src/adapters/sites.js', () => {
    return {
        getBoardDimensions: () => mockBoardDimensions,
        getBoardOrientation: () => mockBoardOrientation,
        getPieceElem: () => null,
        getBoardElem: () => null,
        getSquareElems: () => null,
        getChessVariant: () => null,
        getPieceElemFen: () => null,
        getPieceElemCoords: () => null,
        isMutationNewMove: () => false,
        getMutationTurn: () => null,
        getSiteData: (dataType) => dataType === 'boardOrientation' ? mockBoardOrientation : null,
        supportedSites: {},
        addSupportedChessSite: () => {},
        resetCachedValues: () => {}
    };
});

mock.module('../src/state.js', () => {
    return {
        state: {
            getBoardDimensions: () => mockBoardDimensions,
            getBoardOrientation: () => mockBoardOrientation,
            getPieceElem: () => null,
            chessBoardElem: null
        }
    };
});

// Load coordinates using require() to prevent hoisted ES imports from executing before window mock is defined
const {
    chessCoordinatesToIndex,
    indexToChessCoordinates,
    chessCoordinatesToMatrixIndex,
    chessCoordinatesToDomIndex
} = require('../src/utils/coordinates.js');

describe('Coordinate Conversion Helpers', () => {
    test('chessCoordinatesToIndex parses coordinates accurately', () => {
        expect(chessCoordinatesToIndex('a1')).toEqual([0, 0]);
        expect(chessCoordinatesToIndex('h8')).toEqual([7, 7]);
        expect(chessCoordinatesToIndex('c5')).toEqual([2, 4]);
    });

    test('indexToChessCoordinates converts rank/file offsets back to standard coordinates (White Orientation)', () => {
        mockBoardDimensions = [8, 8];
        mockBoardOrientation = 'w';
        
        expect(indexToChessCoordinates([0, 0])).toBe('a8');
        expect(indexToChessCoordinates([7, 7])).toBe('h1');
        expect(indexToChessCoordinates([2, 3])).toBe('c5');
    });

    test('chessCoordinatesToMatrixIndex converts standard coordinates to 2D board matrix indices', () => {
        mockBoardDimensions = [8, 8];
        
        expect(chessCoordinatesToMatrixIndex('a8')).toEqual([0, 0]);
        expect(chessCoordinatesToMatrixIndex('a1')).toEqual([0, 7]);
        expect(chessCoordinatesToMatrixIndex('h1')).toEqual([7, 7]);
    });

    test('chessCoordinatesToDomIndex accounts for board orientation', () => {
        mockBoardDimensions = [8, 8];

        // White orientation
        mockBoardOrientation = 'w';
        expect(chessCoordinatesToDomIndex('a8')).toEqual([0, 0]);
        expect(chessCoordinatesToDomIndex('h1')).toEqual([7, 7]);

        // Black orientation (flipped)
        mockBoardOrientation = 'b';
        expect(chessCoordinatesToDomIndex('a8')).toEqual([7, 7]);
        expect(chessCoordinatesToDomIndex('h1')).toEqual([0, 0]);
    });
});
