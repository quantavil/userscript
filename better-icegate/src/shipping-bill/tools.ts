export type DatePreset = 'today' | 'yesterday' | 'week' | 'month';
export const presets: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 days' }, { id: 'month', label: 'This month' },
];
export function dateRange(preset: DatePreset, now = new Date()): [string, string] {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (preset === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  if (preset === 'week') start.setDate(start.getDate() - 6);
  if (preset === 'month') start.setDate(1);
  const format = (date: Date) => [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('-');
  return [format(start), format(end)];
}
export function toCsv(rows: string[][]): string {
  return rows.map(row => row.map(value => {
    const safe = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
