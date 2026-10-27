import { defaultEsanchitTemplate, esanchitPlaceholders, readEsanchitTemplate, saveEsanchitTemplate } from '../settings/esanchit-template';
import { renderTemplate } from '../settings/template';
import { copyIcon, copyRich, ensureCopyStyles, templateIcon } from '../shared/copy';

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

function copyButton(label: string, read: () => string): HTMLButtonElement {
  const button = document.createElement('button');
  const html = `${copyIcon}<span>${label}</span>`;
  button.type = 'button'; button.className = 'better-icegate-copy better-icegate-copy-text'; button.innerHTML = html;
  button.setAttribute('aria-label', `Copy ${label}`);
  button.title = button.getAttribute('aria-label') ?? '';
  button.addEventListener('click', () => { void navigator.clipboard.writeText(read()).then(() => flash(button, html, true)).catch(() => flash(button, html, false)); });
  return button;
}

function enhanceRow(row: HTMLTableRowElement) {
  const anchor = row.cells[row.cells.length - 1];
  if (!anchor || anchor.querySelector(`.${toolsClass}`)) return;
  const tools = document.createElement('div');
  tools.className = toolsClass;
  const template = document.createElement('button');
  template.type = 'button'; template.className = 'better-icegate-template'; template.innerHTML = templateIcon;
  template.setAttribute('aria-label', 'Copy eSANCHIT email template');
  template.title = 'Copy email template (edit it with "Email template" above the table)';
  template.addEventListener('click', () => {
    void copyRich(renderTemplate(readEsanchitTemplate(), rowValues(row)))
      .then(() => flash(template, templateIcon, true)).catch(() => flash(template, templateIcon, false));
  });
  tools.append(copyButton('DRN', () => field(row, 'input[id^="drn_"]')), copyButton('IRN', () => field(row, 'input[id^="irn_"]')), template);
  anchor.append(tools);
}

function addEditor(table: HTMLTableElement) {
  const holder = table.closest('.divUpload') ?? table;
  if (holder.previousElementSibling?.classList.contains('better-icegate-esanchit-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'better-icegate-esanchit-bar';
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.textContent = 'Email template'; toggle.setAttribute('aria-expanded', 'false');
  toggle.title = 'Edit the text copied by the green envelope on each row';
  const editor = document.createElement('div');
  editor.className = 'better-icegate-esanchit-editor';
  editor.hidden = true;
  const text = document.createElement('textarea');
  text.rows = 8; text.spellcheck = false; text.value = readEsanchitTemplate();
  text.setAttribute('aria-label', 'eSANCHIT email template');
  text.addEventListener('input', () => saveEsanchitTemplate(text.value));
  const hint = document.createElement('p');
  hint.textContent = `Placeholders: ${esanchitPlaceholders.join(' ')}. Lines with {tab} become a bordered table when pasted into Gmail.`;
  const reset = document.createElement('button');
  reset.type = 'button'; reset.textContent = 'Reset template';
  reset.addEventListener('click', () => { text.value = defaultEsanchitTemplate; saveEsanchitTemplate(defaultEsanchitTemplate); });
  editor.append(text, hint, reset);
  toggle.addEventListener('click', () => {
    editor.hidden = !editor.hidden;
    toggle.setAttribute('aria-expanded', String(!editor.hidden));
    if (!editor.hidden) text.value = readEsanchitTemplate();
  });
  bar.append(toggle, editor);
  holder.before(bar);
}

function scan() {
  for (const drn of document.querySelectorAll<HTMLInputElement>(rowSelector)) {
    const row = drn.closest('tr');
    const table = row?.closest('table');
    if (!row || !table) continue;
    ensureCopyStyles();
    addEditor(table);
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
