import type { MediaItem, SGMessage } from './types';
import { CFG } from './config';
import { state } from './state';
import { queueEnrich } from './core/enrichment';

// ============================================
// Types
// ============================================

type PickerResolver = (item: MediaItem | null) => void;
type ControlHandler = {
  onStop?: () => void;
  onCancel?: () => void;
};

const pickerRequests = new Map<string, PickerResolver>();
const controlHandlers = new Map<string, ControlHandler>();

// ============================================
// Callbacks (set by UI layer)
// ============================================

type RemoteItemCallback = (item: MediaItem) => void;
type ProgressStartCallback = (id: string, title: string, src: string, source: Window) => void;
type ProgressUpdateCallback = (id: string, p: number, txt: string) => void;
type ProgressDoneCallback = (id: string, ok: boolean, msg: string) => void;
type PickCallback = (id: string, items: MediaItem[], title: string, source: Window) => void;

let onRemoteItem: RemoteItemCallback = () => {};
let onProgressStart: ProgressStartCallback = () => {};
let onProgressUpdate: ProgressUpdateCallback = () => {};
let onProgressDone: ProgressDoneCallback = () => {};
let onPick: PickCallback = () => {};

export function setMessagingCallbacks(cbs: {
  onRemoteItem?: RemoteItemCallback;
  onProgressStart?: ProgressStartCallback;
  onProgressUpdate?: ProgressUpdateCallback;
  onProgressDone?: ProgressDoneCallback;
  onPick?: PickCallback;
}): void {
  if (cbs.onRemoteItem) onRemoteItem = cbs.onRemoteItem;
  if (cbs.onProgressStart) onProgressStart = cbs.onProgressStart;
  if (cbs.onProgressUpdate) onProgressUpdate = cbs.onProgressUpdate;
  if (cbs.onProgressDone) onProgressDone = cbs.onProgressDone;
  if (cbs.onPick) onPick = cbs.onPick;
}

// ============================================
// Message Handler
// ============================================

function handleMessage(ev: MessageEvent): void {
  const data = ev.data as SGMessage | null;
  if (!data || typeof data !== 'object' || !data.type) return;
  
  // Child frame messages (handled by top only)
  if (CFG.IS_TOP) {
    switch (data.type) {
      case 'SG_DETECT': {
        if (!data.item) break;
        const item = data.item as MediaItem;
        item.remoteWin = ev.source as Window;
        item.isRemote = true;
        
        if (state.addItem(item)) {
          onRemoteItem(item);
          if (item.kind === 'hls') {
            queueEnrich(item.url);
          }
        }
        break;
      }
      
      case 'SG_PROGRESS_START': {
        const { id, title, src } = data.payload as { id: string; title: string; src: string };
        onProgressStart(id, title, src, ev.source as Window);
        break;
      }
      
      case 'SG_PROGRESS_UPDATE': {
        const { id, p, txt } = data.payload as { id: string; p: number; txt: string };
        onProgressUpdate(id, p, txt);
        break;
      }
      
      case 'SG_PROGRESS_DONE': {
        const { id, ok, msg } = data.payload as { id: string; ok: boolean; msg: string };
        onProgressDone(id, ok, msg);
        break;
      }
      
      case 'SG_CMD_PICK': {
        const { id, items, title } = data.payload as {
          id: string;
          items: MediaItem[];
          title: string;
        };
        onPick(id, items, title, ev.source as Window);
        break;
      }
    }
  }
  
  // Messages from top (handled by all frames)
  switch (data.type) {
    case 'SG_CMD_DOWNLOAD': {
      const { url, kind, variant } = data.payload as {
        url: string;
        kind: string;
        variant?: unknown;
      };
      // Will be handled by download engine in Phase 3
      console.log('[SG] CMD_DOWNLOAD received:', { url, kind, variant });
      break;
    }
    
    case 'SG_CMD_PICK_RESULT': {
      const { id, item } = data.payload as { id: string; item: MediaItem | null };
      const resolver = pickerRequests.get(id);
      if (resolver) {
        pickerRequests.delete(id);
        resolver(item);
      }
      break;
    }
    
    case 'SG_CMD_CONTROL': {
      const { id, action } = data.payload as { id: string; action: 'cancel' | 'stop' };
      const handler = controlHandlers.get(id + '_ctrl');
      if (handler) {
        if (action === 'cancel') handler.onCancel?.();
        if (action === 'stop') handler.onStop?.();
      }
      break;
    }
  }
}

// ============================================
// Send Messages
// ============================================

export function postToTop(message: SGMessage): void {
  window.top?.postMessage(message, '*');
}

export function postToChild(target: Window, message: SGMessage): void {
  target.postMessage(message, '*');
}

export function sendDetection(item: MediaItem): void {
  postToTop({
    type: 'SG_DETECT',
    item: JSON.parse(JSON.stringify(item)),
  });
}

export function sendProgressStart(id: string, title: string, src: string): void {
  postToTop({
    type: 'SG_PROGRESS_START',
    payload: { id, title, src },
  });
}

export function sendProgressUpdate(id: string, p: number, txt: string): void {
  postToTop({
    type: 'SG_PROGRESS_UPDATE',
    payload: { id, p, txt },
  });
}

export function sendProgressDone(id: string, ok: boolean, msg: string): void {
  postToTop({
    type: 'SG_PROGRESS_DONE',
    payload: { id, ok, msg },
  });
}

export function registerPickerRequest(id: string, resolver: PickerResolver): void {
  pickerRequests.set(id, resolver);
}

export function registerControlHandler(id: string, handler: ControlHandler): void {
  controlHandlers.set(id + '_ctrl', handler);
}

export function sendPickResult(target: Window, id: string, item: MediaItem | null): void {
  postToChild(target, {
    type: 'SG_CMD_PICK_RESULT',
    payload: { id, item },
  });
}

// ============================================
// Initialization
// ============================================

let initialized = false;

export function initMessaging(): void {
  if (initialized) return;
  initialized = true;
  
  window.addEventListener('message', handleMessage);
}