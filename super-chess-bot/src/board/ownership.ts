const OVERLAY_ATTR = 'data-engine-layer';
const botOwnedNodes = new WeakSet<Node>();

export function markBotNode<T extends Node>(node: T): T {
  botOwnedNodes.add(node);
  return node;
}

export function isBotOwnedNode(node: Node | null | undefined): boolean {
  let curr: Node | null = node ?? null;
  while (curr) {
    if (botOwnedNodes.has(curr)) return true;
    const el = curr as Element;
    if (
      typeof el.hasAttribute === 'function' &&
      (el.hasAttribute(OVERLAY_ATTR) || el.hasAttribute('data-scb-overlay'))
    ) {
      return true;
    }
    if (typeof el.closest === 'function' && el.closest(`[${OVERLAY_ATTR}], [data-scb-overlay]`)) return true;
    curr = curr.parentNode;
  }
  return false;
}

export function isBotOwnedMutation(record: MutationRecord): boolean {
  if (isBotOwnedNode(record.target)) return true;
  if (record.type !== 'childList') return false;
  const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
  return changedNodes.length > 0 && changedNodes.every(isBotOwnedNode);
}
