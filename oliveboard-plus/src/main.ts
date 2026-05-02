import { DownloaderUI } from './ui';
import { Crawler } from './crawler';
import { downloadFile, enableCopyAndRightClick } from './utils';
import { cleanUI, interceptViewSolutions } from './uiCleaner';
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ui.mount());
    } else {
        ui.mount();
    }
}

function init() {
    enableCopyAndRightClick();
    cleanUI();
    interceptViewSolutions();
    initDownloader();
    
    // Ensure the copy markdown button is placed even if DOM changes
    const observer = new MutationObserver(() => ensureCopyButton());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    
    // Also try doing it immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureCopyButton);
    } else {
        ensureCopyButton();
    }
}

init();
