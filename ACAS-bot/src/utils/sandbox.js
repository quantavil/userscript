import { instanceVars, runningOnBackend, isDevPage } from './config.js';

export function exposeViaMessages() {
    const handlers = {
        USERSCRIPT_getValue: (args, messageId) => {
            const [key] = args;
            const value = GM_getValue(key);
            window.postMessage({ messageId, value }, window.location.origin);
        },
        USERSCRIPT_setValue: (args, messageId) => {
            const [key, value] = args;
            GM_setValue(key, value);
            window.postMessage({ messageId, value: true }, window.location.origin);
        },
        USERSCRIPT_deleteValue: (args, messageId) => {
            const [key] = args;
            GM_deleteValue(key);
            window.postMessage({ messageId, value: true }, window.location.origin);
        },
        USERSCRIPT_listValues: (args, messageId) => {
            const value = GM_listValues();
            window.postMessage({ messageId, value }, window.location.origin);
        },
        USERSCRIPT_getInfo: (args, messageId) => {
            const value = typeof GM_info !== 'undefined' ? JSON.parse(JSON.stringify(GM_info)) : {};
            window.postMessage({ messageId, value }, window.location.origin);
        },
        USERSCRIPT_instanceVars: (args, messageId) => {
            const [instanceId, key, value] = args;

            if (!instanceVars.hasOwnProperty(key)) {
                window.postMessage({ messageId, value: false }, window.location.origin);
                return;
            }

            const result = (value !== undefined)
                ? instanceVars[key].set(instanceId, value)
                : instanceVars[key].get(instanceId);

            window.postMessage({ messageId, value: result }, window.location.origin);
        }
    };

    window.addEventListener('message', (event) => {
        const handler = handlers[event.data?.type];
        if(handler) handler(event.data.args, event.data.messageId);
    });

    const script = document.createElement('script');
    script.innerHTML = 'window.isUserscriptActive = true;';

    document.head.appendChild(script);
}

export function exposeViaUnsafe() {
    if(typeof unsafeWindow !== 'object') return;

    unsafeWindow.USERSCRIPT = {
        'getValue': val => GM_getValue(val),
        'setValue': (val, data) => GM_setValue(val, data),
        'deleteValue': val => GM_deleteValue(val),
        'listValues': val => GM_listValues(val),
        'instanceVars': instanceVars,
        'getInfo': () => GM_info
    };

    unsafeWindow.isUserscriptActive = true;
}

export function checkAndExposeSandbox() {
    if (runningOnBackend && !isDevPage) {
        if (typeof unsafeWindow === 'object')
            exposeViaUnsafe();
        else
            exposeViaMessages();
    }
}
