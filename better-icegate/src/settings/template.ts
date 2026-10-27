const key = 'better-icegate.sb-template.v1';

export const defaultTemplate = 'Dear Sir,\n\nFind below Shipping Bill Number:\n\nJob No{tab}SB Number{tab}SB Date\n{job}{tab}{sb}{tab}{date}';
export const templatePlaceholders = ['{job}', '{sb}', '{date}', '{location}', '{tab}'];

/** Per-browser template storage; only a customised template is stored, so default changes reach everyone else. */
export function templateStore(storageKey: string, fallback: string) {
  return {
    read(): string {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved?.trim() ? saved : fallback;
      } catch { return fallback; }
    },
    save(template: string): void {
      try {
        if (template.trim() && template !== fallback) localStorage.setItem(storageKey, template);
        else localStorage.removeItem(storageKey);
      } catch { /* storage unavailable */ }
    },
    isEvent: (event: StorageEvent) => event.key === storageKey || event.key === null,
  };
}

const sbStore = templateStore(key, defaultTemplate);
export const readTemplate = sbStore.read;
export const saveTemplate = sbStore.save;
export const isTemplateStorageEvent = sbStore.isEvent;

/** Replaces `{name}` with its value and `{tab}` with a tab; unknown names stay as typed. */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => name === 'tab' ? '\t' : Object.hasOwn(values, name) ? values[name] : match);
}

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);
const cellStyle = 'border:1px solid #000;padding:4px 10px;';

/** Lines with tabs become a bordered table (so Gmail keeps the cells); other lines stay paragraphs. */
export function templateToHtml(text: string): string {
  const out: string[] = [];
  let table: string[][] = [];
  const flush = () => {
    if (!table.length) return;
    const rows = table.map((cells, index) => `<tr>${cells.map(cell => `<td style="${cellStyle}${table.length > 1 && index === 0 ? 'font-weight:bold;' : ''}">${escapeHtml(cell.trim())}</td>`).join('')}</tr>`);
    out.push(`<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;border:1px solid #000;"><tbody>${rows.join('')}</tbody></table>`);
    table = [];
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.includes('\t')) { table.push(line.split('\t')); continue; }
    flush();
    out.push(line.trim() ? `<div>${escapeHtml(line)}</div>` : '<div><br></div>');
  }
  flush();
  return out.join('');
}
