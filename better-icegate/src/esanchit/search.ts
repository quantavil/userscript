export interface DocType { value: string; code: string; label: string }

const recentLimit = 5;

export function parseDocType(value: string, text: string): DocType | null {
  if (!value || value === 'NONE') return null;
  const source = text.trim() || value.trim();
  const dash = source.indexOf('-');
  if (dash <= 0) return { value, code: '', label: source };
  return { value, code: source.slice(0, dash).trim(), label: source.slice(dash + 1).trim() };
}

function wordStarts(label: string, token: string): boolean {
  return label.split(/[^a-z0-9]+/).some(word => word.startsWith(token));
}

/** Every query word must match the code or label; code, label-start and word-start matches rank first. */
export function searchDocTypes(items: DocType[], query: string): DocType[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return items;
  const ranked: { item: DocType; score: number; order: number }[] = [];
  items.forEach((item, order) => {
    const code = item.code.toLowerCase();
    const label = item.label.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (code.startsWith(token)) score += 0;
      else if (label.startsWith(token)) score += 1;
      else if (wordStarts(label, token)) score += 2;
      else if (code.includes(token) || label.includes(token)) score += 3;
      else return;
    }
    ranked.push({ item, score, order });
  });
  return ranked.sort((a, b) => a.score - b.score || a.order - b.order).map(entry => entry.item);
}

export function pushRecent(recent: string[], value: string): string[] {
  return [value, ...recent.filter(existing => existing !== value)].slice(0, recentLimit);
}

export function readRecent(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, recentLimit) : [];
  } catch { return []; }
}
