import { SECTIONS, ProfileData, FieldDef, registerCustomFields } from '../profile/schema';
import { buildCustomField } from '../profile/customFields';

export interface EditorHandle {
  el: HTMLElement;
  collect: () => ProfileData;
}

interface SubtabDef {
  id: string;
  label: string;
  sectionIds: string[];
}

const SUBTABS: SubtabDef[] = [
  { id: 'personal', label: 'Personal', sectionIds: ['personal'] },
  { id: 'family-contact', label: 'Family & Contact', sectionIds: ['family', 'contact'] },
  { id: 'address', label: 'Address', sectionIds: ['permanent', 'correspondence'] },
  { id: 'education', label: 'Education', sectionIds: ['edu-tenth', 'edu-twelfth', 'edu-graduation', 'edu-postgrad'] },
  { id: 'identity', label: 'Identity', sectionIds: ['ids'] },
  { id: 'custom', label: 'Custom', sectionIds: ['custom'] },
  { id: 'all', label: 'All', sectionIds: [] },
];

export function renderProfileEditor(
  data: ProfileData,
  onRefresh: (updatedData: ProfileData, activeTab: string) => void,
  save: (data: ProfileData) => void,
  initialTab = 'personal',
): EditorHandle {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';

  let customFieldsList: FieldDef[] = [];
  try {
    const raw = data._customFields;
    if (raw) customFieldsList = JSON.parse(raw);
  } catch { /* no-op */ }

  let activeTabId = initialTab;

  // ---- Toolbar: Search Input + Subtabs -----------------------------------
  const toolbar = document.createElement('div');
  toolbar.className = 'profile-toolbar';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'profile-search-wrap';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'profile-search-input';
  searchInput.placeholder = 'Search fields (e.g. mobile, dob, aadhaar)';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'profile-search-clear';
  clearBtn.textContent = '✕';
  clearBtn.title = 'Clear search';

  searchWrap.append(searchInput, clearBtn);

  const subtabsContainer = document.createElement('div');
  subtabsContainer.className = 'profile-subtabs';

  const subtabButtons: HTMLButtonElement[] = [];

  for (const tab of SUBTABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `profile-subtab${tab.id === activeTabId ? ' active' : ''}`;
    btn.textContent = tab.label;
    btn.dataset.tabId = tab.id;
    btn.addEventListener('click', () => {
      activeTabId = tab.id;
      // Clear search when switching tabs for a clean view
      if (searchInput.value) {
        searchInput.value = '';
      }
      updateView();
    });
    subtabButtons.push(btn);
    subtabsContainer.appendChild(btn);
  }

  const searchSummary = document.createElement('div');
  searchSummary.className = 'search-summary';
  searchSummary.style.display = 'none';

  toolbar.append(searchWrap, subtabsContainer, searchSummary);
  wrap.appendChild(toolbar);

  // ---- Render Section Fields ---------------------------------------------
  let sameSelect: HTMLSelectElement | null = null;
  const corrInputs: { inp: HTMLInputElement | HTMLSelectElement; field: HTMLElement }[] = [];

  interface RenderedSection {
    id: string;
    title: string;
    el: HTMLElement;
    fieldEntries: { key: string; label: string; el: HTMLElement }[];
  }

  const renderedSections: RenderedSection[] = [];

  for (const section of SECTIONS) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'profile-section';

    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.textContent = section.title;
    sectionEl.appendChild(titleEl);

    const fieldEntries: { key: string; label: string; el: HTMLElement }[] = [];

    for (const f of section.fields) {
      const field = document.createElement('div');
      field.className = 'field';

      const label = document.createElement('label');
      label.textContent = f.label;
      field.appendChild(label);

      let input: HTMLInputElement | HTMLSelectElement;
      if (f.kind === 'select' && f.options) {
        const sel = document.createElement('select');
        sel.appendChild(createOption('—', ''));
        for (const o of f.options) sel.appendChild(createOption(o, o));
        sel.value = data[f.key] ?? '';
        input = sel;
      } else {
        const inp = document.createElement('input');
        inp.type = f.sensitive ? 'password' : f.kind === 'date' ? 'text' : f.kind === 'number' ? 'text' : f.kind;
        if (f.kind === 'date') inp.placeholder = 'YYYY-MM-DD';
        inp.value = data[f.key] ?? '';
        input = inp;
      }
      input.dataset.key = f.key;

      let controlEl = wrapSensitive(f.sensitive, input);

      // Wrap custom fields with a delete button
      if (f.key.startsWith('custom.')) {
        const row = document.createElement('div');
        row.className = 'row';
        controlEl.style.flex = '1';

        const delBtn = document.createElement('button');
        delBtn.className = 'btn danger sm';
        delBtn.style.height = '37px';
        delBtn.style.boxSizing = 'border-box';
        delBtn.type = 'button';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          customFieldsList = customFieldsList.filter((x) => x.key !== f.key);
          const current = collect();
          delete current[f.key];
          registerCustomFields(customFieldsList);
          save(current);
          onRefresh(current, activeTabId);
        });

        row.appendChild(controlEl);
        row.appendChild(delBtn);
        controlEl = row;
      }

      field.appendChild(controlEl);
      sectionEl.appendChild(field);

      fieldEntries.push({ key: f.key, label: f.label, el: field });

      // Track correspondence fields for reactive disable
      if (f.key === 'address.correspondence.sameAsPermanent') {
        sameSelect = input as HTMLSelectElement;
      } else if (f.key.startsWith('address.correspondence.')) {
        corrInputs.push({ inp: input, field });
      }
    }

    wrap.appendChild(sectionEl);
    renderedSections.push({
      id: section.id,
      title: section.title,
      el: sectionEl,
      fieldEntries,
    });
  }

  // Disable correspondence fields when "Same as permanent" is Yes
  if (sameSelect) {
    const syncDisabled = () => {
      const off = sameSelect!.value === 'Yes';
      // Disable (not erase) — permanent takes precedence at fill time, and the
      // user's typed correspondence values survive a toggle back to "No".
      for (const { inp, field } of corrInputs) {
        inp.disabled = off;
        field.style.opacity = off ? '0.4' : '';
      }
    };
    sameSelect.addEventListener('change', syncDisabled);
    syncDisabled();
  }

  // ---- Add Custom Field Creator Panel ------------------------------------
  const addPanel = document.createElement('div');
  addPanel.style.borderTop = '1px dashed var(--rule-strong)';
  addPanel.style.paddingTop = '12px';
  addPanel.style.marginTop = '12px';
  addPanel.style.display = 'flex';
  addPanel.style.flexDirection = 'column';
  addPanel.style.gap = '8px';

  const addTitle = document.createElement('div');
  addTitle.className = 'section-title';
  addTitle.textContent = 'Add Custom Field';
  addPanel.appendChild(addTitle);

  const row1 = document.createElement('div');
  row1.className = 'row';
  row1.style.gap = '6px';

  const labelInp = document.createElement('input');
  labelInp.placeholder = 'Label (e.g. Aadhaar Virtual ID)';
  labelInp.style.flex = '2';
  labelInp.style.minWidth = '0';

  const typeSel = document.createElement('select');
  typeSel.style.flex = '1';
  typeSel.style.minWidth = '0';
  typeSel.appendChild(createOption('Text', 'text'));
  typeSel.appendChild(createOption('Number', 'number'));
  typeSel.appendChild(createOption('Date', 'date'));
  typeSel.appendChild(createOption('Choices / Dropdown / Radio', 'select'));

  row1.append(labelInp, typeSel);
  addPanel.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'row';
  row2.style.gap = '6px';
  row2.style.display = 'none';

  const optionsInp = document.createElement('input');
  optionsInp.placeholder = 'Options (comma-separated, e.g. Yes, No)';
  optionsInp.style.flex = '1';
  optionsInp.style.minWidth = '0';
  row2.appendChild(optionsInp);
  addPanel.appendChild(row2);

  typeSel.addEventListener('change', () => {
    row2.style.display = typeSel.value === 'select' ? 'flex' : 'none';
  });

  const errEl = document.createElement('div');
  errEl.className = 'field-error';
  errEl.style.display = 'none';
  addPanel.appendChild(errEl);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn ghost full';
  addBtn.type = 'button';
  addBtn.textContent = '＋ Add Custom Field';
  addBtn.style.marginTop = '4px';

  addBtn.addEventListener('click', () => {
    const built = buildCustomField({
      label: labelInp.value,
      kind: typeSel.value as 'text' | 'number' | 'date' | 'select',
      optionsText: optionsInp.value,
    });
    if (!built.ok) {
      errEl.textContent = built.error;
      errEl.style.display = 'block';
      return;
    }

    customFieldsList.push(built.field);
    const current = collect();
    registerCustomFields(customFieldsList);
    save(current);
    // Land on a tab where the new field is actually visible.
    onRefresh(current, activeTabId === 'all' ? 'all' : 'custom');
  });

  addPanel.appendChild(addBtn);
  wrap.appendChild(addPanel);

  // ---- Empty State -------------------------------------------------------
  const noMatchEl = document.createElement('div');
  noMatchEl.className = 'no-match-msg';
  noMatchEl.style.display = 'none';
  noMatchEl.textContent = 'No matching fields found';
  wrap.appendChild(noMatchEl);

  // ---- Dynamic Filter / View Update --------------------------------------
  const updateView = () => {
    const q = searchInput.value.trim().toLowerCase();
    clearBtn.classList.toggle('show', q.length > 0);

    // Update active state on subtab buttons
    for (const btn of subtabButtons) {
      btn.classList.toggle('active', btn.dataset.tabId === activeTabId);
    }

    const currentTabDef = SUBTABS.find((t) => t.id === activeTabId) ?? SUBTABS[0];
    let totalVisibleFields = 0;

    for (const section of renderedSections) {
      const isAllowedByTab =
        currentTabDef.id === 'all' ||
        q.length > 0 ||
        currentTabDef.sectionIds.includes(section.id);

      if (!isAllowedByTab) {
        section.el.style.display = 'none';
        continue;
      }

      let sectionVisibleCount = 0;
      for (const field of section.fieldEntries) {
        const matchesQuery =
          q.length === 0 ||
          field.label.toLowerCase().includes(q) ||
          field.key.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q);

        if (matchesQuery) {
          field.el.style.display = '';
          sectionVisibleCount++;
          totalVisibleFields++;
        } else {
          field.el.style.display = 'none';
        }
      }

      section.el.style.display = sectionVisibleCount > 0 ? '' : 'none';
    }

    // The add-custom-field panel lives on the Custom and All tabs; hide it
    // while a search is active so results aren't padded with unrelated inputs.
    const showAddPanel = q.length === 0 && (activeTabId === 'custom' || activeTabId === 'all');
    addPanel.style.display = showAddPanel ? 'flex' : 'none';

    const searching = q.length > 0;
    searchSummary.style.display = searching && totalVisibleFields > 0 ? 'block' : 'none';
    if (searching) {
      searchSummary.textContent = `Found ${totalVisibleFields} matching field${totalVisibleFields === 1 ? '' : 's'}`;
    }
    noMatchEl.style.display = searching && totalVisibleFields === 0 ? 'block' : 'none';
  };

  searchInput.addEventListener('input', updateView);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    updateView();
  });

  // Initial view sync
  updateView();

  const collect = (): ProfileData => {
    const out: ProfileData = {};
    wrap.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]').forEach((el) => {
      const v = el.value.trim();
      if (v) out[el.dataset.key!] = v;
    });
    if (customFieldsList.length > 0) {
      out['_customFields'] = JSON.stringify(customFieldsList);
    }
    return out;
  };

  return { el: wrap, collect };
}

function wrapSensitive(sensitive: boolean | undefined, input: HTMLInputElement | HTMLSelectElement): HTMLElement {
  if (!sensitive) return input;
  const row = document.createElement('div');
  row.className = 'row';
  input.style.flex = '1';
  const toggle = document.createElement('button');
  toggle.className = 'btn ghost sm';
  toggle.style.height = '37px';
  toggle.style.boxSizing = 'border-box';
  toggle.type = 'button';
  toggle.textContent = '👁';
  toggle.addEventListener('click', () => {
    const inp = input as HTMLInputElement;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  row.appendChild(input);
  row.appendChild(toggle);
  return row;
}

function createOption(text: string, value: string): HTMLOptionElement {
  const opt = document.createElement('option');
  opt.text = text;
  opt.value = value;
  return opt;
}
