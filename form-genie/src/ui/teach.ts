/**
 * Teach mode: overlay a tap target on every fillable field; tapping opens a
 * searchable key picker and saves the chosen mapping as a per-site rule.
 */
import { scan } from '../engine/scan';
import { describe, isCaptchaLike, FieldDescriptor } from '../engine/describe';
import { fingerprintOf } from '../engine/rules';
import { ALL_KEYS, FIELD_CATALOG } from '../profile/schema';
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
    const search = document.createElement('input');
    search.placeholder = `Map "${d.text.slice(0, 30) || d.name || 'field'}" to…`;
    const list = document.createElement('div');
    list.className = 'picker-list';
    box.append(search, list);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    this.shadow.appendChild(overlay);

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
