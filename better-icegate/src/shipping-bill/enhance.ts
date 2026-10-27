import { isPaginationStorageEvent, paginationChanged, paginationEnabled } from '../settings/pagination';
import { readTemplate, renderTemplate } from '../settings/template';
import { copyIcon, copyRich, ensureCopyStyles, templateIcon } from '../shared/copy';
import { dateRange, presets, toCsv, type DatePreset } from './tools';
import shippingStyles from './styles.css?inline';

const initializedForms = new WeakSet<Element>();
const presetKey = 'better-icegate.sb-date-preset.v1';

function setDate(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyPreset(from: HTMLInputElement, to: HTMLInputElement, preset: DatePreset) {
  const [start, end] = dateRange(preset);
  // Set an early valid start first so the portal permits changing the end date.
  setDate(from, '01-01-1900');
  setDate(to, end);
  setDate(from, start);
}

function addDatePresets(from: HTMLInputElement, to: HTMLInputElement) {
  const form = from.closest('form');
  if (!form) return;
  const existing = form.querySelector<HTMLElement>('.better-icegate-presets');
  if (existing) { updateSelected(existing, from, to); return; }
  const bar = document.createElement('div');
  bar.className = 'better-icegate-presets';
  bar.setAttribute('aria-label', 'Quick date ranges');
  const label = document.createElement('span');
  label.className = 'better-icegate-presets-label';
  label.textContent = 'Quick dates';
  bar.append(label);
  const refresh = () => updateSelected(bar, from, to);
  for (const preset of presets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.label;
    button.dataset.preset = preset.id;
    button.addEventListener('click', () => { localStorage.setItem(presetKey, preset.id); applyPreset(from, to, preset.id); });
    bar.append(button);
  }
  for (const input of [from, to]) {
    input.addEventListener('input', refresh);
    input.addEventListener('change', refresh);
  }
  const actions = form.querySelector('.row.col-12');
  if (actions) actions.before(bar); else form.append(bar);
  refresh();
}

function updateSelected(bar: HTMLElement, from: HTMLInputElement, to: HTMLInputElement) {
  for (const button of bar.querySelectorAll<HTMLButtonElement>('button[data-preset]')) {
    const [start, end] = dateRange(button.dataset.preset as DatePreset);
    button.setAttribute('aria-pressed', String(from.value === start && to.value === end));
  }
}

interface CopyTarget {
  index: number;
  label: string;
  key: 'job' | 'sb' | 'date' | 'location';
}

const copyColumnConfigs = [
  { match: (h: string) => /job\s*(?:no|number)/i.test(h), fallbackIndex: 0, label: 'job number', key: 'job' as const },
  { match: (h: string) => /sb\s*(?:no|number)/i.test(h), fallbackIndex: 2, label: 'SB number', key: 'sb' as const },
  { match: (h: string) => /sb\s*date/i.test(h), fallbackIndex: 3, label: 'SB date', key: 'date' as const },
  { match: (h: string) => /(?:customs?\s*)?loc(?:ation)?/i.test(h), fallbackIndex: 4, label: 'custom location', key: 'location' as const },
];

function resolveCopyTargets(table: HTMLTableElement): CopyTarget[] {
  const headers = [...table.querySelectorAll<HTMLTableCellElement>('thead th, thead td')].map(cell => cell.textContent?.trim().toLowerCase() ?? '');
  return copyColumnConfigs.map(config => {
    const matchedIndex = headers.findIndex(config.match);
    return {
      index: matchedIndex !== -1 ? matchedIndex : config.fallbackIndex,
      label: config.label,
      key: config.key,
    };
  });
}

function addResultsTools(details: Element) {
  const table = details.querySelector<HTMLTableElement>('table.resultTable');
  if (!table) return;
  let toolbar = details.querySelector<HTMLElement>('.better-icegate-results');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'better-icegate-results';
    const filter = document.createElement('input');
    filter.type = 'search';
    filter.placeholder = 'Filter job, SB or location';
    filter.setAttribute('aria-label', 'Filter visible Shipping Bill results');
    filter.className = 'better-icegate-filter';
    const exportButton = document.createElement('button');
    exportButton.type = 'button'; exportButton.textContent = 'Export CSV';
    exportButton.className = 'better-icegate-export';
    exportButton.title = 'Export the visible results';
    filter.addEventListener('input', () => {
      const current = details.querySelector<HTMLTableElement>('table.resultTable');
      if (current) filterRows(current, filter.value);
    });
    exportButton.addEventListener('click', () => {
      const table = details.querySelector<HTMLTableElement>('table.resultTable');
      if (!table) return;
      const headers = [...table.querySelectorAll('thead th, thead td')].slice(0, 5).map(cell => cell.textContent?.trim() ?? '');
      const rows = [...table.querySelectorAll<HTMLTableRowElement>('tbody tr')].filter(row => !row.hidden).map(row => [...row.cells].slice(0, 5).map(cellText));
      const blob = new Blob(['\ufeff', toCsv([headers, ...rows])], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'shipping-bills.csv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    toolbar.append(filter, exportButton);
    table.parentElement?.before(toolbar);
  }
  const filter = toolbar.querySelector<HTMLInputElement>('input')!;
  const targets = resolveCopyTargets(table);
  for (const row of table.querySelectorAll<HTMLTableRowElement>('tbody tr')) {
    for (const { index, label } of targets) {
      const cell = row.cells[index];
      if (!cell || cell.querySelector('.better-icegate-copy')) continue;
      const value = cellText(cell);
      if (!value) continue;
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'better-icegate-copy'; copy.innerHTML = copyIcon;
      copy.setAttribute('aria-label', `Copy ${label}`);
      copy.title = copy.getAttribute('aria-label') ?? '';
      copy.addEventListener('click', () => { void navigator.clipboard.writeText(cellText(cell)).then(() => { copy.textContent = '✓'; setTimeout(() => { copy.innerHTML = copyIcon; }, 1500); }).catch(() => { copy.textContent = '!'; }); });
      cell.append(copy);
    }
    addTemplateCopy(row, targets);
  }
  filterRows(table, filter.value);
}

function addTemplateCopy(row: HTMLTableRowElement, targets: CopyTarget[]) {
  const anchor = row.cells[targets[0].index];
  if (!anchor || anchor.querySelector('.better-icegate-template')) return;
  if (!cellText(anchor)) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'better-icegate-template'; button.innerHTML = templateIcon;
  button.setAttribute('aria-label', 'Copy Shipping Bill email template');
  button.title = 'Copy email template (edit it in Better ICEGATE settings)';
  button.addEventListener('click', () => {
    const values = Object.fromEntries(targets.map(({ index, key }) => [key, row.cells[index] ? cellText(row.cells[index]) : ''])) as Record<string, string>;
    void copyRich(renderTemplate(readTemplate(), values))
      .then(() => { button.textContent = '✓'; setTimeout(() => { button.innerHTML = templateIcon; }, 1500); })
      .catch(() => { button.textContent = '!'; });
  });
  anchor.append(button);
}

function cellText(cell: HTMLTableCellElement): string {
  return [...cell.childNodes].filter(node => !(node instanceof Element && (node.classList.contains('better-icegate-copy') || node.classList.contains('better-icegate-template')))).map(node => node.textContent ?? '').join('').trim();
}

function filterRows(table: HTMLTableElement, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  for (const row of table.querySelectorAll<HTMLTableRowElement>('tbody tr')) {
    row.hidden = ![...row.cells].slice(0, 5).some(cell => cellText(cell).toLocaleLowerCase().includes(needle));
  }
}

function isShippingBill(): boolean {
  const [path, query = ''] = location.hash.slice(1).split('?');
  return path === '/e-copy' && new URLSearchParams(query).get('docType') === 'SB';
}

function enhanceShippingBill() {
  if (!isShippingBill()) return;

  const layout = document.querySelector('app-dec-layout');
  const from = layout?.querySelector<HTMLInputElement>('input[formcontrolname="fromDate"]');
  const to = layout?.querySelector<HTMLInputElement>('input[formcontrolname="toDate"]');
  if (layout && from && to?.value && !initializedForms.has(layout)) {
    initializedForms.add(layout);
    const saved = localStorage.getItem(presetKey);
    const preset = presets.find(item => item.id === saved)?.id;
    if (preset) applyPreset(from, to, preset);
    else setDate(from, to.value);
  }

  if (from && to) addDatePresets(from, to);

  const select = layout?.querySelector<HTMLSelectElement>('app-dec-details select[name="perPage"]');
  if (select) {
    const enabled = paginationEnabled();
    const paginator = select.closest<HTMLElement>('.paginator-container');
    const allValue = String(Number.MAX_SAFE_INTEGER);
    if (enabled) {
      if (paginator) paginator.hidden = false;
      if (select.value === allValue) {
        select.value = '10';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      select.querySelector(`option[value="${allValue}"]`)?.remove();
    } else {
      if (!select.querySelector(`option[value="${allValue}"]`)) {
        const all = document.createElement('option');
        all.textContent = 'All';
        all.value = allValue;
        select.add(all);
      }
      if (select.value !== allValue) {
        select.value = allValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const info = paginator?.querySelector('.info-page')?.textContent;
      const counts = info?.match(/Showing\s+\d+\s*-\s*(\d+)\s+of\s+(\d+)/i);
      if (paginator) paginator.hidden = Boolean(counts && counts[1] === counts[2]);
    }
  }
  const details = layout?.querySelector('app-dec-details');
  if (details) addResultsTools(details);
}

export function startShippingBillEnhancements() {
  if (!document.getElementById('better-icegate-shipping-styles')) {
    const style = document.createElement('style');
    style.id = 'better-icegate-shipping-styles';
    style.textContent = shippingStyles;
    document.head.append(style);
  }
  ensureCopyStyles();
  const observer = new MutationObserver(enhanceShippingBill);
  observer.observe(document.body, { childList: true, subtree: true });
  let timer: number | undefined;
  let timeout: number | undefined;
  const stopRetry = () => {
    clearInterval(timer);
    clearTimeout(timeout);
    timer = undefined;
    timeout = undefined;
  };
  const onRoute = () => {
    stopRetry();
    if (!isShippingBill()) return;
    enhanceShippingBill();
    const layout = document.querySelector('app-dec-layout');
    if (layout && initializedForms.has(layout)) return;
    // Angular may set input values after insertion without a DOM mutation.
    timer = window.setInterval(() => {
      enhanceShippingBill();
      const current = document.querySelector('app-dec-layout');
      if (!isShippingBill() || (current && initializedForms.has(current))) stopRetry();
    }, 250);
    timeout = window.setTimeout(stopRetry, 15000);
  };
  window.addEventListener('hashchange', onRoute);
  window.addEventListener(paginationChanged, enhanceShippingBill);
  window.addEventListener('storage', event => { if (isPaginationStorageEvent(event)) enhanceShippingBill(); });
  onRoute();
}
