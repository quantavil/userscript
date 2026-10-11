import { state } from '../state';

type ScanCallback = (url: string) => void;

let onScan: ScanCallback = () => { };

/**
 * Set the scan callback
 */
export function setScanCallback(cb: ScanCallback): void {
  onScan = cb;
}

/**
 * Watch a video element for source changes
 */
function watchVideo(video: HTMLVideoElement): void {
  if (state.watchedVideos.has(video)) return;
  state.watchedVideos.add(video);

  const emitSources = () => {
    const sources = [
      video.currentSrc || video.src,
      ...Array.from(video.querySelectorAll('source')).map(s => s.src),
    ].filter(Boolean);

    sources.forEach(onScan);
  };

  // Listen for media events
  const events = ['loadstart', 'loadedmetadata', 'canplay'] as const;
  events.forEach(ev => video.addEventListener(ev, emitSources));

  // Emit current sources immediately
  emitSources();
}

/**
 * Scan document for video elements
 */
export function scanVideos(): void {
  document.querySelectorAll('video').forEach(v => watchVideo(v as HTMLVideoElement));
}

/**
 * Start MutationObserver for dynamic videos
 * Uses debouncing to avoid performance issues on high-frequency DOM updates
 */
let observer: MutationObserver | null = null;
let debounceTimer: number | undefined;

export function startVideoObserver(): void {
  if (observer) return;

  observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      scanVideos();
      debounceTimer = undefined;
    }, 1000);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function stopVideoObserver(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }
  observer?.disconnect();
  observer = null;
}