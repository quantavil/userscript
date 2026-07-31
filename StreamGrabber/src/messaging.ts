import type { MediaItem } from './types';
import { MessageBus } from './core/message-bus';
import { serializeMediaItem } from './utils';

// ============================================
// Types
// ============================================

type PickerResolver = (item: MediaItem | null) => void;

const pickerRequests = new Map<string, PickerResolver>();

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

export function resolvePickerRequest(id: string, item: MediaItem | null): void {
  const resolver = pickerRequests.get(id);
  if (resolver) {
    pickerRequests.delete(id);
    resolver(item);
  }
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
  console.log('[SG] Messaging initialized');
}