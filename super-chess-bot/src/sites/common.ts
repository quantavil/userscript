/**
 * @license GPL-3.0-or-later
 *
 * Super Chess Bot - Shared site adapter helpers
 */

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export function isVisibleBoard(board: HTMLElement): boolean {
  try {
    if (board.isConnected === false) return false;
    const view = board.ownerDocument?.defaultView;
    const style =
      view?.getComputedStyle(board) ?? (typeof getComputedStyle === 'function' ? getComputedStyle(board) : null);
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
    if (typeof board.getClientRects === 'function' && board.getClientRects().length === 0) return false;
    const rect = board.getBoundingClientRect?.();
    return !rect || (rect.width > 0 && rect.height > 0);
  } catch {
    return false;
  }
}
