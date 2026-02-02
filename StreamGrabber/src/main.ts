import { CFG } from './config';
import { state } from './state';
import { initDetection, setItemDetectedCallback } from './detection';
import { queueEnrich, setEnrichCallback, setGetItemFn } from './core/enrichment';
import { initMessaging, sendDetection, setMessagingCallbacks } from './messaging';
import { handleItem, downloadDirect, downloadHls } from './core/download';
import {
  mountUI,
  showFab,
  setFabBusy,
  updateBadge,
  pickFromList,
  createProgress,
  registerMenuCommands,
  setUICallbacks,
  refreshUI,
} from './ui';
import type { MediaItem, ProgressCardController, Variant } from './types';
import { shortId, alertError } from './core/shared';

// ============================================
// Remote Jobs (cross-frame progress cards)
// ============================================

const remoteJobs = new Map<string, ProgressCardController>();

// ============================================
// Initialization
// ============================================

function init(): void {
  console.log('[SG] StreamGrabber v2.0.0 initializing...', {
    isTop: CFG.IS_TOP,
    readyState: document.readyState,
    href: location.href.slice(0, 100),
  });

  // Wire enrichment to state (fixes circular dependency)
  setGetItemFn((url) => state.getItem(url));

  // Set up UI callbacks FIRST (before mounting)
  setUICallbacks({
    onFabClick: handleFabClickAction,
    onItemSelected: handleItemAction,
  });

  // Mount UI (top frame only)
  if (CFG.IS_TOP) {
    mountUI();
    registerMenuCommands();
  }

  // Initialize messaging (all frames need this for cross-frame communication)
  initMessaging();

  // Set up messaging callbacks
  setMessagingCallbacks({
    onRemoteItem: () => {
      showFab();
      updateBadge();
    },
    onProgressStart: (id, title, src, source) => {
      if (remoteJobs.has(id)) return;

      try {
        const card = createProgress(title, src);
        card.setOnStop(() => {
          source.postMessage(
            {
              type: 'SG_CMD_CONTROL',
              payload: { id, action: 'stop' },
            },
            '*'
          );
          return 'paused';
        });
        card.setOnCancel(() => {
          source.postMessage(
            {
              type: 'SG_CMD_CONTROL',
              payload: { id, action: 'cancel' },
            },
            '*'
          );
          card.remove();
          remoteJobs.delete(id);
        });

        remoteJobs.set(id, card);
      } catch (e) {
        console.error('[SG] Failed to create remote progress card:', e);
      }
    },
    onProgressUpdate: (id, p, txt) => {
      remoteJobs.get(id)?.update(p, txt);
    },
    onProgressDone: (id, ok, msg) => {
      const card = remoteJobs.get(id);
      if (card) {
        card.done(ok, msg);
        setTimeout(() => remoteJobs.delete(id), 2500);
      }
    },
    onPick: (id, items, title, source) => {
      pickFromList(items, { title, filterable: true }).then((selected) => {
        source.postMessage(
          {
            type: 'SG_CMD_PICK_RESULT',
            payload: { id, item: selected },
          },
          '*'
        );
      });
    },
    onDownloadCommand: handleDownloadCommand,
  });

  // Set up detection callback
  setItemDetectedCallback((item: MediaItem) => {
    if (CFG.IS_TOP) {
      console.log('[SG] Detected:', item.kind, item.url.slice(0, 60));
      showFab();
      updateBadge();

      if (item.kind === 'hls') {
        queueEnrich(item.url);
      }
    } else {
      console.log('[SG] [iframe] Forwarding detection:', item.kind, item.url.slice(0, 60));
      sendDetection(item);
    }
  });

  // Set up enrichment callback
  setEnrichCallback(() => {
    refreshUI();
  });

  // Set up state callbacks
  state.setCallbacks({
    onItemAdded: () => {
      showFab();
      updateBadge();
    },
    onItemUpdated: () => {
      refreshUI();
    },
  });

  // Start detection (all frames)
  initDetection();

  console.log('[SG] Initialization complete', { isTop: CFG.IS_TOP });
}

// ============================================
// Action Handlers
// ============================================

async function handleFabClickAction(): Promise<void> {
  setFabBusy(true);

  try {
    const items = state.getFilteredItems();

    if (items.length === 0) {
      alert('No media detected yet. Try playing a video first.');
      return;
    }

    const selected = await pickFromList(items, {
      title: 'Select Media',
      filterable: true,
    });

    if (!selected) return;

    await handleItemAction(selected);
  } catch (e) {
    alertError(e);
  } finally {
    setFabBusy(false);
  }
}

async function handleItemAction(item: MediaItem): Promise<void> {
  try {
    await handleItem(
      item,
      createProgress,
      (items) => pickFromList(items, { title: 'Select Quality', filterable: true }),
      setFabBusy
    );
  } catch (e) {
    alertError(e);
  }
}

/**
 * Handle download commands from top frame (for blob URLs in iframes)
 */
async function handleDownloadCommand(
  url: string,
  kind: string,
  variant?: unknown
): Promise<void> {
  console.log('[SG] [iframe] Received download command:', { url, kind });

  try {
    const createProxyCard = (title: string, src: string): ProgressCardController => {
      const id = shortId();

      window.top?.postMessage(
        {
          type: 'SG_PROGRESS_START',
          payload: { id, title, src },
        },
        '*'
      );

      return {
        update(p: number, txt?: string) {
          window.top?.postMessage(
            {
              type: 'SG_PROGRESS_UPDATE',
              payload: { id, p, txt: txt || '' },
            },
            '*'
          );
        },
        done(ok = true, msg?: string) {
          window.top?.postMessage(
            {
              type: 'SG_PROGRESS_DONE',
              payload: { id, ok, msg: msg || '' },
            },
            '*'
          );
        },
        remove() {},
        setOnStop() {},
        setOnCancel() {},
      };
    };

    if (kind === 'hls') {
      await downloadHls(
        url,
        variant as Variant | null,
        createProxyCard,
        async (items) => {
          return new Promise((resolve) => {
            const pickId = shortId();

            const handler = (ev: MessageEvent) => {
              const data = ev.data;
              if (data?.type === 'SG_CMD_PICK_RESULT' && data?.payload?.id === pickId) {
                window.removeEventListener('message', handler);
                resolve(data.payload.item);
              }
            };

            window.addEventListener('message', handler);

            window.top?.postMessage(
              {
                type: 'SG_CMD_PICK',
                payload: { id: pickId, items, title: 'Select Quality' },
              },
              '*'
            );
          });
        }
      );
    } else if (kind === 'video') {
      await downloadDirect(url, createProxyCard);
    }
  } catch (e) {
    console.error('[SG] [iframe] Download error:', e);
  }
}

// ============================================
// Run
// ============================================

init();

// ============================================
// Exports
// ============================================

export { state };
export { getText, getBin, headMeta, blobRegistry } from './core/network';
export {
  parseManifest,
  calcDuration,
  computeExactBytes,
  isFmp4,
  hasEncryption,
} from './core/parser';
export { aesCbcDecrypt, hexToU8, ivFromSeq } from './core/crypto';
export { queueEnrich, enrichNow, needsEnrichment } from './core/enrichment';
export { downloadDirect, downloadHls, handleItem } from './core/download';
export { initMessaging, sendDetection, postToTop, postToChild } from './messaging';
export * from './utils';
export * from './types';
export * from './config';
export * from './core/shared';