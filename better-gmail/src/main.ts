import { enhanceRows } from './features/rows';
import './style.css';

function refresh(): void {
  enhanceRows(document, async (value) => navigator.clipboard.writeText(value));
}

let queued = false;
const observer = new MutationObserver((mutations) => {
  if (
    mutations.every(
      (mutation) =>
        mutation.target instanceof Element && mutation.target.closest('.bgm-row-action'),
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
