/**
 * Teach mode: overlay a tap target on every fillable field; tapping opens a
 * searchable key picker and saves the chosen mapping as a per-site rule.
 */
import { scan } from '../engine/scan';
import { describe, isCaptchaLike, radioLabel, FieldDescriptor } from '../engine/describe';
import { fingerprintOf } from '../engine/rules';
import { ALL_KEYS, FIELD_CATALOG, FieldDef, FieldKind, ProfileData } from '../profile/schema';
import { buildCustomField } from '../profile/customFields';
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

    // ---- Main view: search + catalog list --------------------------------
    const mainView = document.createElement('div');
    mainView.className = 'picker-main';

    const search = document.createElement('input');
    search.placeholder = `Map "${d.text.slice(0, 30) || d.name || 'field'}" to…`;

    const createBtn = document.createElement('button');
    createBtn.className = 'btn ghost sm';
    createBtn.textContent = '＋ Create new custom field';
    createBtn.style.alignSelf = 'flex-start';
    createBtn.style.margin = '0 12px 8px';

    const list = document.createElement('div');
    list.className = 'picker-list';

    mainView.append(search, createBtn, list);

    // ---- Create view -----------------------------------------------------
    const createView = document.createElement('div');
    createView.className = 'picker-create';

    const createTitle = document.createElement('div');
    createTitle.className = 'picker-create-title';
    createTitle.textContent = 'Create Custom Field';

    const cLabel = document.createElement('input');
    cLabel.placeholder = 'Field Label (e.g. Aadhaar Virtual ID)';
    cLabel.value = defaultLabelFrom(d);

    const cType = document.createElement('select');
    const addOpt = (t: string, v: string) => {
      const o = document.createElement('option');
      o.text = t; o.value = v; cType.appendChild(o);
    };
    addOpt('Text', 'text');
    addOpt('Number', 'number');
    addOpt('Date', 'date');
    addOpt('Choices / Dropdown / Radio', 'select');
    cType.value = defaultKindFrom(d.unit.type);

    const cOptions = document.createElement('input');
    cOptions.placeholder = 'Options (comma-separated, e.g. Yes, No)';
    cOptions.style.display = cType.value === 'select' ? 'block' : 'none';
    if (d.options.length) cOptions.value = d.options.join(', ');
    cType.addEventListener('change', () => {
      cOptions.style.display = cType.value === 'select' ? 'block' : 'none';
    });

    const cError = document.createElement('div');
    cError.className = 'field-error';
    cError.style.display = 'none';

    const actions = document.createElement('div');
    actions.className = 'picker-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn primary sm';
    saveBtn.textContent = 'Create & Map';
    saveBtn.style.flex = '1';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn ghost sm';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.flex = '1';
    actions.append(saveBtn, cancelBtn);

    createView.append(createTitle, cLabel, cType, cOptions, cError, actions);

    box.append(mainView, createView);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    this.shadow.appendChild(overlay);

    const showCreate = (on: boolean) => {
      createView.classList.toggle('show', on);
      mainView.style.display = on ? 'none' : 'flex';
      (on ? cLabel : search).focus();
    };
    createBtn.addEventListener('click', () => showCreate(true));
    cancelBtn.addEventListener('click', () => showCreate(false));

    saveBtn.addEventListener('click', () => {
      const built = buildCustomField({
        label: cLabel.value,
        kind: cType.value as FieldKind,
        optionsText: cOptions.value,
      });
      if (!built.ok) {
        cError.textContent = built.error;
        cError.style.display = 'block';
        return;
      }
      this.createAndMap(d, occurrence, built.field);
      overlay.remove();
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
        const labelDiv = document.createElement('div');
        labelDiv.className = 'l';
        labelDiv.textContent = def.label;
        const keyDiv = document.createElement('div');
        keyDiv.className = 'k';
        keyDiv.textContent = key;
        opt.appendChild(labelDiv);
        opt.appendChild(keyDiv);
        opt.addEventListener('click', () => {
          this.mapTo(d, occurrence, key);
          overlay.remove();
        });
        list.appendChild(opt);
      }
    };
    search.addEventListener('input', () => render(search.value));
    render('');
    search.focus();
  }

  /** Persist a per-site rule mapping this field to an existing key. */
  private mapTo(d: FieldDescriptor, occurrence: number, key: string): void {
    upsertRule(this.host, {
      fingerprint: fingerprintOf(d),
      occurrence,
      key,
      source: 'teach',
      ts: Date.now(),
    });
    this.onSaved();
  }

  /** Register a new custom field, seed it from the live value, then map to it. */
  private createAndMap(d: FieldDescriptor, occurrence: number, field: FieldDef): void {
    const profile = this.getProfile();
    let customFieldsList: FieldDef[] = [];
    try {
      if (profile._customFields) customFieldsList = JSON.parse(profile._customFields);
    } catch { /* no-op */ }
    customFieldsList.push(field);
    profile._customFields = JSON.stringify(customFieldsList);

    const val = currentFieldValue(d);
    if (val) profile[field.key] = val;

    this.saveProfile(profile);
    this.mapTo(d, occurrence, field.key);
  }
}

/** Derive a Title-Cased default label from a field's descriptor text. */
function defaultLabelFrom(d: FieldDescriptor): string {
  const label = d.text
    .replace(/[*():.,/\\|#\-_]+/g, ' ')
    .replace(/\b(enter|select|input|mandatory|field|captcha|security|code)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!label) return 'Custom Field';
  return label.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Pick the closest custom-field kind for a scanned unit type. */
function defaultKindFrom(unitType: string): FieldKind {
  if (unitType === 'select' || unitType === 'radio' || unitType === 'checkbox') return 'select';
  if (unitType === 'date') return 'date';
  if (unitType === 'number') return 'number';
  return 'text';
}

/** The value currently entered/selected in a field, for seeding a new profile key. */
function currentFieldValue(d: FieldDescriptor): string {
  const unit = d.unit;
  if (unit.type === 'radio' || unit.type === 'checkbox') {
    const active = unit.group.find((r) => r.checked);
    return active ? radioLabel(active).trim() : '';
  }
  return (unit.el as HTMLInputElement).value.trim();
}
