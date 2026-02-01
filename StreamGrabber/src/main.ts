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
import type { MediaItem, ProgressCardController } from './types';

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
  });
  
  // Wire enrichment to state (fixes circular dependency)
  setGetItemFn((url) => state.getItem(url));
  
  // Mount UI (top frame only)
  if (CFG.IS_TOP) {
    mountUI();
    registerMenuCommands();
  }
  
  // Initialize messaging
  initMessaging();
  
  // Set up messaging callbacks
  setMessagingCallbacks({
    onRemoteItem: () => {
      showFab();
      updateBadge();
    },
    onProgressStart: (id, title, src, source) => {
      if (remoteJobs.has(id)) return;
      
      const card = createProgress(title, src);
      card.setOnStop(() => {
        source.postMessage({
          type: 'SG_CMD_CONTROL',
          payload: { id, action: 'stop' },
        }, '*');
        return 'paused';
      });
      card.setOnCancel(() => {
        source.postMessage({
          type: 'SG_CMD_CONTROL',
          payload: { id, action: 'cancel' },
        }, '*');
        card.remove();
        remoteJobs.delete(id);
      });
      
      remoteJobs.set(id, card);
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
      pickFromList(items, { title, filterable: true }).then(selected => {
        source.postMessage({
          type: 'SG_CMD_PICK_RESULT',
          payload: { id, item: selected },
        }, '*');
      });
    },
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
      // Forward to top frame
      sendDetection(item);
    }
  });
  
  // Set up enrichment callback
  setEnrichCallback(() => {
    refreshUI();
  });
  
  // Set up UI callbacks
  setUICallbacks({
    onFabClick: handleFabClickAction,
    onItemSelected: handleItemAction,
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
  
  // Start detection
  initDetection();
  
  console.log('[SG] Initialization complete');
}

// ============================================
// Action Handlers
// ============================================

async function handleFabClickAction(): Promise<void> {
  setFabBusy(true);
  
  try {
    const items = state.getFilteredItems();
    
    const selected = await pickFromList(items, {
      title: 'Select Media',
      filterable: true,
    });
    
    if (!selected) return;
    
    await handleItemAction(selected);
  } catch (e) {
    const error = e as Error;
    alert(error.message || String(e));
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
    const error = e as Error;
    alert(error.message || String(e));
  }
}

// ============================================
// Run
// ============================================

init();

// ============================================
// Exports (for advanced usage)
// ============================================

export { state };
export { getText, getBin, headMeta, blobRegistry } from './core/network';
export { parseManifest, calcDuration, computeExactBytes, isFmp4, hasEncryption } from './core/parser';
export { aesCbcDecrypt, hexToU8, ivFromSeq } from './core/crypto';
export { queueEnrich, enrichNow, needsEnrichment } from './core/enrichment';
export { downloadDirect, downloadHls, handleItem } from './core/download';
export { initMessaging, sendDetection, postToTop, postToChild } from './messaging';
export * from './utils';
export * from './types';
export * from './config';