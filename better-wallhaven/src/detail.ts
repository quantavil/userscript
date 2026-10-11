import type { FullMeta } from './cache';
import type { ThumbMeta } from './extract';
import { esc } from './api';

export type SheetState = 'loading' | 'ready' | 'error';

/** Props already visible in the persistent chips row — never repeat them. */
const OMIT_PROPS = new Set(['Resolution', 'Favorites', 'Type']);

/** Pure builder for the below-thumbnail HD block. Zero DOM, fully tested. */
export function buildDetailHtml(_free: ThumbMeta, meta: FullMeta | null, state: SheetState): string {
  if (state === 'loading' || !meta) {
    const hint = state === 'error' ? 'HD fetch failed. Click again to retry.' : 'Loading HD info (4KB)…';
    return `<div class="whs-hint">${hint}</div>`;
  }

  // Ready: headline is file size only — res/favs/type already live in the chips row.
  const props = meta.properties.filter(([k]) => !OMIT_PROPS.has(k));
  const head = `<div class="whs-stats"><span class="whs-size"><span class="whs-label">Size:</span> ${meta.size || '—'}</span></div>`;
  const propsHtml = props.length > 0
    ? `<dl class="whs-props">${props.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`
    : '';
  const tags = meta.tagsHtml ? `<ul class="whs-tags">${meta.tagsHtml}</ul>` : '';
  return `${head}${propsHtml}${tags}`;
}
