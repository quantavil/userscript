// src/index.ts – Entry point for MobileVideoController
import { Controller } from './core/Controller';

declare function GM_getValue(name: string, defaultValue?: any): any;
declare function GM_setValue(name: string, value: any): void;
declare function GM_registerMenuCommand(caption: string, commandFunc: () => void, accessKey?: string): void;

const initController = () => {
    let isDisabled = false;
    const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : '';

    if (hostname && typeof GM_getValue !== 'undefined') {
        isDisabled = !!GM_getValue(`disabled_${hostname}`, false);
    }

    if (hostname && typeof GM_registerMenuCommand !== 'undefined') {
        const disabledKey = `disabled_${hostname}`;
        const label = isDisabled
            ? `GlideVideo: Enable on ${hostname}`
            : `GlideVideo: Disable on ${hostname}`;

        GM_registerMenuCommand(label, () => {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(disabledKey, !isDisabled);
                window.location.reload();
            }
        });
    }

    if (!isDisabled) {
        new Controller();
    }
};

initController();

