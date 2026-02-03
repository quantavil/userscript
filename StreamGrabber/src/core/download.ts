import type { MediaItem, Variant, ProgressCardController } from '../types';
import { getText, blobRegistry } from './network';
import {
  parseManifest,
  calcDuration,
  estimateHlsSize,
  isFmp4 as checkFmp4,
} from './parser';
import { downloadSegments } from './download-engine';
import { enrichNow } from './enrichment';
import {
  cleanFilename,
  guessExt,
  formatBytes,
  sortVariantsByQuality,
  buildLabel,
  notifyDownloadComplete,
  generateFilename,
} from '../utils';

// ============================================
// Types
// ============================================

export interface DownloadDelegate {
  createCard(title: string, src: string, segs?: number): ProgressCardController;
  pickVariant(items: MediaItem[]): Promise<MediaItem | null>;
  setBusy(busy: boolean): void;
  // Optional: add any other UI interactions here if needed
}

// ============================================
// Direct Download
// ============================================

export async function downloadDirect(
  url: string,
  delegate: DownloadDelegate
): Promise<void> {
  console.log('[SG] Direct download:', url);

  const info = blobRegistry.get(url);

  const ext = guessExt(url, info?.type);
  const filename = generateFilename({ title: document.title, ext });

  let dlUrl = url;
  let cleanup = () => { };

  if (info?.blob) {
    dlUrl = URL.createObjectURL(info.blob);
    cleanup = () => URL.revokeObjectURL(dlUrl);
  }

  const card = delegate.createCard(filename, url);

  card.setOnCancel(() => {
    cleanup();
    card.remove();
  });

  GM_download({
    url: dlUrl,
    name: filename,
    saveAs: true,
    onprogress: (e: any) => {
      if (e.lengthComputable) {
        card.update(
          (e.loaded / e.total) * 100,
          `${formatBytes(e.loaded)}/${formatBytes(e.total)}`
        );
      } else {
        card.update(0, formatBytes(e.loaded));
      }
    },
    onload: () => {
      card.update(100, '');
      card.done(true);
      cleanup();
      notifyDownloadComplete(filename);
    },
    onerror: (err: any) => {
      const errorMsg = err?.error || 'unknown';
      console.error('[SG] Download error:', { error: errorMsg, url });
      card.done(false, errorMsg === 'not_succeeded' ? 'Save failed' : errorMsg);
      cleanup();
    },
    ontimeout: () => {
      card.done(false, 'Timeout');
      cleanup();
    },
  });
}

// ============================================
// HLS Download
// ============================================

export async function downloadHls(
  url: string,
  preVariant: Variant | null,
  delegate: DownloadDelegate
): Promise<void> {
  console.log('[SG] HLS download:', url);

  const txt = await getText(url);
  const man = parseManifest(txt, url);

  let mediaUrl = url;
  let chosenVariant = preVariant;

  // Master playlist: prompt for variant
  if (man.isMaster && man.variants && man.variants.length > 0) {
    const variants = sortVariantsByQuality(man.variants);

    if (variants.length === 0) {
      throw new Error('No variants found');
    }

    // Build variant items for picker
    const items: MediaItem[] = [];

    for (const v of variants) {
      let size: number | null = null;
      let duration = 0;

      try {
        const mediaTxt = await getText(v.url);
        const vMan = parseManifest(mediaTxt, v.url);

        if (vMan.segments) {
          duration = calcDuration(vMan.segments);
          const est = estimateHlsSize(
            {
              segs: vMan.segments,
              mediaSeq: vMan.mediaSeq ?? 0,
              endList: vMan.endList ?? false,
            },
            duration,
            v
          );
          size = est.bytes;
        }
      } catch {
        /* ignore variant parsing errors */
      }

      const label = buildLabel({
        resolution: v.res,
        bitrate: v.avg || v.peak,
        duration,
        size,
      });

      items.push({
        url: v.url,
        kind: 'variant',
        label,
        sublabel: null,
        size,
        type: null,
        origin: document.location.origin,
        enriched: true,
        enriching: false,
        hlsType: 'media',
        isLive: false,
        encrypted: false,
        variant: v,
      });
    }

    const selected = await delegate.pickVariant(items);
    if (!selected) return;

    chosenVariant = selected.variant ?? null;
    mediaUrl = selected.url;
  }

  // Parse media playlist
  const mediaTxt = await getText(mediaUrl);
  const mediaMan = parseManifest(mediaTxt, mediaUrl);

  if (!mediaMan.segments || mediaMan.segments.length === 0) {
    throw new Error('Invalid playlist: no segments');
  }

  const parsed = {
    segs: mediaMan.segments,
    mediaSeq: mediaMan.mediaSeq ?? 0,
    endList: mediaMan.endList ?? false,
  };

  const fmp4 = checkFmp4(parsed.segs);
  const ext = fmp4 ? 'mp4' : 'ts';
  const filename = generateFilename({
    title: document.title,
    ext,
    quality: chosenVariant?.res
  });

  const card = delegate.createCard(filename, url, parsed.segs.length);

  await downloadSegments(parsed, filename, fmp4, card);
}

// ============================================
// Handle Item (dispatch to correct downloader)
// ============================================

export async function handleItem(
  item: MediaItem,
  delegate: DownloadDelegate
): Promise<void> {
  // Handle remote items (blobs from child frames)
  if (item.isRemote && item.remoteWin) {
    if (item.remoteWin.closed) {
      throw new Error('Source frame is gone');
    }

    // For non-blob remote items, download directly from top
    if (!item.url.startsWith('blob:')) {
      if (item.kind === 'hls') {
        return downloadHls(item.url, null, delegate);
      }
      if (item.kind === 'video') {
        return downloadDirect(item.url, delegate);
      }
    }

    // Blob items need to be downloaded in their origin frame
    item.remoteWin.postMessage(
      {
        type: 'SG_CMD_DOWNLOAD',
        payload: { url: item.url, kind: item.kind, variant: item.variant },
      },
      '*'
    );
    return;
  }

  // Ensure HLS items are enriched
  if (item.kind === 'hls' && !item.enriched) {
    delegate.setBusy(true);
    try {
      if (item._enrichPromise) {
        await item._enrichPromise;
      } else {
        await enrichNow(item);
      }
    } catch (e) {
      throw new Error(`Failed to analyze stream: ${(e as Error).message}`);
    } finally {
      delegate.setBusy(false);
    }

    if (item.hlsType === 'error' || item.hlsType === 'invalid') {
      throw new Error('Cannot download: Stream analysis failed or invalid');
    }
  }

  // Dispatch
  if (item.kind === 'video') {
    return downloadDirect(item.url, delegate);
  }

  if (item.kind === 'variant') {
    return downloadHls(item.url, item.variant ?? null, delegate);
  }

  if (item.kind === 'hls') {
    return downloadHls(item.url, null, delegate);
  }
}