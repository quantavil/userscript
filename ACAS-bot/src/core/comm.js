import { state } from '../state.js';
import {
    commLinkInstanceID,
    domain,
    configKeys,
    getConfigValue,
    dbValues
} from '../utils/config.js';
import { getChessVariant, getBoardOrientation } from '../adapters/index.js';
import { getFen } from '../utils/fen.js';
import { boardUtils, renderMetrics, displayFeedback } from '../drawing/drawing.js';
import { activeAutomoves, makeMove } from './autoMove.js';
import { createInputListener, toggleConcealAssistance, applyAssistanceConcealment } from '../utils/input.js';

export function setupCommLink() {
    const CommLink = new CommLinkHandler(`frontend_${commLinkInstanceID}`, {
        'singlePacketResponseWaitTime': 250,
        'maxSendAttempts': 3,
        'statusCheckInterval': 1,
        'silentMode': true
    });

    CommLink.commands['createInstance'] = async () => {
        return await CommLink.send('mum', 'createInstance', {
            'domain': domain,
            'instanceID': commLinkInstanceID,
            'chessVariant': getChessVariant(),
            'playerColor': getBoardOrientation()
        });
    }

    CommLink.registerSendCommand('ping', { commlinkID: 'mum', data: 'ping' });
    CommLink.registerSendCommand('pingInstance', { data: 'ping' });
    CommLink.registerSendCommand('log');
    CommLink.registerSendCommand('updateBoardOrientation');
    CommLink.registerSendCommand('updateBoardFen');
    CommLink.registerSendCommand('newMatchStarted');
    CommLink.registerSendCommand('calculateBestMoves');
    CommLink.registerSendCommand('calculateSpecificMoves');
    CommLink.registerSendCommand('forceInstanceRestart');
    CommLink.registerSendCommand('toggleConcealAssistance');

    CommLink.registerListener(`backend_${commLinkInstanceID}`, packet => {
        try {
            switch(packet.command) {
                case 'ping':
                    return `pong (took ${Date.now() - packet.date}ms)`;
                case 'getFen':
                    return getFen();
                case 'removeSiteMoveMarkings':
                    boardUtils.removeMarkings();
                    return true;
                case 'markMoveToSite':
                    const profile = packet.data?.[0]?.profile;

                    boardUtils.removeMarkings(profile);
                    boardUtils.markMoves(packet.data);

                    const isAutoMove = getConfigValue(configKeys.autoMove, profile);
                    const isAutoMoveAfterUser = getConfigValue(configKeys.autoMoveAfterUser, profile);

                    if(isAutoMove && (!isAutoMoveAfterUser || state.matchFirstSuggestionGiven)) {
                        const existingAutomoves = activeAutomoves.filter(x => x.move.active);

                        for(const x of existingAutomoves) {
                            x.move.stop();
                        }

                        const isLegit = getConfigValue(configKeys.autoMoveLegit, profile);
                        const isRandom = getConfigValue(configKeys.autoMoveRandom, profile);

                        const move = isRandom
                            ? packet.data[Math.floor(Math.random() * Math.random() * packet.data.length)]?.player
                            : packet.data[0]?.player;

                        makeMove(profile, move, isLegit);
                    }

                    state.matchFirstSuggestionGiven = true;

                    return true;
                case 'renderMetricsToSite':
                    renderMetrics(packet.data);
                    return true;
                case 'feedbackToSite':
                    displayFeedback(packet.data);
                    return true;
                case 'updateRestartListener':
                    createInputListener('instanceRestart', packet.data, () => {
                        CommLink.commands.forceInstanceRestart();
                    });
                    return true;
                case 'updateConcealAssistanceListener':
                    createInputListener('concealAssistance', packet.data, toggleConcealAssistance);
                    return true;
                case 'applyAssistanceConcealment':
                    applyAssistanceConcealment(packet.data);
                    return true;
            }
        } catch(e) {
            return null;
        }
    });

    state.commLink = CommLink;
}
