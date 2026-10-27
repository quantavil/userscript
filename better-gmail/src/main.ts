import { GM_registerMenuCommand } from '$';
import { resetFolder } from './core/folder';
import { enhanceAttachments } from './features/attachments';
import { enhanceRows } from './features/rows';
import './style.css';

function refresh(): void {
  enhanceRows(document, async (value) => navigator.clipboard.writeText(value));
  enhanceAttachments(document);
}

let queued = false;
const observer = new MutationObserver((mutations) => {
  if (
    mutations.every(
      (mutation) =>
        mutation.target instanceof Element &&
        mutation.target.closest('.bgm-row-action, .bgm-attachments-bar'),
    )
  )
    return;
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    refresh();
  });
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['email'],
});
refresh();

GM_registerMenuCommand('Reset default download folder', () => {
  void resetFolder().then(
    () => alert('Better Gmail: download folder reset. You will be asked to choose one again.'),
    () => alert('Better Gmail: could not reset the download folder.'),
  );
});
