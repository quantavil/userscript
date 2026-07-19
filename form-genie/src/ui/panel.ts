/**
 * Form Genie panel: draggable FAB + bottom-sheet with Fill / Profile / Settings
 * tabs, teach-mode orchestration, and the fill report. Mounts in a closed shadow
 * root so host-page CSS and scripts can't touch it.
 */
import { STYLES } from './styles';
import { renderProfileEditor } from './profileEditor';
import { renderReport } from './report';
import { TeachMode } from './teach';
import { FillResult } from '../engine/fill';
import { ProfileData } from '../profile/schema';
import { Settings, Rule, loadFabPos, saveFabPos } from '../profile/store';
import { FIELD_CATALOG } from '../profile/schema';

export interface PanelController {
  host: string;
  getProfile(): ProfileData;
  saveProfile(data: ProfileData): void;
  getSettings(): Settings;
  saveSettings(s: Settings): void;
  runFill(accepted?: Set<string>): Promise<FillResult[]>;
  getRules(): Rule[];
  deleteRule(fingerprint: string, occurrence: number): void;
  exportJson(): string;
  importJson(json: string): { ok: boolean; error?: string };
}

type Tab = 'fill' | 'profile' | 'settings';

export class FormGeniePanel {
  private shadow: ShadowRoot;
  private container: HTMLDivElement;
  private fab!: HTMLButtonElement;
  private sheet!: HTMLDivElement;
  private body!: HTMLDivElement;
  private teach: TeachMode;
  private tab: Tab = 'fill';
  private lastResults: FillResult[] = [];

  constructor(private ctl: PanelController) {
    this.container = document.createElement('div');
    this.container.id = 'form-genie-root';
    this.shadow = this.container.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    this.shadow.appendChild(style);
    this.isolateEvents();

    this.teach = new TeachMode(
      this.shadow,
      ctl.host,
      () => ctl.getProfile(),
      (data) => ctl.saveProfile(data),
      () => this.toast('Mapping saved'),
    );

    this.buildFab();
    this.buildSheet();
    document.documentElement.appendChild(this.container);
  }

  /**
   * Keep host-page listeners out of the panel. Portals like ibps.in register
   * document-level key/paste/click handlers (to block copy-paste or validate
   * globally) that also fire for events bubbling out of our shadow root —
   * which made panel inputs untypable there. Stopping propagation at the
   * shadow host runs after our internal handlers but before the page's.
   */
  private isolateEvents(): void {
    const events = [
      'keydown', 'keyup', 'keypress', 'input', 'change',
      'paste', 'copy', 'cut', 'contextmenu',
      'mousedown', 'mouseup', 'click', 'dblclick',
      'pointerdown', 'pointerup', 'touchstart', 'touchend',
      'focusin', 'focusout', 'wheel',
    ];
    for (const evt of events) {
      this.container.addEventListener(evt, (e) => e.stopPropagation());
    }
  }

  // ---- FAB ----------------------------------------------------------------

  private buildFab(): void {
    this.fab = document.createElement('button');
    this.fab.className = 'fab';
    this.fab.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>` +
      `<span>Fill</span>`;
    const pos = loadFabPos();
    if (pos) { this.fab.style.left = `${pos.x}px`; this.fab.style.top = `${pos.y}px`; }
    else { this.fab.style.right = '16px'; this.fab.style.bottom = '16px'; }
    this.enableDrag();
    this.shadow.appendChild(this.fab);
  }

  private enableDrag(): void {
    let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, dragging = false;
    const onDown = (e: PointerEvent) => {
      dragging = true; moved = false;
      const r = this.fab.getBoundingClientRect();
      ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
      this.fab.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      const x = Math.max(0, Math.min(window.innerWidth - this.fab.offsetWidth, ox + dx));
      const y = Math.max(0, Math.min(window.innerHeight - this.fab.offsetHeight, oy + dy));
      this.fab.style.left = `${x}px`; this.fab.style.top = `${y}px`;
      this.fab.style.right = 'auto'; this.fab.style.bottom = 'auto';
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        const r = this.fab.getBoundingClientRect();
        saveFabPos({ x: r.left, y: r.top });
      } else {
        this.toggleSheet();
      }
    };
    this.fab.addEventListener('pointerdown', onDown);
    this.fab.addEventListener('pointermove', onMove);
    this.fab.addEventListener('pointerup', onUp);
  }

  // ---- Sheet --------------------------------------------------------------

  private buildSheet(): void {
    this.sheet = document.createElement('div');
    this.sheet.className = 'sheet hidden';

    const head = document.createElement('div');
    head.className = 'head';
    const row1 = document.createElement('div');
    row1.className = 'row1';
    row1.innerHTML =
      `<div class="mono-mark">G</div>` +
      `<div class="titles"><div class="title">Form Genie</div>` +
      `<div class="sub">EST. ON — ${this.ctl.host}</div></div>`;
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => this.toggleSheet());
    row1.appendChild(close);
    const rule = document.createElement('div');
    rule.className = 'masthead-rule';
    head.append(row1, rule);

    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    (['fill', 'profile', 'settings'] as Tab[]).forEach((t) => {
      const b = document.createElement('button');
      b.className = 'tab' + (t === this.tab ? ' active' : '');
      b.textContent = t[0].toUpperCase() + t.slice(1);
      b.dataset.tab = t;
      b.addEventListener('click', () => { this.tab = t; this.syncTabs(); this.renderBody(); });
      tabs.appendChild(b);
    });
    this.tabsEl = tabs;

    this.body = document.createElement('div');
    this.body.className = 'body';

    this.sheet.append(head, tabs, this.body);
    this.shadow.appendChild(this.sheet);
  }

  private tabsEl!: HTMLDivElement;

  private syncTabs(): void {
    this.tabsEl.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === this.tab);
    });
  }

  private toggleSheet(): void {
    const hidden = this.sheet.classList.toggle('hidden');
    if (!hidden) this.renderBody();
  }

  open(): void {
    this.sheet.classList.remove('hidden');
    this.renderBody();
  }

  // ---- Body renderers -----------------------------------------------------

  private renderBody(): void {
    this.body.innerHTML = '';
    if (this.tab === 'fill') this.renderFill();
    else if (this.tab === 'profile') this.renderProfile();
    else this.renderSettings();
  }

  private renderFill(): void {
    const fillBtn = button('Fill this page', 'primary full', async () => {
      fillBtn.textContent = 'Filling…';
      (fillBtn as HTMLButtonElement).disabled = true;
      this.lastResults = await this.ctl.runFill();
      this.renderBody();
    });
    this.body.appendChild(fillBtn);

    const teachBtn = button(
      this.teach.isActive() ? 'Stop teaching' : 'Teach mode',
      'ghost full',
      () => {
        if (this.teach.isActive()) { this.teach.stop(); }
        else { this.teach.start(); this.sheet.classList.add('hidden'); }
        this.renderBody();
      },
    );
    this.body.appendChild(teachBtn);

    if (this.lastResults.length) {
      this.body.appendChild(
        renderReport(
          this.lastResults,
          async (fp) => {
            this.lastResults = await this.ctl.runFill(new Set([fp]));
            this.renderBody();
          },
          () => {
            this.teach.start();
            this.sheet.classList.add('hidden');
          },
        ),
      );
    } else {
      const hint = document.createElement('div');
      hint.className = 'muted';
      hint.textContent = 'Tap “Fill this page” to fill recognised fields from your profile.';
      this.body.appendChild(hint);
    }
  }

  private renderProfile(data: ProfileData = this.ctl.getProfile()): void {
    this.body.innerHTML = '';
    const handle = renderProfileEditor(data, (updatedData) => {
      this.renderProfile(updatedData);
    });
    const footbar = document.createElement('div');
    footbar.className = 'footbar';
    footbar.appendChild(
      button('Save profile', 'primary full', () => {
        this.ctl.saveProfile(handle.collect());
        this.toast('Profile saved');
      }),
    );
    this.body.append(handle.el, footbar);
  }

  private renderSettings(): void {
    const s = this.ctl.getSettings();

    this.body.appendChild(sectionTitle('General'));
    this.body.appendChild(toggleRow('Overwrite existing values', s.overwrite, (v) => { s.overwrite = v; this.ctl.saveSettings(s); }));
    this.body.appendChild(toggleRow('Debug mode', s.debug, (v) => { s.debug = v; this.ctl.saveSettings(s); }));

    this.body.appendChild(sectionTitle('AI tier (Gemini)'));
    this.body.appendChild(toggleRow('Enable AI matching', s.ai.enabled, (v) => { s.ai.enabled = v; this.ctl.saveSettings(s); }));
    this.body.appendChild(textRow('API key', s.ai.apiKey, 'password', (v) => { s.ai.apiKey = v; this.ctl.saveSettings(s); }));
    this.body.appendChild(textRow('Model', s.ai.model, 'text', (v) => { s.ai.model = v.trim() || 'gemini-3.1-flash-lite'; this.ctl.saveSettings(s); }));
    const note = document.createElement('div');
    note.className = 'muted';
    note.textContent = 'Only field labels are sent to Gemini — never your data. The API key is never included in exports.';
    this.body.appendChild(note);

    this.body.appendChild(sectionTitle('Data'));
    const row = document.createElement('div');
    row.className = 'row';
    row.append(
      button('Export', 'ghost', () => this.exportProfile()),
      button('Import', 'ghost', () => this.importProfile()),
    );
    this.body.appendChild(row);

    this.body.appendChild(sectionTitle(`Learned rules for ${this.ctl.host}`));
    this.renderRules();
  }

  private renderRules(): void {
    const rules = this.ctl.getRules();
    if (!rules.length) {
      const m = document.createElement('div');
      m.className = 'muted';
      m.textContent = 'No learned rules yet. Use Teach mode to add some.';
      this.body.appendChild(m);
      return;
    }
    for (const r of rules) {
      const item = document.createElement('div');
      item.className = 'report-item';
      item.innerHTML = `<div style="flex:1"><div>${FIELD_CATALOG[r.key]?.label ?? r.key}</div>` +
        `<div class="meta">${r.fingerprint} · ${r.source}</div></div>`;
      item.appendChild(button('✕', 'danger sm', () => {
        this.ctl.deleteRule(r.fingerprint, r.occurrence);
        this.renderBody();
      }));
      this.body.appendChild(item);
    }
  }

  // ---- import/export ------------------------------------------------------

  private exportProfile(): void {
    const blob = new Blob([this.ctl.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-genie-profile.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private importProfile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const res = this.ctl.importJson(String(reader.result));
        this.toast(res.ok ? 'Profile imported' : `Import failed: ${res.error}`);
        if (res.ok) this.renderBody();
      };
      reader.readAsText(file);
    });
    input.click();
  }

  toast(msg: string): void {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    this.shadow.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  toggleFab(show: boolean): void {
    this.fab.style.display = show ? 'flex' : 'none';
  }
}

// ---- small DOM helpers ------------------------------------------------------

function button(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `btn ${cls}`;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function sectionTitle(text: string): HTMLElement {
  const d = document.createElement('div');
  d.className = 'section-title';
  d.textContent = text;
  return d;
}

function toggleRow(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const row = document.createElement('label');
  row.className = 'row';
  row.style.justifyContent = 'space-between';
  const span = document.createElement('span');
  span.className = 'muted';
  span.textContent = label;
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = value;
  cb.addEventListener('change', () => onChange(cb.checked));
  row.append(span, cb);
  return row;
}

function textRow(label: string, value: string, type: string, onChange: (v: string) => void): HTMLElement {
  const field = document.createElement('div');
  field.className = 'field';
  const l = document.createElement('label');
  l.textContent = label;
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = value;
  inp.addEventListener('change', () => onChange(inp.value));
  field.append(l, inp);
  return field;
}
