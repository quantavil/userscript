const boardInputListeners = new Set<() => void>();
let moveRevision = 0;

export function onBoardInput(cb: () => void): () => boolean {
  boardInputListeners.add(cb);
  return () => boardInputListeners.delete(cb);
}

/** Share trusted left-button/touch input with adapters that watch a larger input region. */
export function notifyBoardInput(event: Event): void {
  if (!event.isTrusted) return;
  if ('button' in event && typeof (event as MouseEvent).button === 'number' && (event as MouseEvent).button !== 0) {
    return;
  }
  cancelPendingMove();
  for (const listener of [...boardInputListeners]) listener();
}

export function cancelPendingMove(): void {
  moveRevision++;
}

export function getMoveRevision(): number {
  return moveRevision;
}
