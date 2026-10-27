const key = 'better-icegate.sb-template.v1';

export const defaultTemplate = 'Dear Sir,\n\nFind below Shipping Bill Number:\n\nJob No{tab}SB Number{tab}SB Date\n{job}{tab}{sb}{tab}{date}';
export const templatePlaceholders = ['{job}', '{sb}', '{date}', '{location}', '{tab}'];

declare const GM_getValue: ((name: string, fallback?: string) => string | undefined) | undefined;
declare const GM_setValue: ((name: string, value: string) => void) | undefined;
declare const GM_deleteValue: ((name: string) => void) | undefined;
declare const GM_addValueChangeListener: ((name: string, listener: () => void) => unknown) | undefined;

const managerStorage = () => typeof GM_getValue === 'function' && typeof GM_setValue === 'function' && typeof GM_deleteValue === 'function';

/**
 * Template storage shared by every ICEGATE site through the userscript manager (the panel and the
 * eSANCHIT page are different origins), falling back to localStorage. Only a customised template is
 * stored, so default changes reach everyone else.
 */
export function templateStore(storageKey: string, fallback: string) {
  const local = (): string | null => { try { return localStorage.getItem(storageKey); } catch { return null; } };
  const dropLocal = () => { try { localStorage.removeItem(storageKey); } catch { /* storage unavailable */ } };
  return {
    read(): string {
      let saved: string | null | undefined;
      if (managerStorage()) {
        saved = GM_getValue!(storageKey, '');
        const legacy = local();
        // Move a template saved before the manager storage existed, once.
        if (!saved?.trim() && legacy?.trim()) { GM_setValue!(storageKey, legacy); dropLocal(); saved = legacy; }
      } else saved = local();
      return saved?.trim() ? saved : fallback;
    },
    save(template: string): void {
      const custom = template.trim() && template !== fallback;
      if (managerStorage()) {
        if (custom) GM_setValue!(storageKey, template); else GM_deleteValue!(storageKey);
        dropLocal();
        return;
      }
      try {
        if (custom) localStorage.setItem(storageKey, template); else localStorage.removeItem(storageKey);
      } catch { /* storage unavailable */ }
    },
    /** Calls `listener` when another tab or site changes the template; returns an unsubscribe. */
    subscribe(listener: () => void): () => void {
      let active = true;
      const notify = () => { if (active) listener(); };
      if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener(storageKey, notify);
        return () => { active = false; };
      }
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) notify(); };
      window.addEventListener('storage', onStorage);
      return () => { active = false; window.removeEventListener('storage', onStorage); };
    },
  };
}

const sbStore = templateStore(key, defaultTemplate);
export const readTemplate = sbStore.read;
export const saveTemplate = sbStore.save;
export const subscribeTemplate = sbStore.subscribe;

/** Replaces `{name}` with its value and `{tab}` with a tab; unknown names stay as typed. */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => name === 'tab' ? '\t' : Object.hasOwn(values, name) ? values[name] : match);
}

/** Like `renderTemplate`, but every line using a row field (`{drn}` ...) is repeated once per row. */
export function renderRows(template: string, rows: Record<string, string>[]): string {
  const fields = new Set(rows.flatMap(Object.keys));
  const usesRow = (line: string) => [...line.matchAll(/\{(\w+)\}/g)].some(([, name]) => fields.has(name));
  return template.replace(/\r\n?/g, '\n').split('\n')
    .flatMap(line => usesRow(line) ? rows.map(row => renderTemplate(line, row)) : [renderTemplate(line, {})])
    .join('\n');
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
