import { SECTIONS, ProfileData, FieldDef, registerCustomFields } from '../profile/schema';
import { buildCustomField } from '../profile/customFields';

export interface EditorHandle {
  el: HTMLElement;
  collect: () => ProfileData;
}

export function renderProfileEditor(
  data: ProfileData,
  onRefresh: (updatedData: ProfileData) => void,
  save: (data: ProfileData) => void,
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

  let sameSelect: HTMLSelectElement | null = null;
  const corrInputs: { inp: HTMLInputElement | HTMLSelectElement; field: HTMLElement }[] = [];

  for (const section of SECTIONS) {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = section.title;
    wrap.appendChild(title);

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
        delBtn.type = 'button';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          customFieldsList = customFieldsList.filter((x) => x.key !== f.key);
          const current = collect();
          delete current[f.key];
          registerCustomFields(customFieldsList);
          save(current);
          onRefresh(current);
        });

        row.appendChild(controlEl);
        row.appendChild(delBtn);
        controlEl = row;
      }

      field.appendChild(controlEl);
      wrap.appendChild(field);

      // Track correspondence fields for reactive disable
      if (f.key === 'address.correspondence.sameAsPermanent') {
        sameSelect = input as HTMLSelectElement;
      } else if (f.key.startsWith('address.correspondence.')) {
        corrInputs.push({ inp: input, field });
      }
    }
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

  // Add custom fields creation panel
  const addPanel = document.createElement('div');
  addPanel.style.borderTop = '1px dashed var(--line)';
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

  const typeSel = document.createElement('select');
  typeSel.style.flex = '1';
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
    onRefresh(current);
  });

  addPanel.appendChild(addBtn);
  wrap.appendChild(addPanel);

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
