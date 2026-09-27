import { ReelPost } from '../extractor/types';
import { ResolvedMedia } from './types';
import { audioManager, AudioManager, normalizeIframeSrc } from './audio-manager';

export * from './types';
export * from './audio-manager';
export * from './redgifs-bridge';
export * from './video-hydrator';

/**
 * Direct DOM media resolver.
 * Inspects Reddit's already-rendered post element and extracts the active media source
 * with zero external network requests or rate limits.
 */
function resolveExternalVideo(post: ReelPost): ResolvedMedia | null {
  const href = post.contentHref || post.mediaUrl || '';
  if (!href) return null;

  if (/redgifs\.com/i.test(href)) {
    const match = href.match(/redgifs\.com\/(?:watch|ifr|v)\/([a-zA-Z0-9_-]+)/i);
    if (match) {
      return {
        type: 'iframe',
        src: normalizeIframeSrc(`https://www.redgifs.com/ifr/${match[1]}?autoplay=1&muted=1`, audioManager.isMuted),
        hasAudio: true,
      };
    }
  } else if (/streamable\.com/i.test(href)) {
    const match = href.match(/streamable\.com\/([a-zA-Z0-9_-]+)/i);
    if (match) {
      return {
        type: 'iframe',
        src: `https://streamable.com/e/${match[1]}?autoplay=1${audioManager.isMuted ? '&muted=1' : ''}`,
        hasAudio: true,
      };
    }
  } else if (/gfycat\.com/i.test(href)) {
    const match = href.match(/gfycat\.com\/(?:ifr\/)?([a-zA-Z0-9_-]+)/i);
    if (match) {
      return {
        type: 'iframe',
        src: `https://gfycat.com/ifr/${match[1]}?autoplay=1`,
        hasAudio: true,
      };
    }
  } else if (/youtube\.com|youtu\.be/i.test(href)) {
    const ytMatch = href.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) {
      return {
        type: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`,
        hasAudio: true,
      };
    }
  } else if (/\.(mp4|webm)(\?|$)/i.test(href)) {
    return {
      type: 'video',
      src: href,
      poster: post.mediaUrl !== href ? post.mediaUrl || '' : '',
      hasAudio: true,
    };
  }
  return null;
}

export function resolveMedia(post: ReelPost): ResolvedMedia {
  const el = post.element;
  if (!el) {
    const external = resolveExternalVideo(post);
    if (external) return external;
    return {
      type: 'image',
      src: post.mediaUrl || post.contentHref || '',
      hasAudio: false,
    };
  }

  // 1. Native video or shreddit-player-2
  const video = el.querySelector<HTMLVideoElement>('video');
  const player = el.querySelector<HTMLElement>('shreddit-player-2');
  if (video || player) {
    const src =
      video?.currentSrc ||
      video?.src ||
      player?.getAttribute('stream-url') ||
      player?.getAttribute('src') ||
      post.mediaUrl ||
      post.contentHref ||
      '';
    const poster =
      video?.poster ||
      player?.getAttribute('poster') ||
      player?.getAttribute('preview') ||
      undefined;

    return {
      type: 'video',
      src,
      poster,
      hasAudio: player?.getAttribute('has-audio') !== 'false',
      element: video || player || undefined,
    };
  }

  // 2. Embedded iframe (e.g. RedGifs, Streamable, YouTube)
  const iframe = el.querySelector<HTMLIFrameElement>('iframe');
  if (iframe && iframe.src) {
    let src = normalizeIframeSrc(iframe.src, audioManager.isMuted);
    // Native embeds often lack autoplay param; inject it so slides start on activation.
    if (/redgifs\.com|streamable\.com|gfycat\.com/i.test(src) && !/[?&]autoplay=/.test(src)) {
      src += (src.includes('?') ? '&' : '?') + 'autoplay=1';
    }
    return {
      type: 'iframe',
      src,
      hasAudio: true,
      element: iframe,
    };
  }

  // 3. Fallback: Check if post links to external video host or direct video
  const external = resolveExternalVideo(post);
  if (external) return external;

  // 4. Image or gallery
  const img = el.querySelector<HTMLImageElement>(
    'img[src*="i.redd.it"], img[src*="preview.redd.it"], [slot="post-media-container"] img, img'
  );
  const imgSrc = img?.src || post.mediaUrl || post.contentHref || '';

  return {
    type: 'image',
    src: imgSrc,
    poster: imgSrc,
    hasAudio: false,
  };
}

export { audioManager, AudioManager };
