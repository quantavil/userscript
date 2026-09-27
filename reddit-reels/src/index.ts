import { extractPosts, observeNewPosts } from './extractor/dom-extractor';
import { proxyUpvote, proxyDownvote } from './extractor/vote-proxy';
import { AudioManager, audioManager } from './media/audio-manager';
import { resolveMedia, initRedGifsBridge, isRedGifsFrame } from './media';
import { unconstrainPostMedia } from './core/unconstrainer';
import './main';

// Auto-initialize RedGifs bridge if running in RedGifs iframe context
if (typeof window !== 'undefined' && isRedGifsFrame()) {
  initRedGifsBridge();
}

export * from './extractor/types';
export * from './extractor/dom-extractor';
export * from './extractor/vote-proxy';
export * from './media';
export { unconstrainPostMedia, initRedGifsBridge, isRedGifsFrame };

// Expose on global window object for browser runtime and tests
if (typeof window !== 'undefined') {
  (window as any).extractPosts = extractPosts;
  (window as any).observeNewPosts = observeNewPosts;
  (window as any).proxyUpvote = proxyUpvote;
  (window as any).proxyDownvote = proxyDownvote;
  (window as any).AudioManager = AudioManager;
  (window as any).audioManager = audioManager;
  (window as any).resolveMedia = resolveMedia;
  (window as any).unconstrainPostMedia = unconstrainPostMedia;
}
