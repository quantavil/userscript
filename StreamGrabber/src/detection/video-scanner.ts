import { state } from '../state';

type ScanCallback = (url: string) => void;

let onScan: ScanCallback = () => {};

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
 */
let observer: MutationObserver | null = null;

export function startVideoObserver(): void {
  if (observer) return;
  
  observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        
        if (node.tagName === 'VIDEO') {
          watchVideo(node as HTMLVideoElement);
        } else {
          node.querySelectorAll?.('video')?.forEach(v => {
            watchVideo(v as HTMLVideoElement);
          });
        }
      }
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function stopVideoObserver(): void {
  observer?.disconnect();
  observer = null;
}