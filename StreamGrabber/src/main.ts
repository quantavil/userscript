import { CFG } from './config';
import { state } from './state';
import { initDetection, setItemDetectedCallback } from './detection';
import { queueEnrich } from './core/enrichment';
import { initMessaging, sendDetection, registerPickerRequest, resolvePickerRequest } from './messaging';
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
import { shortId, alertError } from './utils/index';
import { MessageBus } from './core/message-bus';
import { RemoteProgressCard } from './core/remote-progress-card';

// ============================================
// Remote Jobs (cross-frame progress cards)
// ============================================

const remoteJobs = new Map<string, ProgressCardController>();

// ============================================
// Initialization
// ============================================

function init(): void {
  console.log(`[SG] StreamGrabber v${GM_info?.script?.version || '2.1.3'} initializing...`, {
    isTop: CFG.IS_TOP,
    readyState: document.readyState,
    href: location.href.slice(0, 100),
  });

  // Wire enrichment to state (fixes circular dependency)
  // No longer needed: setGetItemFn((url) => state.getItem(url));

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

  // Set up MessageBus handlers
  if (CFG.IS_TOP) {
    setupTopHandlers();
  } else {
    setupChildHandlers();
  }

  // Set up detection callback
  setItemDetectedCallback((item: MediaItem) => {
    if (CFG.IS_TOP) {
      console.log('[SG] Detected:', item.kind, item.url.slice(0, 60));
      showFab();
      updateBadge();

      if (item.kind === 'hls') {
        queueEnrich(item, () => refreshUI());
      }
    } else {
      console.log('[SG] [iframe] Forwarding detection:', item.kind, item.url.slice(0, 60));
      sendDetection(item);
    }
  });

  // Set up state subscriptions
  state.events.itemAdded.subscribe(() => {
    showFab();
    updateBadge();
  });

  state.events.updated.subscribe(() => {
    refreshUI();
  });

  // Start detection (all frames)
  initDetection();

  console.log('[SG] Initialization complete', { isTop: CFG.IS_TOP });
}

function setupTopHandlers(): void {
  const bus = MessageBus.get();

  // 1. Detection from iframes
  bus.on('SG_DETECT', (payload, source) => {
    const remoteItem = payload.item as MediaItem;
    if (!remoteItem) return;

    remoteItem.remoteWin = source;
    remoteItem.isRemote = true;

    console.log('[SG] Received detection from iframe:', remoteItem.kind, remoteItem.url.slice(0, 60));

    if (state.addItem(remoteItem)) {
      showFab();
      updateBadge();
      if (remoteItem.kind === 'hls') {
        queueEnrich(remoteItem, () => refreshUI());
      }
    }
  });

  // 2. Progress Start from iframes
  bus.on('SG_PROGRESS_START', (payload, source) => {
    const { id, title, src } = payload as any;
    if (remoteJobs.has(id)) return;

    try {
      const card = createProgress(title, src);
      // The source (iframe) has a RemoteProgressCard.
      // That RemoteProgressCard listens for SG_CMD_CONTROL via MessageBus.
      // We need to send SG_CMD_CONTROL when this local card is stopped/canceled.

      card.setOnStop(() => {
        MessageBus.get().send('SG_CMD_CONTROL', { id, action: 'stop' }, source);
        return 'paused';
      });
      card.setOnCancel(() => {
        MessageBus.get().send('SG_CMD_CONTROL', { id, action: 'cancel' }, source);
        card.remove();
        remoteJobs.delete(id);
      });

      remoteJobs.set(id, card);
    } catch (e) {
      console.error('[SG] Failed to create remote progress card:', e);
    }
  });

  // 3. Progress Update from iframes
  bus.on('SG_PROGRESS_UPDATE', (payload) => {
    const { id, p, txt } = payload as any;
    remoteJobs.get(id)?.update(p, txt);
  });

  // 4. Progress Done from iframes
  bus.on('SG_PROGRESS_DONE', (payload) => {
    const { id, ok, msg } = payload as any;
    const card = remoteJobs.get(id);
    if (card) {
      card.done(ok, msg);
      setTimeout(() => remoteJobs.delete(id), 2500);
    }
  });

  // 5. Picker Request from iframes
  bus.on('SG_CMD_PICK', (payload, source) => {
    const { id, items, title } = payload as any;
    // We must pass a UI picker here
    pickFromList(items, { title, filterable: true }).then((selected) => {
      MessageBus.get().send('SG_CMD_PICK_RESULT', { id, item: selected }, source);
    });
  });
}

function setupChildHandlers(): void {
  const bus = MessageBus.get();

  // 1. Download Command from Top Frame
  bus.on('SG_CMD_DOWNLOAD', (payload) => {
    const { url, kind, variant, pageTitle } = payload as any;
    console.log('[SG] [iframe] Received download command:', { url, kind });
    handleDownloadCommand(url, kind, variant, pageTitle);
  });

  // 2. Picker Result from Top Frame
  bus.on('SG_CMD_PICK_RESULT', (payload) => {
    const { id, item } = payload as any;
    resolvePickerRequest(id, item);
  });
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
      {
        createCard: createProgress,
        pickVariant: (items) => pickFromList(items, { title: 'Select Quality', filterable: true }),
        setBusy: setFabBusy,
      }
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
  variant?: unknown,
  pageTitle?: string
): Promise<void> {
  console.log('[SG] [iframe] Received download command:', { url, kind });

  try {
    // simplified using RemoteProgressCard
    const createProxyCard = (title: string, src: string): ProgressCardController => {
      return new RemoteProgressCard(title, src);
    };

    if (kind === 'hls') {
      await downloadHls(
        url,
        variant as Variant | null,
        {
          createCard: createProxyCard,
          pickVariant: async (items) => {
            return new Promise((resolve) => {
              const pickId = shortId();

              // Register resolver
              registerPickerRequest(pickId, resolve);

              // Send request
              MessageBus.get().sendToTop('SG_CMD_PICK', {
                id: pickId,
                items,
                title: 'Select Quality'
              });
            });
          },
          setBusy: () => { },
        },
        pageTitle
      );
    } else if (kind === 'video') {
      await downloadDirect(url, {
        createCard: createProxyCard,
        pickVariant: async () => null,
        setBusy: () => { },
      }, pageTitle);
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
export { getText, getBin, headMeta } from './core/network';
export { blobRegistry } from './core/blob-store';
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
export { initMessaging, sendDetection } from './messaging';
export * from './utils/index';
export * from './types';
export * from './config';