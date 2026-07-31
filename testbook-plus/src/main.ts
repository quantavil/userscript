import { DownloaderUI } from './ui';
import { Crawler } from './crawler';
import { beautifyMarkdown } from './beautifier';
import { initNetworkBlocker } from './networkBlocker';
import { cleanUI, blockAutoPlay } from './uiCleaner';
import { ensureCopyButton } from './copyMarkdown';
import { onPageChange } from './utils';

// Run network blocker and autoplay blocker immediately before any other scripts
initNetworkBlocker();
blockAutoPlay();

function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function enableCopyAndRightClick() {
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.documentElement.appendChild(style);

    const events = ['contextmenu', 'copy', 'cut', 'paste', 'selectstart'];
    events.forEach(evt => {
        window.addEventListener(evt, (e) => {
            e.stopPropagation();
        }, true);
    });
}

function initDownloader() {
  enableCopyAndRightClick();
  let activeCrawler: Crawler | null = null;
  const ui = new DownloaderUI(
    () => {
      activeCrawler = new Crawler(
          (msg) => ui.updateStatus(msg),
          (md) => {
              ui.finish();
              const beautifulMd = beautifyMarkdown(md);
              downloadFile(beautifulMd, 'Testbook_Paper.md');
          },
          (errMsg) => ui.error(errMsg),
      );
      activeCrawler.start();
    },
    () => activeCrawler?.cancel()
  );
  ui.mount();
}

// Initialize single-run features (Downloader UI & copy unlocker)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initDownloader();
} else {
  document.addEventListener('DOMContentLoaded', initDownloader);
}

// Initialize continuous features (UI cleaning & copy button persistence)
onPageChange(() => {
  cleanUI();
  ensureCopyButton();
});