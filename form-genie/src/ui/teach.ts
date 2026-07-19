/**
 * Teach mode: overlay a tap target on every fillable field; tapping opens a
 * searchable key picker and saves the chosen mapping as a per-site rule.
 */
import { scan } from '../engine/scan';
import { describe, isCaptchaLike, FieldDescriptor } from '../engine/describe';
import { fingerprintOf } from '../engine/rules';
import { ALL_KEYS, FIELD_CATALOG, ProfileData } from '../profile/schema';
import { upsertRule } from '../profile/store';

interface Tag {
  el: HTMLElement;
  descriptor: FieldDescriptor;
  occurrence: number;
}

export class TeachMode {
  private layer: HTMLDivElement | null = null;
  private tags: Tag[] = [];
  private active = false;
  private reposition = () => this.layout();

  constructor(
    private shadow: ShadowRoot,
    private host: string,
    private getProfile: () => ProfileData,
    private saveProfile: (data: ProfileData) => void,
    private onSaved: () => void,
  ) {}

  isActive(): boolean {
    return this.active;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.layer = document.createElement('div');
    this.layer.style.position = 'fixed';
    this.layer.style.inset = '0';
    this.layer.style.zIndex = '2147483646';
    this.layer.style.pointerEvents = 'none';
    this.shadow.appendChild(this.layer);

    const units = scan();
    const seen = new Map<string, number>();
    for (const u of units) {
      const d = describe(u);
      if (isCaptchaLike(d)) continue;
      const fp = fingerprintOf(d);
      const occ = seen.get(fp) ?? 0;
      seen.set(fp, occ + 1);

      const tag = document.createElement('div');
      tag.className = 'teach-tag';
      tag.textContent = 'map';
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPicker(d, occ);
      });
      this.layer.appendChild(tag);
      this.tags.push({ el: tag, descriptor: d, occurrence: occ });
    }
    this.layout();
    window.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);
  }

  stop(): void {
    this.active = false;
    window.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
    this.layer?.remove();
    this.layer = null;
    this.tags = [];
  }

  private layout(): void {
    for (const t of this.tags) {
      const r = t.descriptor.unit.el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { t.el.style.display = 'none'; continue; }
      t.el.style.display = 'block';
      t.el.style.left = `${r.left}px`;
      t.el.style.top = `${Math.max(0, r.top - 12)}px`;
    }
  }

  private openPicker(d: FieldDescriptor, occurrence: number): void {
    const overlay = document.createElement('div');
    overlay.className = 'picker';
    const box = document.createElement('div');
    box.className = 'picker-box';

    // Helper to style picker form elements in Press theme
    const stylePickerInput = (el: HTMLElement) => {
      el.style.margin = '4px 12px 4px';
      el.style.padding = '9px 11px';
      el.style.borderRadius = '2px';
      el.style.fontSize = '13.5px';
      el.style.fontFamily = 'var(--sans)';
      el.style.background = '#fbf9f3';
      el.style.border = '1.5px solid var(--rule-strong)';
      el.style.color = 'var(--ink)';
      el.style.outline = 'none';
      el.style.width = 'calc(100% - 24px)';
      el.addEventListener('focus', () => { el.style.borderColor = 'var(--spot)'; });
      el.addEventListener('blur', () => { el.style.borderColor = 'var(--rule-strong)'; });
    };

    // Main View
    const mainView = document.createElement('div');
    mainView.style.display = 'flex';
    mainView.style.flexDirection = 'column';
    mainView.style.width = '100%';

    const search = document.createElement('input');
    search.placeholder = `Map "${d.text.slice(0, 30) || d.name || 'field'}" to…`;
    stylePickerInput(search);

    const createBtn = document.createElement('button');
    createBtn.className = 'btn ghost sm';
    createBtn.textContent = '＋ Create new custom field';
    createBtn.style.alignSelf = 'flex-start';
    createBtn.style.margin = '4px 12px 8px';
    createBtn.style.padding = '6px 12px';

    const list = document.createElement('div');
    list.className = 'picker-list';

    mainView.append(search, createBtn, list);

    // Create View (initially hidden)
    const createView = document.createElement('div');
    createView.style.display = 'none';
    createView.style.flexDirection = 'column';
    createView.style.width = '100%';
    createView.style.padding = '12px 0';

    const createTitle = document.createElement('div');
    createTitle.style.fontWeight = '700';
    createTitle.style.fontSize = '12px';
    createTitle.style.fontFamily = 'var(--mono)';
    createTitle.style.textTransform = 'uppercase';
    createTitle.style.letterSpacing = '1px';
    createTitle.style.margin = '0 12px 8px';
    createTitle.textContent = 'Create Custom Field';

    const cLabel = document.createElement('input');
    cLabel.placeholder = 'Field Label (e.g. Aadhaar Virtual ID)';
    stylePickerInput(cLabel);

    // Clean up default label text from field description
    let defaultLabel = '';
    if (d.text) {
      defaultLabel = d.text
        .replace(/[*():.,/\\|#\-_]+/g, ' ')
        .replace(/\b(enter|select|input|mandatory|field|captcha|security|code)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (defaultLabel) {
        defaultLabel = defaultLabel.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    cLabel.value = defaultLabel || 'Custom Field';

    const cType = document.createElement('select');
    const optVal = (t: string, v: string) => {
      const o = document.createElement('option');
      o.text = t; o.value = v; return o;
    };
    cType.appendChild(optVal('Text', 'text'));
    cType.appendChild(optVal('Number', 'number'));
    cType.appendChild(optVal('Date', 'date'));
    cType.appendChild(optVal('Choices / Dropdown / Radio', 'select'));
    stylePickerInput(cType);

    // Auto-detect field type
    if (d.unit.type === 'select' || d.unit.type === 'radio' || d.unit.type === 'checkbox') {
      cType.value = 'select';
    } else if (d.unit.type === 'date') {
      cType.value = 'date';
    } else if (d.unit.type === 'number') {
      cType.value = 'number';
    }

    const cOptions = document.createElement('input');
    cOptions.placeholder = 'Options (comma-separated, e.g. Yes, No)';
    stylePickerInput(cOptions);
    cOptions.style.display = cType.value === 'select' ? 'block' : 'none';
    if (d.options && d.options.length > 0) {
      cOptions.value = d.options.join(', ');
    }

    cType.addEventListener('change', () => {
      cOptions.style.display = cType.value === 'select' ? 'block' : 'none';
    });

    const cRow = document.createElement('div');
    cRow.className = 'row';
    cRow.style.margin = '8px 12px 0';
    cRow.style.gap = '6px';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary sm';
    saveBtn.textContent = 'Create & Map';
    saveBtn.style.flex = '1';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn ghost sm';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.flex = '1';

    cRow.append(saveBtn, cancelBtn);
    createView.append(createTitle, cLabel, cType, cOptions, cRow);

    box.append(mainView, createView);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    this.shadow.appendChild(overlay);

    // Switch views
    createBtn.addEventListener('click', () => {
      mainView.style.display = 'none';
      createView.style.display = 'flex';
      cLabel.focus();
    });

    cancelBtn.addEventListener('click', () => {
      createView.style.display = 'none';
      mainView.style.display = 'flex';
      search.focus();
    });

    saveBtn.addEventListener('click', () => {
      const label = cLabel.value.trim();
      if (!label) return;
      const key = 'custom.' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (key === 'custom.') return;

      const exists = FIELD_CATALOG[key] !== undefined;
      if (exists) {
        alert('A field with this label or key already exists.');
        return;
      }

      let options: string[] | undefined = undefined;
      if (cType.value === 'select') {
        const optsText = cOptions.value.trim();
        if (!optsText) {
          alert('Please enter options for choices field.');
          return;
        }
        options = optsText.split(',').map((s) => s.trim()).filter(Boolean);
        if (options.length === 0) {
          alert('Please enter valid options.');
          return;
        }
      }

      // Add to profile custom fields list
      const profile = this.getProfile();
      let customFieldsList: any[] = [];
      try {
        const raw = profile._customFields;
        if (raw) customFieldsList = JSON.parse(raw);
      } catch { /* no-op */ }

      customFieldsList.push({ key, label, kind: cType.value, options });
      profile._customFields = JSON.stringify(customFieldsList);

      // Pre-fill from current form field's selected/entered value if any
      const inputEl = d.unit.el;
      let val = '';
      if (d.unit.type === 'radio' || d.unit.type === 'checkbox') {
        const active = d.unit.group.find((r) => r.checked);
        if (active) {
          // Find corresponding label text
          const root = active.getRootNode() as Document | ShadowRoot;
          const id = active.getAttribute('id');
          let lbl = '';
          if (id) {
            const labelEl = root.querySelector?.(`label[for="${id}"]`);
            if (labelEl) lbl = labelEl.textContent ?? '';
          }
          if (!lbl) {
            const wrap = active.closest('label');
            if (wrap) lbl = wrap.textContent ?? '';
          }
          val = lbl.trim() || active.value;
        }
      } else {
        val = inputEl.value;
      }
      if (val.trim()) {
        profile[key] = val.trim();
      }

      this.saveProfile(profile);

      // Save teach rule
      upsertRule(this.host, {
        fingerprint: fingerprintOf(d),
        occurrence,
        key,
        source: 'teach',
        ts: Date.now(),
      });

      overlay.remove();
      this.onSaved();
    });

    const render = (q: string) => {
      list.innerHTML = '';
      const nq = q.toLowerCase();
      for (const key of ALL_KEYS) {
        const def = FIELD_CATALOG[key];
        const hay = `${def.label} ${key}`.toLowerCase();
        if (nq && !hay.includes(nq)) continue;
        const opt = document.createElement('div');
        opt.className = 'picker-opt';
        opt.innerHTML = `<div class="l">${def.label}</div><div class="k">${key}</div>`;
        opt.addEventListener('click', () => {
          upsertRule(this.host, {
            fingerprint: fingerprintOf(d),
            occurrence,
            key,
            source: 'teach',
            ts: Date.now(),
          });
          overlay.remove();
          this.onSaved();
        });
        list.appendChild(opt);
      }
    };
    search.addEventListener('input', () => render(search.value));
    render('');
    search.focus();
  }
}
