import { state } from '../state.js';
import { getGmConfigValue } from './config.js';

export const activeInputListeners = [];

export function createInputListener(listenerType, targetValue, callback) {
    if(typeof listenerType !== 'string' || typeof targetValue !== 'string' || !callback) return;

    const existingIndex = activeInputListeners
        .findIndex(l => l.listenerType === listenerType);

    if(existingIndex !== -1) {
        const existing = activeInputListeners[existingIndex];
        if(existing.targetValue === targetValue) return;

        existing.listeners.forEach(({ type, fn }) => document.removeEventListener(type, fn));
        activeInputListeners.splice(existingIndex, 1);
    }

    let holdTimer = null;
    let lastTapTime = 0;
    const dblTapThreshold = 300;
    const listeners = [];

    const addListener = (type, fn) => {
        document.addEventListener(type, fn);
        listeners.push({ type, fn });
    };

    addListener('keydown', (e) => {
        if(!targetValue.startsWith("Interact") && e.code === targetValue)
            callback(e);
    });

    const startPress = (e) => {
        if(!targetValue.startsWith("Interact")) return;

        const match = targetValue.match(/^InteractLongPress(\d+)$/);
        if(match) holdTimer = setTimeout(() => {
            callback(e); holdTimer = null;
        }, parseInt(match[1], 10) * 1000);

        if(targetValue === "InteractDoubleClick" && e.type.startsWith("touch")) {
            const now = performance.now();
            if(now - lastTapTime < dblTapThreshold) {
                callback(e);
                lastTapTime = 0;
            }
            else lastTapTime = now;
        }
    };

    const endPress = () => { if(holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
    }};

    addListener('mousedown', startPress);
    addListener('mouseup', endPress);
    addListener('touchstart', startPress);
    addListener('touchend', endPress);
    addListener('dblclick', (e) => {
        if(targetValue === "InteractDoubleClick") callback(e);
    });

    activeInputListeners.push({
        listenerType,
        targetValue,
        callback,
        listeners
    });
}

export function applyAssistanceConcealment(isConcealed = false) {
    const BoardDrawerSvg = state.BoardDrawer?.boardContainerElem;
    if(!BoardDrawerSvg) return;

    if(isConcealed) BoardDrawerSvg.style.display = 'none';
    else BoardDrawerSvg.style.display = 'block';
}

export function toggleConcealAssistance() {
    if (state.commLink) {
        state.commLink.commands.toggleConcealAssistance();
    }
}
