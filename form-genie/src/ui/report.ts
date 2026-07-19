/** Renders a fill report; suggestions are tappable to accept and re-fill. */
import { FillResult } from '../engine/fill';
import { FIELD_CATALOG } from '../profile/schema';

const ICON: Record<string, string> = {
  filled: '✅', skipped: '⏭️', unmatched: '❓', suggested: '💡', error: '⚠️',
};

export function renderReport(
  results: FillResult[],
  onAcceptSuggestion: (fingerprint: string) => void,
  onTeach: () => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '6px';

  const counts = tally(results);
  const summary = document.createElement('div');
  summary.className = 'count-row';
  summary.innerHTML =
    `<span><b>${counts.filled}</b> filled</span>` +
    `<span><b>${counts.skipped}</b> skipped</span>` +
    `<span><b>${counts.suggested}</b> suggested</span>` +
    `<span><b>${counts.unmatched}</b> unmatched</span>`;
  wrap.appendChild(summary);

  // Suggestions first (actionable), then filled/skipped, then unmatched.
  const order: FillResult['status'][] = ['suggested', 'unmatched', 'error', 'filled', 'skipped'];
  const sorted = [...results].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  for (const r of sorted) {
    const item = document.createElement('div');
    item.className = 'report-item' + (r.status === 'suggested' || r.status === 'unmatched' ? ' act' : '');

    const ico = document.createElement('span');
    ico.className = 'ico';
    ico.textContent = ICON[r.status] ?? '•';
    item.appendChild(ico);

    const label = r.match.key ? FIELD_CATALOG[r.match.key]?.label ?? r.match.key : '(unmatched)';
    const desc = r.match.descriptor.text.slice(0, 40) || '(no label)';
    const info = document.createElement('div');
    info.innerHTML =
      `<div>${escapeHtml(label)}</div>` +
      `<div class="meta">${escapeHtml(desc)}${r.reason ? ' · ' + escapeHtml(r.reason) : ''}` +
      `${r.status === 'suggested' ? ` · ${(r.match.confidence * 100) | 0}%` : ''}</div>`;
    item.appendChild(info);

    if (r.status === 'suggested') {
      item.title = 'Tap to accept this suggestion';
      item.addEventListener('click', () => onAcceptSuggestion(r.match.fingerprint));
    } else if (r.status === 'unmatched') {
      item.title = 'Tap to map this field (teach)';
      item.addEventListener('click', () => onTeach());
    }
    wrap.appendChild(item);
  }

  return wrap;
}

function tally(results: FillResult[]) {
  const c = { filled: 0, skipped: 0, suggested: 0, unmatched: 0, error: 0 };
  for (const r of results) c[r.status]++;
  return c;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
}
