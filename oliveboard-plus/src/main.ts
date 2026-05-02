import { DownloaderUI } from './ui';
import { Crawler } from './crawler';
import { downloadFile, enableCopyAndRightClick, onReady } from './utils';
import { hideElements, modifyLinks, interceptViewSolutions } from './uiCleaner';
import { ensureCopyButton } from './copyMarkdown';

function initDownloader() {
    let activeCrawler: Crawler | null = null;
    const ui = new DownloaderUI(
        () => {
            activeCrawler = new Crawler(
                (msg) => ui.updateStatus(msg),
                (md) => {
                    ui.finish();
                    downloadFile(md, 'Oliveboard_Questions.md');
                },
                (errMsg) => ui.error(errMsg)
            );
            activeCrawler.start();
        },
        () => activeCrawler?.cancel()
    );

    onReady(() => ui.mount());
}

/** All DOM-reactive handlers in one place */
function runMutationHandlers() {
    hideElements();
    modifyLinks();
    ensureCopyButton();
}

function init() {
    // Error boundaries: each feature is independent
    try { enableCopyAndRightClick(); } catch (e) { console.error('[OB+]', e); }
    try { interceptViewSolutions(); } catch (e) { console.error('[OB+]', e); }
    try { initDownloader(); } catch (e) { console.error('[OB+]', e); }

    // Initial run after DOM is ready
    onReady(runMutationHandlers);

    // Single consolidated MutationObserver for all DOM-reactive features
    const observer = new MutationObserver(runMutationHandlers);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

init();
