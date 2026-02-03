import type { MediaItem, SGMessage } from './types';
import { CFG } from './config';
import { state } from './state';
import { queueEnrich } from './core/enrichment';
import { serializeMediaItem } from './utils';
import { MessageBus } from './core/message-bus';

// ============================================
// Types
// ============================================

type PickerResolver = (item: MediaItem | null) => void;

const pickerRequests = new Map<string, PickerResolver>();

// ============================================
// Callbacks (set by UI layer)
// ============================================

type RemoteItemCallback = (item: MediaItem) => void;
type ProgressStartCallback = (
  id: string,
  title: string,
  src: string,
  source: Window
) => void;
type ProgressUpdateCallback = (id: string, p: number, txt: string) => void;
type ProgressDoneCallback = (id: string, ok: boolean, msg: string) => void;
type PickCallback = (
  id: string,
  items: MediaItem[],
  title: string,
  source: Window
) => void;
type DownloadCommandCallback = (url: string, kind: string, variant?: unknown) => void;

let onRemoteItem: RemoteItemCallback = () => { };
let onProgressStart: ProgressStartCallback = () => { };
let onProgressUpdate: ProgressUpdateCallback = () => { };
let onProgressDone: ProgressDoneCallback = () => { };
let onPick: PickCallback = () => { };
let onDownloadCommand: DownloadCommandCallback = () => { };

export function setMessagingCallbacks(cbs: {
  onRemoteItem?: RemoteItemCallback;
  onProgressStart?: ProgressStartCallback;
  onProgressUpdate?: ProgressUpdateCallback;
  onProgressDone?: ProgressDoneCallback;
  onPick?: PickCallback;
  onDownloadCommand?: DownloadCommandCallback;
}): void {
  if (cbs.onRemoteItem) onRemoteItem = cbs.onRemoteItem;
  if (cbs.onProgressStart) onProgressStart = cbs.onProgressStart;
  if (cbs.onProgressUpdate) onProgressUpdate = cbs.onProgressUpdate;
  if (cbs.onProgressDone) onProgressDone = cbs.onProgressDone;
  if (cbs.onPick) onPick = cbs.onPick;
  if (cbs.onDownloadCommand) onDownloadCommand = cbs.onDownloadCommand;
}

// ============================================
// Message Handler Setup
// ============================================

function setupHandlers(): void {
  const bus = MessageBus.get();

  if (CFG.IS_TOP) {
    // Top frame handlers
    bus.on('SG_DETECT', (payload, source) => {
      const item = payload.item as MediaItem; // payload.item was passed in sendDetection via wrapper? No, look at logic below.
      // Wait, previous code: item = data.item.
      // SGMessage structure: { type, item, payload }
      // My MessageBus sends { type, payload }.
      // I need to adjust MessageBus or payloads.
      // My MessageBus implementation sends `payload` as the second arg to postMessage?
      // No, MessageBus.send constructs { type, payload }.
      // But `SG_DETECT` historically used `item` property on the root message.
      // I should standardize on `payload`.

      // Adaptation: serialized item comes in payload.item
      if (!payload.item) return;

      const remoteItem = payload.item as MediaItem;
      remoteItem.remoteWin = source;
      remoteItem.isRemote = true;

      console.log(
        '[SG] Received detection from iframe:',
        remoteItem.kind,
        remoteItem.url.slice(0, 60)
      );

      if (state.addItem(remoteItem)) {
        onRemoteItem(remoteItem);
        if (remoteItem.kind === 'hls') {
          queueEnrich(remoteItem.url);
        }
      }
    });

    bus.on('SG_PROGRESS_START', (payload, source) => {
      const { id, title, src } = payload as any;
      onProgressStart(id, title, src, source);
    });

    bus.on('SG_PROGRESS_UPDATE', (payload) => {
      const { id, p, txt } = payload as any;
      onProgressUpdate(id, p, txt);
    });

    bus.on('SG_PROGRESS_DONE', (payload) => {
      const { id, ok, msg } = payload as any;
      onProgressDone(id, ok, msg);
    });

    bus.on('SG_CMD_PICK', (payload, source) => {
      const { id, items, title } = payload as any;
      onPick(id, items, title, source);
    });

  } else {
    // Child frame handlers
    bus.on('SG_CMD_DOWNLOAD', (payload) => {
      const { url, kind, variant } = payload as any;
      console.log('[SG] [iframe] Received download command:', { url, kind });
      onDownloadCommand(url, kind, variant);
    });

    bus.on('SG_CMD_PICK_RESULT', (payload) => {
      const { id, item } = payload as any;
      const resolver = pickerRequests.get(id);
      if (resolver) {
        pickerRequests.delete(id);
        resolver(item);
      }
    });

    // Note: SG_CMD_CONTROL is now handled by RemoteProgressCard directly via bus
  }
}

// ============================================
// Send Messages
// ============================================

export function sendDetection(item: MediaItem): void {
  // Move item to payload
  MessageBus.get().sendToTop('SG_DETECT', {
    item: serializeMediaItem(item)
  });
}

export function sendProgressStart(id: string, title: string, src: string): void {
  MessageBus.get().sendToTop('SG_PROGRESS_START', { id, title, src });
}

export function sendProgressUpdate(id: string, p: number, txt: string): void {
  MessageBus.get().sendToTop('SG_PROGRESS_UPDATE', { id, p, txt });
}

export function sendProgressDone(id: string, ok: boolean, msg: string): void {
  MessageBus.get().sendToTop('SG_PROGRESS_DONE', { id, ok, msg });
}

export function registerPickerRequest(id: string, resolver: PickerResolver): void {
  pickerRequests.set(id, resolver);
}

export function sendPickResult(
  target: Window,
  id: string,
  item: MediaItem | null
): void {
  MessageBus.get().send('SG_CMD_PICK_RESULT', { id, item }, target);
}

// ============================================
// Initialization
// ============================================

export function initMessaging(): void {
  const bus = MessageBus.get();
  bus.init();
  setupHandlers();
  console.log('[SG] Messaging handlers set up via MessageBus');
}