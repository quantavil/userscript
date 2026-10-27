import { parseDocType, pushRecent, readRecent, searchDocTypes, type DocType } from './search';
import css from './styles.css?inline';

const selector = 'select[id^="docTypeSelect_"]';
const recentKey = 'better-icegate.esanchit-recent.v1';
const syncers = new Map<HTMLSelectElement, () => void>();
const enhanced = new WeakSet<HTMLSelectElement>();
let list: HTMLElement | undefined;
let activeCombo: { select: HTMLSelectElement; close: () => void } | undefined;

function docTypes(select: HTMLSelectElement): DocType[] {
  return [...select.options].flatMap(option => parseDocType(option.value, option.textContent ?? '') ?? []);
}

function loadRecent(): string[] {
  try { return readRecent(localStorage.getItem(recentKey)); } catch { return []; }
}

function saveRecent(value: string) {
  try { localStorage.setItem(recentKey, JSON.stringify(pushRecent(loadRecent(), value))); } catch { /* storage unavailable */ }
}

function ensureList(): HTMLElement {
  if (list?.isConnected) return list;
  list = document.createElement('div');
  list.className = 'better-icegate-doclist';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  // Keep focus in the input when the scrollbar or a heading is clicked.
  list.addEventListener('mousedown', event => event.preventDefault());
  document.body.append(list);
  return list;
}

function enhance(select: HTMLSelectElement) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'better-icegate-doctype';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Search document type…';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-label', 'Document type');
  select.before(input);
  select.hidden = true;
  select.style.display = 'none';

  let shown: DocType[] = [];
  let active = -1;
  let open = false;

  const selectedText = () => {
    const option = select.options[select.selectedIndex];
    return !option || option.value === 'NONE' ? '' : option.textContent?.trim() ?? '';
  };
  const sync = () => {
    input.disabled = select.disabled;
    if (!open) input.value = selectedText();
  };
  syncers.set(select, sync);

  const position = () => {
    const box = input.getBoundingClientRect();
    const popup = ensureList();
    const width = Math.min(Math.max(box.width, 440), window.innerWidth - 16);
    popup.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - width - 8))}px`;
    popup.style.width = `${width}px`;
    const room = window.innerHeight - box.bottom - 12;
    if (room < 200 && box.top > room) {
      popup.style.top = 'auto';
      popup.style.bottom = `${window.innerHeight - box.top + 2}px`;
      popup.style.maxHeight = `${Math.min(340, box.top - 12)}px`;
    } else {
      popup.style.bottom = 'auto';
      popup.style.top = `${box.bottom + 2}px`;
      popup.style.maxHeight = `${Math.min(340, Math.max(room, 120))}px`;
    }
  };

  const setActive = (index: number) => {
    const popup = ensureList();
    popup.querySelector('[aria-selected="true"]')?.setAttribute('aria-selected', 'false');
    active = index;
    const row = popup.querySelectorAll<HTMLElement>('[role="option"]')[index];
    if (!row) { input.removeAttribute('aria-activedescendant'); return; }
    row.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', row.id);
    row.scrollIntoView?.({ block: 'nearest' });
  };

  const commit = (item: DocType) => {
    select.value = item.value;
    saveRecent(item.value);
    close();
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const render = () => {
    const popup = ensureList();
    popup.replaceChildren();
    const all = docTypes(select);
    const query = input.dataset.query ?? '';
    const recent = query ? [] : loadRecent().flatMap(value => all.find(item => item.value === value) ?? []);
    const matches = searchDocTypes(all, query);
    shown = [...recent, ...matches];
    const addHeading = (text: string) => {
      const heading = document.createElement('div');
      heading.className = 'better-icegate-doclist-heading';
      heading.textContent = text;
      popup.append(heading);
    };
    if (recent.length) addHeading('Recent');
    shown.forEach((item, index) => {
      if (recent.length && index === recent.length) addHeading('All document types');
      const row = document.createElement('div');
      row.id = `better-icegate-doc-${index}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      if (item.value === select.value) row.dataset.current = 'true';
      const code = document.createElement('span');
      code.className = 'better-icegate-doc-code';
      code.textContent = item.code;
      const label = document.createElement('span');
      label.textContent = item.label;
      row.append(code, label);
      row.addEventListener('mousedown', event => { event.preventDefault(); commit(item); });
      popup.append(row);
    });
    if (!shown.length) {
      const empty = document.createElement('div');
      empty.className = 'better-icegate-doclist-empty';
      empty.textContent = 'No matching document type';
      popup.append(empty);
    }
    const currentIndex = shown.findIndex(item => item.value === select.value && !recent.includes(item));
    setActive(query ? (shown.length ? 0 : -1) : currentIndex >= 0 ? currentIndex : -1);
  };

  function close() {
    if (!open) return;
    open = false;
    delete input.dataset.query;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (list) list.hidden = true;
    window.removeEventListener('scroll', position, true);
    window.removeEventListener('resize', position);
    if (activeCombo?.select === select) activeCombo = undefined;
    sync();
  }

  const show = () => {
    if (open || input.disabled) return;
    activeCombo?.close();
    open = true;
    activeCombo = { select, close };
    input.dataset.query = '';
    input.setAttribute('aria-expanded', 'true');
    const popup = ensureList();
    popup.hidden = false;
    render();
    position();
    popup.querySelector('[data-current="true"]')?.scrollIntoView?.({ block: 'nearest' });
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
  };

  input.addEventListener('focus', () => { show(); input.select(); });
  input.addEventListener('click', show);
  input.addEventListener('blur', close);
  input.addEventListener('input', () => {
    show();
    input.dataset.query = input.value;
    render();
    position();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { show(); return; }
      if (!shown.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + shown.length) % shown.length);
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (shown[active]) commit(shown[active]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  });
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => setTimeout(sync, 0));
  sync();
}

function scan() {
  for (const [select, sync] of syncers) {
    if (select.isConnected) sync(); else syncers.delete(select);
  }
  for (const select of document.querySelectorAll<HTMLSelectElement>(selector)) {
    if (enhanced.has(select) || select.multiple) continue;
    enhanced.add(select);
    enhance(select);
  }
}

export function startDocumentTypeDropdown() {
  if (!document.getElementById('better-icegate-esanchit-styles')) {
    const style = document.createElement('style');
    style.id = 'better-icegate-esanchit-styles';
    style.textContent = css;
    document.head.append(style);
  }
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  scan();
}
