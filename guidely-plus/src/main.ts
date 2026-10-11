import { DownloaderUI } from './ui';
import { Crawler } from './crawler';
import { downloadFile, enableCopyAndRightClick, onReady } from './utils';
import { ensureCopyButton } from './copyMarkdown';

function initDownloader() {
    let activeCrawler: Crawler | null = null;
    const ui = new DownloaderUI(
        () => {
            activeCrawler = new Crawler(
                (msg) => ui.updateStatus(msg),
                (md) => {
                    ui.finish();
                    const titleMatch = md.match(/^# (.+)/m);
                    const safeName = (titleMatch?.[1] || 'Guidely_Questions')
                        .replace(/[^a-zA-Z0-9_\- ]/g, '')
                        .replace(/\s+/g, '_');
                    downloadFile(md, `${safeName}.md`);
                },
                (errMsg) => ui.error(errMsg)
            );
            activeCrawler.start();
        },
        () => activeCrawler?.cancel()
    );

    onReady(() => ui.mount());
}

function runMutationHandlers() {
    ensureCopyButton();
}

function init() {
    try { enableCopyAndRightClick(); } catch (e) { console.error('[Guidely+]', e); }
    try { initDownloader(); } catch (e) { console.error('[Guidely+]', e); }

    onReady(runMutationHandlers);

    let pending = false;
    const observer = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            runMutationHandlers();
            pending = false;
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

init();
