import type { MediaItem, Variant, ProgressCardController } from '../types';
import { getText, blobRegistry } from './network';
import { parseManifest, calcDuration, estimateHlsSize, isFmp4 as checkFmp4 } from './parser';
import { downloadSegments } from './download-engine';
import { enrichNow } from './enrichment';
import { cleanFilename, guessExt, formatBytes, formatDuration } from '../utils';

// ============================================
// Types
// ============================================

type CreateCardFn = (title: string, src: string, segs?: number) => ProgressCardController;
type PickVariantFn = (items: MediaItem[]) => Promise<MediaItem | null>;
type SetBusyFn = (busy: boolean) => void;

// ============================================
// Base Downloader Helper
// ============================================

class BaseDownloader {
  constructor(
    protected createCard: CreateCardFn,
    protected title: string,
    protected src: string,
    protected segs = 0
  ) { }

  public start(url: string, cleanup: () => void): void {
    const card = this.createCard(this.title, this.src, this.segs);

    card.setOnCancel(() => {
      cleanup();
      card.remove();
    });

    // Common GM_download wrapper
    GM_download({
      url,
      name: this.title,
      saveAs: true,
      onprogress: (e) => {
        if (e.lengthComputable) {
          card.update((e.loaded / e.total) * 100, `${formatBytes(e.loaded)}/${formatBytes(e.total)}`);
        } else {
          card.update(0, formatBytes(e.loaded));
        }
      },
      onload: () => {
        card.update(100, '');
        card.done(true);
        cleanup();
        GM_notification({
          text: `Download complete: ${this.title}`,
          title: 'StreamGrabber',
          timeout: 3000,
        });
      },
      onerror: (err) => {
        const errorMsg = err?.error || 'unknown';
        const details = err?.details || '';
        console.error('[SG] Download error:', { error: errorMsg, details, url });
        card.done(false, errorMsg === 'not_succeeded' ? 'Save failed' : errorMsg);
        cleanup();
      },
      ontimeout: () => {
        card.done(false, 'Timeout');
        cleanup();
      },
    });
  }
}


export async function downloadDirect(
  url: string,
  createCard: CreateCardFn
): Promise<void> {
  console.log('[SG] Direct download:', url);

  const info = blobRegistry.get(url);
  const ext = guessExt(url, info?.type);
  const filename = `${cleanFilename(document.title)}.${ext}`;

  let dlUrl = url;
  let cleanup = () => { };

  if (info?.blob) {
    dlUrl = URL.createObjectURL(info.blob);
    cleanup = () => URL.revokeObjectURL(dlUrl);
  }

  new BaseDownloader(createCard, filename, url).start(dlUrl, cleanup);
}

// ============================================
// HLS Download
// ============================================

export async function downloadHls(
  url: string,
  preVariant: Variant | null,
  createCard: CreateCardFn,
  pickVariant: PickVariantFn
): Promise<void> {
  console.log('[SG] HLS download:', url);

  const txt = await getText(url);
  const man = parseManifest(txt, url);

  let mediaUrl = url;
  let chosenVariant = preVariant;

  // Master playlist: prompt for variant
  if (man.isMaster && man.variants && man.variants.length > 0) {
    const variants = [...man.variants].sort(
      (a, b) => (b.h || 0) - (a.h || 0) || (b.avg || b.peak || 0) - (a.avg || a.peak || 0)
    );

    if (variants.length === 0) {
      throw new Error('No variants found');
    }

    // Build variant items for picker
    const items: MediaItem[] = [];

    for (const v of variants) {
      let label = [
        v.res,
        (v.avg || v.peak) ? `${Math.round((v.avg || v.peak)! / 1000)}k` : null,
      ].filter(Boolean).join(' • ') || 'Variant';

      let size: number | null = null;

      try {
        const mediaTxt = await getText(v.url);
        const vMan = parseManifest(mediaTxt, v.url);

        if (vMan.segments) {
          const duration = calcDuration(vMan.segments);
          const est = estimateHlsSize(
            { segs: vMan.segments, mediaSeq: vMan.mediaSeq ?? 0, endList: vMan.endList ?? false },
            duration,
            v
          );

          if (est.bytes != null) {
            size = est.bytes;
            label += ` • ~${formatBytes(size)}`;
          }

          if (duration > 0) {
            const dur = formatDuration(duration);
            if (dur) label = `${label} • ${dur}`;
          }
        }
      } catch { /* ignore variant parsing errors */ }

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

    const selected = await pickVariant(items);
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
  const name = cleanFilename(document.title);
  const quality = chosenVariant?.res ? `_${chosenVariant.res}` : '';
  const filename = `${name}${quality}.${ext}`;

  // For HLS, we use the engine which drives the card,
  // but we can potentially unify the card creation here if we refactor engine too.
  // Ideally, downloadSegments should take the downloader or card.
  // For now, let's leave downloadSegments as is but reuse the card creation logic if possible?
  // Actually downloadSegments *takes* a card.
  // Let's keep it simple for HLS as it's more complex than direct download.
  const card = createCard(filename, url, parsed.segs.length);

  await downloadSegments(parsed, filename, ext, fmp4, url, card);
}

// ============================================
// Handle Item (dispatch to correct downloader)
// ============================================

export async function handleItem(
  item: MediaItem,
  createCard: CreateCardFn,
  pickVariant: PickVariantFn,
  setFabBusy: SetBusyFn
): Promise<void> {
  // Handle remote items (blobs from child frames)
  if (item.isRemote && item.remoteWin) {
    if (item.remoteWin.closed) {
      throw new Error('Source frame is gone');
    }

    // For non-blob remote items, download directly from top
    if (!item.url.startsWith('blob:')) {
      if (item.kind === 'hls') {
        return downloadHls(item.url, null, createCard, pickVariant);
      }
      if (item.kind === 'video') {
        return downloadDirect(item.url, createCard);
      }
    }

    // Blob items need to be downloaded in their origin frame
    item.remoteWin.postMessage({
      type: 'SG_CMD_DOWNLOAD',
      payload: { url: item.url, kind: item.kind, variant: item.variant },
    }, '*');
    return;
  }

  // Ensure HLS items are enriched
  if (item.kind === 'hls' && !item.enriched) {
    setFabBusy(true);
    try {
      if (item._enrichPromise) {
        await item._enrichPromise;
      } else {
        await enrichNow(item);
      }
    } catch (e) {
      throw new Error(`Failed to analyze stream: ${(e as Error).message}`);
    } finally {
      setFabBusy(false);
    }

    if (item.hlsType === 'error' || item.hlsType === 'invalid') {
      throw new Error('Cannot download: Stream analysis failed or invalid');
    }
  }

  // Dispatch
  if (item.kind === 'video') {
    return downloadDirect(item.url, createCard);
  }

  if (item.kind === 'variant') {
    return downloadHls(item.url, item.variant ?? null, createCard, pickVariant);
  }

  if (item.kind === 'hls') {
    return downloadHls(item.url, null, createCard, pickVariant);
  }
}