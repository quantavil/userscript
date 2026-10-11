import { injectPageScript } from './utils';

const BLOCK_PATTERNS = [
    // Analytics / Tags / Pixels
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /g\.(?:doubleclick|google)\.net/i,
    /doubleclick\.net/i,
    /google\.com\/ccm\/collect/i,
    /unpkg\.com\/web-vitals/i,
    // Facebook
    /connect\.facebook\.net/i,
    /facebook\.com\/tr/i,
    // Microsoft
    /bat\.bing\.com/i,
    /clarity\.ms/i,
    /c\.bing\.com\/c\.gif/i,
    // Twitter
    /static\.ads-twitter\.com/i,
    /analytics\.twitter\.com/i,
    /t\.co\/1\/i\/adsct/i,
    // Quora
    /a\.quora\.com/i,
    /q\.quora\.com/i,
    // Criteo and ad sync chains
    /criteo\.com|static\.criteo\.net|sslwidget\.criteo\.com|gum\.criteo\.com|gumi\.criteo\.com/i,
    /cm\.g\.doubleclick\.net/i,
    /x\.bidswitch\.net|contextual\.media\.net|r\.casalemedia\.com|ad\.360yield\.com|idsync\.rlcdn\.com|rubiconproject\.com|smartadserver\.com|taboola\.com|outbrain\.com|3lift\.com|agkn\.com|adnxs\.com|dmxleo\.com/i,
    // Vendor SDKs / Beacons
    /cloudflareinsights\.com/i,
    /amplitude\.com/i,
    /openfpcdn\.io/i,
    /webengage\.com|webengage\.co|wsdk-files\.webengage\.com|c\.webengage\.com|ssl\.widgets\.webengage\.com|survey\.webengage\.com|z\d+.*\.webengage\.co/i,
    /intercom\.io|intercomcdn\.com|widget\.intercom\.io|api-iam\.intercom\.io|nexus-websocket-a\.intercom\.io/i,
    /onesignal\.com/i,
    /hotjar\.com/i,
    /sentry\.io/i,
    // Payment (blocked on request)
    /checkout\.razorpay\.com|checkout-static-next\.razorpay\.com|api\.razorpay\.com/i,
    // TB internal bloat
    /\/wcapi\/live-panel\.js/i,
    /\/js\/live-panel\.js/i,
    /live-panel\.template\.html/i,
    /live-panel\.styles\.css/i,
    /\/cdn-cgi\/rum/i,
    /coldboot\/dist\/coldboot\.min\.js/i,
    /sourcebuster\/dist\/sourcebuster\.min\.js/i,
    // Service workers from site/vendor
    /\/service-worker\.js$/i,
];

export function initNetworkBlocker() {
    // 1. Attempt full injection
    injectPageScript((patternSources: string[]) => {
        // @ts-ignore
        window.__tbBlockerActive = true;
        const BLOCK_PATTERNS = patternSources.map(s => new RegExp(s, 'i'));

        const shouldBlock = (rawUrl: string | URL) => {
            try {
                const url = typeof rawUrl === 'string' ? new URL(rawUrl, location.href) : rawUrl;
                const str = url.toString();
                return BLOCK_PATTERNS.some(re => re.test(str));
            } catch {
                return false;
            }
        };

        // fetch
        const origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function (input, _init) {
                const url = typeof input === 'string' ? input : (input && (input as any).url);
                if (url && shouldBlock(url)) {
                    return Promise.reject(new Error('Blocked by userscript: ' + url));
                }
                return origFetch.apply(this, arguments as any);
            };
        }

        // XHR
        const XHR = window.XMLHttpRequest;
        if (XHR && XHR.prototype) {
            const origOpen = XHR.prototype.open;
            const origSend = XHR.prototype.send;
            XHR.prototype.open = function (method: string, url: string, _async?: boolean, _user?: string, _password?: string) {
                (this as any).__tbBlocked = url && shouldBlock(url);
                if (!(this as any).__tbBlocked) return origOpen.apply(this, arguments as any);
                return origOpen.call(this, method, 'data:application/json,{}', true);
            };
            XHR.prototype.send = function (_body?: Document | XMLHttpRequestBodyInit | null) {
                if ((this as any).__tbBlocked) {
                    try { this.abort(); } catch { }
                    return;
                }
                return origSend.apply(this, arguments as any);
            };
        }

        // sendBeacon
        if (navigator && 'sendBeacon' in navigator) {
            const origBeacon = navigator.sendBeacon.bind(navigator);
            navigator.sendBeacon = function (url, data) {
                if (shouldBlock(url)) return false;
                return origBeacon(url, data);
            };
        }

        // WebSocket
        if ('WebSocket' in window) {
            const OrigWS = window.WebSocket;
            window.WebSocket = function (url: string | URL, protocols?: string | string[]) {
                if (shouldBlock(url)) throw new Error('WebSocket blocked: ' + url);
                return new (OrigWS as any)(url, protocols);
            } as any;
            window.WebSocket.prototype = OrigWS.prototype;
            (window.WebSocket as any).CLOSING = OrigWS.CLOSING;
            (window.WebSocket as any).CLOSED = OrigWS.CLOSED;
            (window.WebSocket as any).CONNECTING = OrigWS.CONNECTING;
            (window.WebSocket as any).OPEN = OrigWS.OPEN;
        }

        // EventSource
        if ('EventSource' in window) {
            const OrigES = window.EventSource;
            window.EventSource = function (url: string | URL, conf?: EventSourceInit) {
                if (shouldBlock(url)) throw new Error('EventSource blocked: ' + url);
                return new (OrigES as any)(url, conf);
            } as any;
            window.EventSource.prototype = OrigES.prototype;
            (window.EventSource as any).CLOSED = OrigES.CLOSED;
            (window.EventSource as any).CONNECTING = OrigES.CONNECTING;
            (window.EventSource as any).OPEN = OrigES.OPEN;
        }

        // Patch src/href setters and setAttribute for script/link/img/iframe
        const patchSrcHref = (proto: any, prop: string) => {
            const desc = Object.getOwnPropertyDescriptor(proto, prop);
            if (!desc || !desc.set) return;
            Object.defineProperty(proto, prop, {
                configurable: true,
                enumerable: desc.enumerable,
                get: desc.get ? function (this: any) { return desc.get!.call(this); } : undefined,
                set: function (this: any, v: any) {
                    if (typeof v === 'string' && shouldBlock(v)) {
                        this.setAttribute('data-blocked-' + prop, v);
                        return;
                    }
                    return desc.set!.call(this, v);
                }
            });
        };

        const patchSetAttribute = (proto: any) => {
            const orig = proto.setAttribute;
            proto.setAttribute = function (this: any, name: string, value: string) {
                if ((name === 'src' || name === 'href') && typeof value === 'string' && shouldBlock(value)) {
                    this.setAttribute('data-blocked-' + name, value);
                    return;
                }
                return orig.call(this, name, value);
            };
        };

        [HTMLScriptElement.prototype, HTMLLinkElement.prototype, HTMLImageElement.prototype, HTMLIFrameElement.prototype]
            .forEach(p => p && patchSetAttribute(p));

        patchSrcHref(HTMLScriptElement.prototype, 'src');
        patchSrcHref(HTMLLinkElement.prototype, 'href');
        patchSrcHref(HTMLImageElement.prototype, 'src');
        patchSrcHref(HTMLIFrameElement.prototype, 'src');

        // Kill document.write
        document.write = () => { };
        document.writeln = () => { };

        // Stub common trackers
        (window as any).dataLayer = (window as any).dataLayer || [];
        try { Object.defineProperty(window as any, 'dataLayer', { get: () => [], set: () => {} }); } catch { }
        (window as any).gtag = function () { };
        (window as any).ga = function () { };
        (window as any).fbq = function () { };
        (window as any).clarity = function () { };
        (window as any).Intercom = function () { };
        (window as any).amplitude = {
            getInstance: () => ({ init() { }, logEvent() { }, setUserId() { }, setUserProperties() { }, identify() { } })
        };
        (window as any).OneSignal = { push() { }, init() { }, on() { }, off() { } };

        // Block service workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register = function () {
                return Promise.reject(new Error('ServiceWorker registration blocked by userscript'));
            };
            navigator.serviceWorker.getRegistrations?.().then(list => {
                list.forEach(reg => reg.unregister().catch(() => { }));
            }).catch(() => { });
        }

        // Deny Notifications / Push permission
        try {
            if (window.Notification) {
                window.Notification.requestPermission = function () { return Promise.resolve('denied'); };
                Object.defineProperty(window.Notification, 'permission', { get: () => 'denied' });
            }
            const origPerms = navigator.permissions?.query?.bind(navigator.permissions);
            if (origPerms) {
                navigator.permissions.query = function (q) {
                    if (q && (q.name === 'notifications' || q.name === 'push')) {
                        return Promise.resolve({ state: 'denied' } as any);
                    }
                    return origPerms(q);
                };
            }
        } catch { }
    }, BLOCK_PATTERNS.map(re => re.source));

    // 2. CSP detection and partial fallback
    // We check if the injected script set the flag. 
    // Since injectPageScript is synchronous (it appends and removes), we can check immediately.
    if (!(window as any).__tbBlockerActive) {
        const patterns = BLOCK_PATTERNS.map(re => new RegExp(re.source, 'i'));
        const shouldBlock = (url: string) => patterns.some(re => re.test(url));

        // Partial fallback from userscript context
        const origFetch = window.fetch;
        if (origFetch) {
            window.fetch = function(input, init) {
                const url = typeof input === 'string' ? input : (input && (input as any).url);
                if (url && shouldBlock(url)) return Promise.reject(new Error('Blocked (CSP Fallback): ' + url));
                return origFetch.apply(this, arguments as any);
            };
        }

        const XHR = window.XMLHttpRequest;
        if (XHR && XHR.prototype) {
            const origOpen = XHR.prototype.open;
            XHR.prototype.open = function(method: string, url: string) {
                if (url && shouldBlock(url)) {
                    (this as any).__tbBlocked = true;
                    return origOpen.call(this, method, 'data:application/json,{}', true);
                }
                return origOpen.apply(this, arguments as any);
            };
            const origSend = XHR.prototype.send;
            XHR.prototype.send = function() {
                if ((this as any).__tbBlocked) {
                    try { this.abort(); } catch(e) {}
                    return;
                }
                return origSend.apply(this, arguments as any);
            };
        }
    }
}
