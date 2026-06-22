import { state } from '../state.js';
import {
    commLinkInstanceID,
    instanceVars,
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

/* ponytail: Combined CommLinkHandler and comm.js into a single module to streamline window communication.
   Optimized storage access, modernized loop logic, and replaced custom UUID logic with native crypto.randomUUID(). */
class CommLinkHandler {
    constructor(commlinkID, configObj) {
        this.commlinkID = commlinkID;
        this.singlePacketResponseWaitTime = configObj?.singlePacketResponseWaitTime || 1500;
        this.maxSendAttempts = configObj?.maxSendAttempts || 3;
        this.statusCheckInterval = configObj?.statusCheckInterval || 1;
        this.silentMode = configObj?.silentMode || false;

        this.commlinkValueIndicator = 'commlink-packet-';
        this.commands = {};
        this.listeners = [];

        this.greasy = typeof GM === 'object' ? GM : {};

        // ponytail: Directly lookup value getters/setters instead of using an extra lookup helper
        const getValueMethod = typeof GM_getValue === 'function' ? GM_getValue : (this.greasy?.getValue || configObj?.functions?.getValue);
        const setValueMethod = typeof GM_setValue === 'function' ? GM_setValue : (this.greasy?.setValue || configObj?.functions?.setValue);
        const deleteValueMethod = typeof GM_deleteValue === 'function' ? GM_deleteValue : (this.greasy?.deleteValue || configObj?.functions?.deleteValue);
        const listValuesMethod = typeof GM_listValues === 'function' ? GM_listValues : (this.greasy?.listValues || configObj?.functions?.listValues);

        this.storage = {
            getValue: async (key) => await getValueMethod(key),
            setValue: (key, value) => setValueMethod(key, value),
            deleteValue: (key) => deleteValueMethod(key),
            listValues: async () => await listValuesMethod()
        };

        this.removeOldPackets();
    }

    async removeOldPackets() {
        const packets = await this.getStoredPackets();
        packets.filter(packet => Date.now() - packet?.date > 2e4)
            .forEach(packet => this.removePacketByID(packet.id));
    }

    setIntervalAsync(callback, interval = this.statusCheckInterval) {
        let running = true;
        (async () => {
            while(running) {
                try { await callback(); } catch (e) {}
                await new Promise((resolve) => setTimeout(resolve, interval));
            }
        })();
        return { stop: () => running = false };
    }

    getCommKey(packetID) {
        return this.commlinkValueIndicator + packetID;
    }

    async getStoredPackets() {
        const keys = await this.storage.listValues();
        // ponytail: Load all packets in parallel via Promise.all instead of sequential for-of iterations
        const packets = await Promise.all(
            keys.filter(k => k.includes(this.commlinkValueIndicator)).map(k => this.storage.getValue(k))
        );
        return packets.filter(Boolean);
    }
    
    addPacket(packet) {
        this.storage.setValue(this.getCommKey(packet.id), packet);
    }

    removePacketByID(packetID) {
        this.storage.deleteValue(this.getCommKey(packetID));
    }

    async findPacketByID(packetID) {
        return await this.storage.getValue(this.getCommKey(packetID));
    }

    editPacket(newPacket) {
        this.storage.setValue(this.getCommKey(newPacket.id), newPacket);
    }

    // ponytail: Replaced nested Promise construction with clean async/await loop and native randomUUID()
    async send(platform, cmd, d) {
        for(let attempts = 1; attempts <= this.maxSendAttempts; attempts++) {
            const packetID = crypto.randomUUID();
            const attemptStartDate = Date.now();
            const packet = { sender: platform, id: packetID, command: cmd, data: d, date: attemptStartDate };

            if(!this.silentMode)
                console.log(`[CommLink Sender] Sending packet! (#${attempts} attempt):`, packet);

            this.addPacket(packet);

            while(Date.now() - attemptStartDate <= this.singlePacketResponseWaitTime) {
                const poolPacket = await this.findPacketByID(packetID);
                if(poolPacket?.result !== undefined && poolPacket.result !== null) {
                    if(!this.silentMode)
                        console.log(`[CommLink Sender] Got result for a packet (${packetID}):`, poolPacket.result);
                    this.removePacketByID(packetID);
                    return poolPacket.result;
                }
                await new Promise(res => setTimeout(res, this.statusCheckInterval));
            }

            this.removePacketByID(packetID);
        }
        return null;
    }

    registerSendCommand(name, obj) {
        this.commands[name] = async data => await this.send(obj?.commlinkID || this.commlinkID , name, obj?.data || data);
    }

    registerListener(sender, commandHandler) {
        const listener = {
            sender,
            commandHandler,
            intervalObj: this.setIntervalAsync(async () => {
                await this.receivePackets();
            }, this.statusCheckInterval),
        };
        this.listeners.push(listener);
    }

    async receivePackets() {
        const packets = await this.getStoredPackets();
        for(const packet of packets) {
            for(const listener of this.listeners) {
                if(packet.sender === listener.sender && !packet.hasOwnProperty('result')) {
                    try {
                        const result = await listener.commandHandler(packet);
                        packet.result = result;
                        this.editPacket(packet);
                        
                        if(!this.silentMode) {
                            if(packet.result == null)
                                console.log('[CommLink Receiver] Possibly failed to handle packet:', packet);
                            else
                                console.log('[CommLink Receiver] Successfully handled a packet:', packet);
                        }
                    } catch(error) {
                        console.error('[CommLink Receiver] Error handling packet:', error);
                    }
                }
            }
        }
    }    

    kill() {
        this.listeners.forEach(listener => listener.intervalObj.stop());
    }
}

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
                    const turn = instanceVars.turn.get(commLinkInstanceID) || getBoardOrientation();
                    const isMyTurn = turn === getBoardOrientation();

                    if(isAutoMove && isMyTurn && (!isAutoMoveAfterUser || state.matchFirstSuggestionGiven)) {
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
