const key = 'better-icegate.sb-template.v1';

export const defaultTemplate = 'Dear Sir,\n\nFind below Shipping Bill Number:\n\nJob No{tab}SB Number{tab}SB Date\n{job}{tab}{sb}{tab}{date}';
export const templatePlaceholders = ['{job}', '{sb}', '{date}', '{location}', '{tab}'];

export interface SbValues { job: string; sb: string; date: string; location: string }

export function readTemplate(): string {
  try {
    const saved = localStorage.getItem(key);
    return saved?.trim() ? saved : defaultTemplate;
  } catch { return defaultTemplate; }
}

export function saveTemplate(template: string): void {
  try {
    if (template.trim() && template !== defaultTemplate) localStorage.setItem(key, template);
    else localStorage.removeItem(key);
  } catch { /* storage unavailable */ }
}

export function renderTemplate(template: string, values: SbValues): string {
  return template.replace(/\{(job|sb|date|location|tab)\}/g, (_, name: keyof SbValues | 'tab') => name === 'tab' ? '\t' : values[name]);
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

export function isTemplateStorageEvent(event: StorageEvent): boolean {
  return event.key === key || event.key === null;
}
