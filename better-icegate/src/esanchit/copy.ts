import { readEsanchitTemplate } from '../settings/esanchit-template';
import { renderTemplate } from '../settings/template';
import { copyRich, ensureCopyStyles, templateIcon } from '../shared/copy';

const rowSelector = 'input[id^="drn_"]';
const toolsClass = 'better-icegate-esanchit-tools';

const field = (row: Element, selector: string) => row.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)?.value.trim() ?? '';

function documentType(row: Element): string {
  const control = row.querySelector<HTMLInputElement | HTMLSelectElement>('[id^="docTypeSelect_"]');
  if (control && 'options' in control) {
    const option = control.options[control.selectedIndex];
    return !option || option.value === 'NONE' ? '' : option.textContent?.trim() ?? '';
  }
  return control?.value.trim() ?? '';
}

function rowValues(row: Element): Record<string, string> {
  return {
    drn: field(row, 'input[id^="drn_"]'),
    irn: field(row, 'input[id^="irn_"]'),
    file: field(row, 'textarea[id^="fileName_"]'),
    date: field(row, 'input[id^="startDate_"]'),
    status: field(row, 'input[id^="digiSignValidated_"]'),
    type: documentType(row),
  };
}

function flash(button: HTMLButtonElement, restore: string, ok: boolean) {
  button.textContent = ok ? '✓' : '!';
  if (ok) setTimeout(() => { button.innerHTML = restore; }, 1500);
}

function enhanceRow(row: HTMLTableRowElement) {
  const anchor = row.cells[row.cells.length - 1];
  if (!anchor || anchor.querySelector(`.${toolsClass}`)) return;
  const tools = document.createElement('div');
  tools.className = toolsClass;
  const template = document.createElement('button');
  template.type = 'button'; template.className = 'better-icegate-template'; template.innerHTML = templateIcon;
  template.setAttribute('aria-label', 'Copy eSANCHIT email template');
  template.title = 'Copy email template (edit it in Better ICEGATE settings)';
  template.addEventListener('click', () => {
    void copyRich(renderTemplate(readEsanchitTemplate(), rowValues(row)))
      .then(() => flash(template, templateIcon, true)).catch(() => flash(template, templateIcon, false));
  });
  tools.append(template);
  anchor.append(tools);
}

const tableColumns = [['File Name', 'file'], ['DRN', 'drn'], ['IRN', 'irn'], ['Start Date', 'date'], ['Digital Sign Validated', 'status'], ['Document Type', 'type']] as const;

/** Every upload row as tab-separated text (pasted into Gmail it becomes a bordered table). */
function tableText(table: HTMLTableElement): string {
  const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
  const rows = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].filter(row => row.querySelector(rowSelector))
    .map(row => { const values = rowValues(row); return tableColumns.map(([, key]) => clean(values[key])); });
  return [tableColumns.map(([label]) => label), ...rows].map(cells => cells.join('\t')).join('\n');
}

/** Sits beside the portal's "Upload Documents" button (just above the table if that button is missing). */
function addCopyTable(table: HTMLTableElement) {
  const upload = document.getElementById('modal');
  const holder = table.closest('.divUpload') ?? table;
  if ((upload?.parentElement ?? holder.parentElement)?.querySelector('.better-icegate-copy-table')) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'btn btn-outline-primary btn-sm better-icegate-copy-table'; button.textContent = 'Copy table';
  button.title = 'Copy every row of the upload table';
  button.addEventListener('click', () => {
    void copyRich(tableText(table.isConnected ? table : document.querySelector('table') ?? table))
      .then(() => { button.textContent = 'Copied ✓'; }).catch(() => { button.textContent = 'Copy failed'; })
      .finally(() => setTimeout(() => { button.textContent = 'Copy table'; }, 1500));
  });
  if (upload) upload.after(button); else holder.before(button);
}

function scan() {
  for (const drn of document.querySelectorAll<HTMLInputElement>(rowSelector)) {
    const row = drn.closest('tr');
    const table = row?.closest('table');
    if (!row || !table) continue;
    ensureCopyStyles();
    addCopyTable(table);
    enhanceRow(row);
  }
}

export function startEsanchitCopy() {
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  }).observe(document.body, { childList: true, subtree: true });
  scan();
}
