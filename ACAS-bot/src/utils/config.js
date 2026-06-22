export const backendConfig = {
    'hosts': { 'prod': 'quantavil.github.io', 'dev': 'localhost' },
    'path': '/A.C.A.S/'
};

export const domain = window.location.hostname.replace('www.', '');

export const pieceNameToFen = {
    'pawn': 'p',
    'knight': 'n',
    'bishop': 'b',
    'rook': 'r',
    'queen': 'q',
    'king': 'k'
};

export const configKeys = Object.freeze([
    'engineElo', 'moveSuggestionAmount', 'arrowOpacity',
    'displayMovesOnExternalSite', 'showMoveGhost', 'showOpponentMoveGuess',
    'showOpponentMoveGuessConstantly', 'onlyShowTopMoves', 'maxMovetime',
    'chessVariant', 'chessEngine', 'lc0Weight',
    'engineNodes', 'chessFont', 'useChess960',
    'onlyCalculateOwnTurn', 'ttsVoiceEnabled', 'ttsVoiceName',
    'ttsVoiceSpeed', 'chessEngineProfile', 'primaryArrowColorHex',
    'secondaryArrowColorHex', 'opponentArrowColorHex', 'reverseSide',
    'engineEnabled', 'autoMove', 'autoMoveLegit',
    'autoMoveRandom', 'autoMoveAfterUser', 'legitModeType',
    'moveMethod',
    'moveDisplayDelay', 'renderSquarePlayer', 'renderSquareEnemy',
    'renderSquareContested', 'renderSquareSafe', 'renderPiecePlayerCapture',
    'renderPieceEnemyCapture', 'renderOnExternalSite', 'feedbackOnExternalSite',
    'enableMoveRatings', 'enableEnemyFeedback', 'feedbackEngineDepth',
    'enableAdvancedElo', 'moveAsFilledSquares',
    'movesOnDemand', 'onlySuggestPieces', 'isUserscriptGhost'
].reduce((o, k) => (o[k] = k, o), {}));

export const getUniqueID = () => crypto.randomUUID();

export const commLinkInstanceID = getUniqueID();

const currentBackendUrlKey = 'currentBackendURL';
const currentBackendUrl = typeof GM_getValue === 'function'
    ? GM_getValue(currentBackendUrlKey)
    : await GM.getValue(currentBackendUrlKey);
const isBackendUrlUpToDate = Object.values(backendConfig.hosts)
    .some(x => currentBackendUrl?.includes(x));
export const isDevPage = window?.location?.pathname?.includes('/dev');

export function constructBackendURL(host) {
    const protocol = window.location.protocol + '//';
    const hosts = backendConfig.hosts;

    return protocol + (host || hosts?.prod) + backendConfig.path;
}

export function isRunningOnBackend(skipGM) {
    const hostsArr = Object.values(backendConfig.hosts);

    const path = window?.location?.pathname;
    const foundHost = hostsArr.find(host => host === window?.location?.host);
    const isCorrectPath = path?.includes(backendConfig.path);

    const isBackend = typeof foundHost === 'string' && isCorrectPath;

    if(isBackend && !skipGM)
        GM_setValue(currentBackendUrlKey, constructBackendURL(foundHost));

    return isBackend;
}

export const runningOnBackend = isRunningOnBackend();
export const runningOnDevPage = runningOnBackend && isDevPage;

export const debugModeActivated = false;
const onlyUseDevelopmentBackend = false;

function prependProtocolWhenNeeded(url) {
    if(!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'http://' + url;
    }

    return url;
}

export function getCurrentBackendURL(skipGmStorage) {
    if(onlyUseDevelopmentBackend) {
        return constructBackendURL(backendConfig.hosts?.dev);
    }

    const gmStorageUrl = GM_getValue(currentBackendUrlKey);

    if(skipGmStorage || !gmStorageUrl) {
        return constructBackendURL();
    }

    return prependProtocolWhenNeeded(gmStorageUrl);
}

if(!isBackendUrlUpToDate) {
    GM_setValue(currentBackendUrlKey, getCurrentBackendURL(true));
}

function createInstanceVariable(dbValue) {
    return {
        set: (instanceID, value) => GM_setValue(dbValues[dbValue](instanceID), { value, 'date': Date.now() }),
        get: instanceID => {
            const data = GM_getValue(dbValues[dbValue](instanceID));

            if(data?.date) {
                data.date = Date.now();

                GM_setValue(dbValues[dbValue](instanceID), data);
            }

            return data?.value;
        }
    }
}

const tempValueIndicator = '-temp-value-';
export const dbValues = {
    AcasConfig: 'AcasConfig',
    playerColor: instanceID => 'playerColor' + tempValueIndicator + instanceID,
    turn: instanceID => 'turn' + tempValueIndicator + instanceID,
    fen: instanceID => 'fen' + tempValueIndicator + instanceID
};
export const instanceVars = {
    playerColor: createInstanceVariable('playerColor'),
    turn: createInstanceVariable('turn'),
    fen: createInstanceVariable('fen')
};

export const config = {};

export function setGmConfigValue(key, value, instanceID, profileID) {
    if(typeof profileID === 'object') {
        profileID = profileID.name;
    }
    const configObj = GM_getValue(dbValues.AcasConfig) || {};
    if (profileID) {
        if (!configObj.instance) configObj.instance = {};
        if (!configObj.instance[instanceID]) configObj.instance[instanceID] = {};
        if (!configObj.instance[instanceID].profiles) configObj.instance[instanceID].profiles = {};
        if (!configObj.instance[instanceID].profiles[profileID]) configObj.instance[instanceID].profiles[profileID] = {};
        configObj.instance[instanceID].profiles[profileID][key] = value;
    } else {
        if (!configObj.instance) configObj.instance = {};
        if (!configObj.instance[instanceID]) configObj.instance[instanceID] = {};
        configObj.instance[instanceID][key] = value;
    }
    GM_setValue(dbValues.AcasConfig, configObj);
}

export function getGmConfigValue(key, instanceID, profileID) {
    if(typeof profileID === 'object') {
        profileID = profileID.name;
    }

    const config = GM_getValue(dbValues.AcasConfig);

    const instanceValue = config?.instance?.[instanceID]?.[key];
    const globalValue = config?.global?.[key];

    if(instanceValue !== undefined) {
        return instanceValue;
    }

    if(globalValue !== undefined) {
        return globalValue;
    }

    if(profileID) {
        const globalProfileValue = config?.global?.['profiles']?.[profileID]?.[key];
        const instanceProfileValue = config?.instance?.[instanceID]?.['profiles']?.[profileID]?.[key];

        if(instanceProfileValue !== undefined) {
            return instanceProfileValue;
        }

        if(globalProfileValue !== undefined) {
            return globalProfileValue;
        }
    }

    return null;
}

export function getConfigValue(key, profile) {
    return config[key]?.get(profile);
}

export function setConfigValue(key, val) {
    return config[key]?.set(val);
}

// Side effects execution check:
if (!(runningOnBackend && !isDevPage)) {
    Object.values(configKeys).forEach(key => {
        config[key] = {
            get:  profile => getGmConfigValue(key, commLinkInstanceID, profile),
            set:  (val, profile) => setGmConfigValue(key, val, commLinkInstanceID, profile)
        };
    });
}
