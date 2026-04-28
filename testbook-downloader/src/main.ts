import { DownloaderUI } from './ui';
import { Crawler } from './crawler';
import { beautifyMarkdown } from './beautifier';

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

function init() {
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

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}