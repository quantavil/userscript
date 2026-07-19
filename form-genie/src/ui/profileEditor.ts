/** Sectioned profile editor. Returns the element plus a collector for its values. */
import { SECTIONS, ProfileData } from '../profile/schema';

export interface EditorHandle {
  el: HTMLElement;
  collect: () => ProfileData;
}

export function renderProfileEditor(data: ProfileData): EditorHandle {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';

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
        sel.appendChild(new Option('—', ''));
        for (const o of f.options) sel.appendChild(new Option(o, o));
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
      field.appendChild(wrapSensitive(f.sensitive, input));
      wrap.appendChild(field);
    }
  }

  const collect = (): ProfileData => {
    const out: ProfileData = {};
    wrap.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]').forEach((el) => {
      const v = el.value.trim();
      if (v) out[el.dataset.key!] = v;
    });
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
