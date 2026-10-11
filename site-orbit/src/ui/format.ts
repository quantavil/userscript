export function formatRank(value: number | null): string {
  return value === null ? '—' : `#${value.toLocaleString('en')}`;
}

export function formatRankChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value > 0) return `+${value}`;
  return String(value);
}

export function formatDate(value: number | null): string {
  return value === null || !Number.isFinite(value) || value <= 0
    ? 'never'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(value);
}
