import { readEsanchitTemplate } from '../settings/esanchit-template';
import { renderRows } from '../settings/template';
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
  const values = {
    drn: field(row, 'input[id^="drn_"]'),
    irn: field(row, 'input[id^="irn_"]'),
    file: field(row, 'textarea[id^="fileName_"]'),
    date: field(row, 'input[id^="startDate_"]'),
    status: field(row, 'input[id^="digiSignValidated_"]'),
    type: documentType(row),
  };
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.replace(/\s+/g, ' ').trim()]));
}

function flash(button: HTMLButtonElement, restore: string, ok: boolean) {
  button.textContent = ok ? '✓' : '!';
  setTimeout(() => { button.innerHTML = restore; }, 1500);
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
    void copyRich(renderRows(readEsanchitTemplate(), [rowValues(row)]))
      .then(() => flash(template, templateIcon, true)).catch(() => flash(template, templateIcon, false));
  });
  tools.append(template);
  anchor.append(tools);
}

/** The template with its row line repeated for every upload row. */
function tableText(table: HTMLTableElement): string {
  const rows = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].filter(row => row.querySelector(rowSelector)).map(rowValues);
  return renderRows(readEsanchitTemplate(), rows);
}

/** Sits beside the portal's "Upload Documents" button (just above the table if that button is missing). */
function addCopyTable(table: HTMLTableElement) {
  const upload = document.getElementById('modal');
  const holder = table.closest('.divUpload') ?? table;
  if ((upload?.parentElement ?? holder.parentElement)?.querySelector('.better-icegate-copy-table')) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'btn btn-outline-primary btn-sm better-icegate-copy-table'; button.textContent = 'Copy table';
  button.title = 'Copy the email template with every row of the upload table';
  button.addEventListener('click', () => {
    void copyRich(tableText(table))
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
