export function injectPageScript(fn: (...args: any[]) => void, ...args: any[]) {
    const s = document.createElement('script');
    s.textContent = `(${fn})(...${JSON.stringify(args)})`;
    (document.documentElement || document.head || document.body).appendChild(s);
    s.remove();
}

export function injectCSS(id: string, css: string) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
}

export function onPageChange(callback: () => void) {
    // Initial run
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        callback();
    } else {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    }

    // Debouncer to prevent multiple runs
    let timer: number | null = null;
    const trigger = () => {
        if (timer) clearTimeout(timer);
        timer = window.setTimeout(() => {
            callback();
            timer = null;
        }, 50);
    };

    // SPA changes via DOM mutations
    const obs = new MutationObserver(trigger);
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // SPA changes via History API
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function (...args) {
        const r = pushState.apply(this, args);
        trigger();
        return r;
    };
    history.replaceState = function (...args) {
        const r = replaceState.apply(this, args);
        trigger();
        return r;
    };
    window.addEventListener('popstate', trigger);
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { }
    ta.remove();
    return ok;
}
