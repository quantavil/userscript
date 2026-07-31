import { GM_xmlhttpRequest, GM_registerMenuCommand } from 'vite-plugin-monkey/dist/client';

/* ------------------------------------------------------------------ *
 * Response shapes (ImpexCube Export Duty Structure endpoints)
 * ------------------------------------------------------------------ */
interface DescriptionResponse { Item_Description?: string; Status?: string; StandardUQC?: string; Item_CCR?: string; }
interface FtaResponse { FTACode?: string; FTAType?: string; EffectiveDate?: string; }
interface MeisResponse { ActualSerNo?: string; ActualHandicraft?: string; ActualDescription?: string; ActualRate?: string; }
interface CessResponse { ActualCessSrNo?: string; ActualCessAct?: string; ActualCessCommodity?: string; ActualCessRate?: string; ActualAccUnit?: string; }
interface DbkResponse { ActualDBK_SERNo?: string; ActualNotnNo?: string; ActualDBK_Desc?: string; ActualDBKRate?: string; ActualDBKSPRate?: string; ActualUnit?: string; ActualROSLRate?: string; ActualROSLCap?: string; }
interface SwiftPgaResponse { PGA_Cd?: string; PGA_Name?: string; Info_Cd?: string; Info_Desc?: string; QFR_Cd?: string; QFR_Desc?: string; REQ?: string; Man_Opt?: string; }
interface RoslResponse { ROSL_SCHNO?: string; ROSL_DESC?: string; ROSL_RATE_PERCENTAGE?: string; ROSL_RATE_AMOUNT?: string; ACCOUNTING_UNIT?: string; }
interface RodetepResponse { RITCNo?: string; RoDTEPDesc?: string; RoDTEPRatePer?: string; RoDTEPCapRate?: string; RoDTEPUQC?: string; }

type RecordStatus = 'success' | 'no-data' | 'failed';

interface ScrapedHsnData {
  hsn: string; country: string; uqc: string; description: string; itcPolicy: string;
  fta: FtaResponse[]; meis: MeisResponse[]; cess: CessResponse[]; dbk: DbkResponse[];
  swiftPga: SwiftPgaResponse[]; rosl: RoslResponse[]; rodetep: RodetepResponse[];
  status: RecordStatus; errorReason?: string;
}

interface Shortcut { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string; }

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */
const BASE = 'https://impexcube.in/DutyStructureExport';
const EP = {
  desc: `${BASE}/FillDescription`, fta: `${BASE}/FillFTA`, meis: `${BASE}/FillMEIS`,
  cess: `${BASE}/FillCESS`, dbk: `${BASE}/FillDBK`, pga: `${BASE}/SingleWindow`, details: `${BASE}/GetDetails`,
} as const;

const REQUEST_TIMEOUT = 12_000;
const INTER_CODE_DELAY = 500;
const RETRY_DELAY = 1_500;
const DRAG_CLICK_THRESHOLD = 4;
const LS_POS = (id: string) => `hx-pos-${id}`;
const LS_SHORTCUT = 'hx-shortcut';
const DEFAULT_SHORTCUT: Shortcut = { ctrl: false, alt: true, shift: false, meta: false, key: 'h' };

/* ------------------------------------------------------------------ *
 * Styles — dark Liquid Glass, amber accent. Base pinned to 1rem, all
 * internal sizing in em => one knob (--hx-fs) rescales everything and
 * it stays immune to whatever the host page does to html font-size.
 * ------------------------------------------------------------------ */
const PANEL_CSS = `
:host {
  all: initial;
  position: fixed !important;
  top: 0; left: 0; width: 0; height: 0;
  z-index: 2147483647 !important;
  pointer-events: none;
}
#hx-panel, #hx-badge {
  pointer-events: auto;
  --hx-fs: 1rem;
  --hx-accent: #f4c152;
  --hx-accent-2: #ffd778;
  --hx-accent-ink: #1a1305;
  --hx-accent-soft: rgba(244,193,82,.14);
  --hx-text: #ededf1;
  --hx-muted: #b1aca2;
  --hx-faint: #78736b;
  --hx-ok: #67d69a;
  --hx-warn: #f0c45a;
  --hx-err: #ff8b82;
  --hx-glass: linear-gradient(155deg, rgba(38,33,22,.62), rgba(15,14,12,.60));
  --hx-glass-2: rgba(255,255,255,.05);
  --hx-edge: rgba(255,255,255,.14);
  --hx-blur: blur(1.5em) saturate(185%);
  --hx-mono: ui-monospace,'JetBrains Mono','SFMono-Regular',Menlo,Consolas,monospace;
  --hx-sans: 'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size: var(--hx-fs);
  box-sizing: border-box;
}
#hx-panel *, #hx-badge * { box-sizing: border-box; }

/* ---- panel shell ---- */
#hx-panel {
  position: fixed; bottom: 1.5em; right: 1.5em; width: 24em;
  font-family: var(--hx-sans); color: var(--hx-text);
  background: var(--hx-glass);
  -webkit-backdrop-filter: var(--hx-blur); backdrop-filter: var(--hx-blur);
  border: 1px solid var(--hx-edge); border-radius: 1.5em;
  box-shadow:
    0 1.75em 4em rgba(0,0,0,.55),
    0 .25em 1em rgba(0,0,0,.35),
    inset 0 1px 0 rgba(255,255,255,.22),
    inset 0 -1px 0 rgba(0,0,0,.35);
  z-index: 2147483647; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column;
  opacity: 0; pointer-events: none; transform: translateY(.75em) scale(.985);
  transition: opacity .22s ease, transform .28s cubic-bezier(.2,.9,.25,1);
}
#hx-panel::before {            /* specular sheen */
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 42%);
}
#hx-panel > * { position: relative; z-index: 1; }
#hx-panel.is-open { opacity: 1; pointer-events: auto; transform: none; }

/* ---- header / drag handle ---- */
#hx-head {
  display: flex; align-items: center; justify-content: space-between;
  height: 3.25em; padding: 0 .75em 0 1.1em;
  border-bottom: 1px solid rgba(255,255,255,.08);
  cursor: grab; user-select: none;
}
#hx-head:active { cursor: grabbing; }
.hx-title {
  display: flex; align-items: center; gap: .6em;
  font-family: var(--hx-mono); font-size: .78em; font-weight: 600;
  letter-spacing: .14em; color: var(--hx-muted); text-transform: uppercase;
}
.hx-glyph {
  width: .7em; height: .7em; border-radius: .18em;
  background: linear-gradient(150deg, var(--hx-accent-2), var(--hx-accent));
  box-shadow: 0 0 .5em var(--hx-accent-soft), 0 0 0 .18em var(--hx-accent-soft);
}
.hx-head-btns { display: flex; gap: .2em; }
.hx-icn {
  width: 2em; height: 2em; display: grid; place-items: center;
  background: transparent; border: none; border-radius: .55em;
  color: var(--hx-faint); cursor: pointer; transition: color .12s, background .12s, transform .15s ease-out;
}
.hx-icn:hover { color: var(--hx-text); background: var(--hx-glass-2); }
.hx-icn svg { width: .85em; height: .85em; }
.hx-icn[data-act="close"]:hover { color: var(--hx-err); background: rgba(255, 139, 130, 0.15); transform: rotate(90deg); }
.hx-icn[data-act="min"]:hover { transform: translateY(2px); }

/* ---- body ---- */
#hx-body { padding: 1.1em; display: flex; flex-direction: column; gap: .9em; }

#hx-input {
  width: 100%; height: 5.2em; resize: none; outline: none;
  background: rgba(0,0,0,.28); color: var(--hx-text);
  border: 1px solid rgba(255,255,255,.10); border-radius: .8em;
  padding: .7em .85em; font-family: var(--hx-mono); font-size: .9em; line-height: 1.5;
  transition: border-color .15s, box-shadow .15s;
}
#hx-input::placeholder { color: var(--hx-faint); }
#hx-input:focus { border-color: var(--hx-accent); box-shadow: 0 0 0 .18em var(--hx-accent-soft); }
#hx-input:disabled { opacity: .5; }

.hx-row {
  display: flex; align-items: center; justify-content: space-between; gap: .8em;
  padding: .65em .85em; background: var(--hx-glass-2);
  border: 1px solid rgba(255,255,255,.08); border-radius: .8em;
}
.hx-row label { font-size: .84em; color: var(--hx-muted); font-weight: 500; }
#hx-country {
  width: 7em; text-align: right; outline: none; background: transparent; border: none;
  color: var(--hx-accent); font-family: var(--hx-mono); font-size: .88em;
}
#hx-key {
  font-family: var(--hx-mono); font-size: .82em; font-weight: 600; color: var(--hx-accent);
  background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.12); border-radius: .5em;
  padding: .3em .7em; cursor: pointer; transition: border-color .15s, color .15s, transform .12s ease;
}
#hx-key:hover { border-color: var(--hx-accent); transform: scale(1.05); }
#hx-key:active { transform: scale(0.95); }
#hx-key.rec { color: var(--hx-warn); border-color: var(--hx-warn); animation: hx-blink 1s steps(2,start) infinite; }

#hx-prog { display: none; flex-direction: column; gap: .45em; }
#hx-prog.on { display: flex; }
.hx-prog-line { display: flex; justify-content: space-between; font-family: var(--hx-mono); font-size: .76em; color: var(--hx-muted); }
.hx-prog-track { height: .32em; background: rgba(0,0,0,.3); border-radius: .2em; overflow: hidden; }
#hx-prog-fill { height: 100%; width: 0; border-radius: .2em; background: linear-gradient(90deg, var(--hx-accent), var(--hx-accent-2)); transition: width .2s ease; }

#hx-log {
  height: 7.2em; overflow-y: auto; padding: .7em .8em;
  background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.07); border-radius: .8em;
  font-family: var(--hx-mono); font-size: .8em; line-height: 1.55; white-space: pre-wrap;
}
#hx-log::-webkit-scrollbar { width: .4em; }
#hx-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: .2em; }
.hx-l { display: block; }
.hx-l .t { color: var(--hx-faint); }
.hx-l.info { color: var(--hx-muted); }
.hx-l.ok { color: var(--hx-ok); }
.hx-l.warn { color: var(--hx-warn); }
.hx-l.err { color: var(--hx-err); }

#hx-foot { display: flex; gap: .6em; }
.hx-btn {
  flex: 1; height: 2.75em; display: flex; align-items: center; justify-content: center; gap: .5em;
  border-radius: .85em; font-family: var(--hx-sans); font-size: .9em; font-weight: 600;
  cursor: pointer; border: 1px solid transparent;
  transition: background .15s, border-color .15s, color .15s, box-shadow .15s, transform .12s ease-out;
}
.hx-btn:hover:not(:disabled) { transform: translateY(-1.5px); }
.hx-btn:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
.hx-btn svg { width: 1.05em; height: 1.05em; }
.hx-run {
  color: var(--hx-accent-ink);
  background: linear-gradient(160deg, var(--hx-accent-2), var(--hx-accent));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 .3em .8em var(--hx-accent-soft);
}
.hx-run:hover:not(:disabled) { box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 .4em 1em rgba(244,193,82,.35); }
.hx-run.stop { background: rgba(255,139,130,.12); color: var(--hx-err); border-color: rgba(255,139,130,.5); box-shadow: none; }
.hx-run.stop:hover { background: rgba(255,139,130,.2); }
.hx-dl { background: var(--hx-glass-2); color: var(--hx-muted); border-color: rgba(255,255,255,.14); }
.hx-dl:hover:not(:disabled) { color: var(--hx-text); border-color: rgba(255,255,255,.28); }
.hx-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ---- minimized badge ---- */
#hx-badge {
  position: fixed; bottom: 1.5em; right: 1.5em; display: flex; align-items: center; gap: .55em;
  padding: .6em 1em; font-family: var(--hx-mono); font-size: .82em; font-weight: 600; letter-spacing: .02em;
  color: var(--hx-text); background: var(--hx-glass);
  -webkit-backdrop-filter: var(--hx-blur); backdrop-filter: var(--hx-blur);
  border: 1px solid var(--hx-edge); border-radius: 1em;
  box-shadow: 0 1em 2.5em rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.2);
  cursor: pointer; user-select: none; z-index: 2147483647;
  opacity: 0; pointer-events: none; transform: scale(.96);
  transition: opacity .18s, transform .18s, border-color .12s;
}
#hx-badge.is-open { opacity: 1; pointer-events: auto; transform: none; }
#hx-badge:hover { border-color: rgba(255,255,255,.3); }
.hx-dot { width: .55em; height: .55em; border-radius: 50%; background: var(--hx-accent); }
.hx-dot.run { animation: hx-blink 1.1s steps(2,start) infinite; }
.hx-dot.ok { background: var(--hx-ok); }
.hx-dot.err { background: var(--hx-err); }
@keyframes hx-blink { 50% { opacity: .3; } }
`;

const ts = (): string => new Date().toTimeString().slice(0, 8);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Trusted-Types-safe DOM builders.
 * Gemini (and any site with `require-trusted-types-for 'script'`)
 * throws on `.innerHTML =`. A named createPolicy() also throws there
 * because the name is not allow-listed, so we never touch innerHTML:
 * DOMParser.parseFromString is NOT a Trusted Types sink.
 * ------------------------------------------------------------------ */
function htmlToFragment(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const frag = document.createDocumentFragment();
  while (doc.body.firstChild) frag.appendChild(doc.body.firstChild);
  return frag;
}
function setHTML(el: Element, html: string): void {
  el.replaceChildren(htmlToFragment(html));
}
function isEditableEl(el: EventTarget | null | undefined): boolean {
  const e = el as HTMLElement | null | undefined;
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.isContentEditable === true);
}

const ICON = {
  min: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  run: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
};

function labelShortcut(s: Shortcut): string {
  const plat = (navigator as any).userAgentData?.platform || navigator.platform || '';
  const isMac = /Mac|iPhone|iPad/i.test(plat);
  const parts: string[] = [];
  if (s.ctrl) parts.push('Ctrl');
  if (s.alt) parts.push(isMac ? 'Opt' : 'Alt');
  if (s.shift) parts.push('Shift');
  if (s.meta) parts.push(isMac ? 'Cmd' : 'Win');
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join(' + ');
}

class ExporterUI {
  private panel: HTMLDivElement | null = null;
  private badge: HTMLDivElement | null = null;
  private el: Record<string, HTMLElement> = {};
  private processing = false;
  private aborted = false;
  private markdown = '';
  private shortcut: Shortcut = DEFAULT_SHORTCUT;
  private listening = false;

  constructor() {
    try {
      const raw = localStorage.getItem(LS_SHORTCUT);
      if (raw) this.shortcut = { ...DEFAULT_SHORTCUT, ...JSON.parse(raw) };
    } catch { /* keep default */ }
    document.addEventListener('keydown', this.onKey, true);
  }

  /* ---------------------------- lifecycle ---------------------------- */
  public show(): void {
    const root = document.getElementById('hx-root');
    if (!this.panel || !root) {
      if (root) root.remove();
      this.build();
    }
    this.badge?.classList.remove('is-open');
    this.panel?.classList.add('is-open');
    // Auto-focus our textarea so the very first keystroke lands here.
    setTimeout(() => (this.el.input as HTMLTextAreaElement | undefined)?.focus(), 0);
  }
  private minimize(): void {
    this.panel?.classList.remove('is-open');
    this.badge?.classList.add('is-open');
  }
  private close(): void {
    if (this.processing && !confirm('Extraction is running. Stop and close?')) return;
    this.aborted = true;
    this.panel?.classList.remove('is-open');
    this.badge?.classList.remove('is-open');
  }
  private toggle(): void {
    if (!this.panel || !this.panel.classList.contains('is-open')) this.show();
    else this.minimize();
  }

  /* --------------------------- shortcut ------------------------------ */
  private onKey = (e: KeyboardEvent): void => {
    if (this.listening) {
      e.preventDefault(); e.stopPropagation();
      const k = e.key;
      if (k === 'Escape') { this.stopRecording(); return; }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(k)) return; // wait for a real key
      this.shortcut = { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey, key: k.toLowerCase() };
      try { localStorage.setItem(LS_SHORTCUT, JSON.stringify(this.shortcut)); } catch { /* ignore */ }
      this.stopRecording();
      return;
    }

    // Ignore the shortcut while typing in ANY editable field. Because of
    // shadow-DOM retargeting, e.target is the host <div> when focus is in
    // our own textarea, so inspect composedPath()[0] as well.
    const origin = e.composedPath()[0];
    if (isEditableEl(origin) || isEditableEl(e.target)) return;

    const s = this.shortcut;
    if (e.ctrlKey === s.ctrl && e.altKey === s.alt && e.shiftKey === s.shift && e.metaKey === s.meta
      && e.key.toLowerCase() === s.key) {
      e.preventDefault();
      this.toggle();
    }
  };

  private startRecording(): void {
    this.listening = true;
    const chip = this.el.key;
    chip.classList.add('rec');
    chip.textContent = 'Press keys …';
    const cancelOutside = (ev: MouseEvent) => {
      if (!ev.composedPath().includes(chip)) this.stopRecording();
    };
    (chip as any)._cancel = cancelOutside;
    document.addEventListener('mousedown', cancelOutside, true);
  }
  private stopRecording(): void {
    this.listening = false;
    const chip = this.el.key;
    chip.classList.remove('rec');
    chip.textContent = labelShortcut(this.shortcut);
    const c = (chip as any)._cancel;
    if (c) { document.removeEventListener('mousedown', c, true); (chip as any)._cancel = null; }
  }

  /* ------------------------------ build ------------------------------ */
  private build(): void {
    const host = document.createElement('div');
    host.id = 'hx-root';
    host.style.cssText = 'all:initial;position:fixed!important;top:0;left:0;width:0;height:0;z-index:2147483647!important;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'open' });

    // adoptedStyleSheets bypasses strict `style-src` CSP; fall back to <style>.
    if ('adoptedStyleSheets' in Document.prototype && typeof CSSStyleSheet !== 'undefined'
      && 'replaceSync' in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(PANEL_CSS);
      (shadow as any).adoptedStyleSheets = [sheet];
    } else {
      const style = document.createElement('style');
      style.textContent = PANEL_CSS;
      shadow.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.id = 'hx-panel';
    setHTML(panel, `
      <div id="hx-head">
        <div class="hx-title"><span class="hx-glyph"></span>IMPEXCUBE EXPORTER</div>
        <div class="hx-head-btns">
          <button class="hx-icn" data-act="min" title="Minimize">${ICON.min}</button>
          <button class="hx-icn" data-act="close" title="Close">${ICON.close}</button>
        </div>
      </div>
      <div id="hx-body">
        <textarea id="hx-input" spellcheck="false" placeholder="HSN / RITC codes — e.g. 44199090, 73269099"></textarea>
        <div class="hx-row">
          <label for="hx-country">Country param</label>
          <input id="hx-country" spellcheck="false" value="null" />
        </div>
        <div class="hx-row">
          <label>Toggle shortcut</label>
          <button id="hx-key" title="Click, then press a key combination"></button>
        </div>
        <div id="hx-prog">
          <div class="hx-prog-line"><span id="hx-prog-status">Idle</span><span id="hx-prog-pct">0%</span></div>
          <div class="hx-prog-track"><div id="hx-prog-fill"></div></div>
        </div>
        <div id="hx-log"></div>
        <div id="hx-foot">
          <button class="hx-btn hx-run" data-act="run">${ICON.run}<span>Run</span></button>
          <button class="hx-btn hx-dl" data-act="dl" disabled>${ICON.dl}<span>Download</span></button>
        </div>
      </div>`);
    shadow.appendChild(panel);
    this.panel = panel;

    const badge = document.createElement('div');
    badge.id = 'hx-badge';
    setHTML(badge, `<span class="hx-dot" id="hx-dot"></span><span id="hx-badge-text">Exporter</span>`);
    shadow.appendChild(badge);
    this.badge = badge;

    document.body.appendChild(host);

    this.el = {
      log: panel.querySelector('#hx-log')!,
      prog: panel.querySelector('#hx-prog')!,
      progStatus: panel.querySelector('#hx-prog-status')!,
      progPct: panel.querySelector('#hx-prog-pct')!,
      progFill: panel.querySelector('#hx-prog-fill')!,
      input: panel.querySelector('#hx-input')!,
      country: panel.querySelector('#hx-country')!,
      key: panel.querySelector('#hx-key')!,
      run: panel.querySelector('[data-act="run"]')!,
      dl: panel.querySelector('[data-act="dl"]')!,
      dot: badge.querySelector('#hx-dot')!,
      badgeText: badge.querySelector('#hx-badge-text')!,
    };
    this.el.key.textContent = labelShortcut(this.shortcut);

    // Stop keyboard/clipboard events leaking out of the shadow root, or the
    // host chat app's global "type-to-focus" handler steals focus mid-keystroke.
    // stopPropagation() at the target halts bubbling before it reaches any
    // document-level host listener, and does NOT block the default (typing works).
    this.shield(this.el.input);
    this.shield(this.el.country);

    // Ctrl/Cmd+Enter to run from the textarea.
    this.el.input.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        if (!this.processing) this.run();
      }
    });

    panel.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
      if (act === 'min') this.minimize();
      else if (act === 'close') this.close();
      else if (act === 'run') this.processing ? (this.aborted = true) : this.run();
      else if (act === 'dl') this.download();
    });
    this.el.key.addEventListener('click', () => (this.listening ? this.stopRecording() : this.startRecording()));

    this.makeDraggable(panel, panel.querySelector('#hx-head')!);
    this.makeDraggable(badge, badge, () => this.show());
    window.addEventListener('resize', () => { this.clamp(panel); this.clamp(badge); });

    this.log('Exporter ready.', 'info');
  }

  private shield(node: HTMLElement): void {
    const stop = (e: Event) => e.stopPropagation();
    (['keydown', 'keyup', 'keypress', 'input', 'beforeinput', 'paste', 'cut', 'copy'] as const)
      .forEach((t) => node.addEventListener(t, stop));
  }

  /* ---------------------------- dragging ----------------------------- */
  private makeDraggable(node: HTMLElement, handle: HTMLElement, onClick?: () => void): void {
    let sx = 0, sy = 0, moved = 0;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      const top = Math.min(Math.max(0, node.offsetTop + dy), window.innerHeight - node.offsetHeight);
      const left = Math.min(Math.max(0, node.offsetLeft + dx), window.innerWidth - node.offsetWidth);
      Object.assign(node.style, { top: `${top}px`, left: `${left}px`, bottom: 'auto', right: 'auto' });
      sx = e.clientX; sy = e.clientY;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved <= DRAG_CLICK_THRESHOLD) { onClick?.(); return; }
      try { localStorage.setItem(LS_POS(node.id), JSON.stringify({ top: node.style.top, left: node.style.left })); } catch { /* ignore */ }
    };
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      sx = e.clientX; sy = e.clientY; moved = 0;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    try {
      const saved = localStorage.getItem(LS_POS(node.id));
      if (saved) {
        const { top, left } = JSON.parse(saved);
        if (top && left) Object.assign(node.style, { top, left, bottom: 'auto', right: 'auto' });
      }
    } catch { /* ignore */ }
  }

  private clamp(node: HTMLElement | null): void {
    if (!node || node.style.top === '') return;
    const top = Math.min(Math.max(0, parseFloat(node.style.top)), window.innerHeight - node.offsetHeight);
    const left = Math.min(Math.max(0, parseFloat(node.style.left)), window.innerWidth - node.offsetWidth);
    node.style.top = `${top}px`; node.style.left = `${left}px`;
  }

  /* ------------------------------- ui io ----------------------------- */
  private log(msg: string, kind: 'info' | 'ok' | 'warn' | 'err' = 'info'): void {
    // Built with DOM nodes (no innerHTML) so it is Trusted-Types-safe and
    // never treats scraped/message text as markup.
    const line = document.createElement('span');
    line.className = `hx-l ${kind}`;
    const tspan = document.createElement('span');
    tspan.className = 't';
    tspan.textContent = `[${ts()}] `;
    line.appendChild(tspan);
    line.appendChild(document.createTextNode(msg));
    this.el.log.appendChild(line);
    this.el.log.scrollTop = this.el.log.scrollHeight;
  }

  private progress(done: number, total: number, hsn: string, error: boolean): void {
    this.el.prog.classList.add('on');
    const pct = total ? Math.round((done / total) * 100) : 0;
    this.el.progPct.textContent = `${pct}%`;
    (this.el.progFill as HTMLElement).style.width = `${pct}%`;
    const finished = done === total;
    this.el.progStatus.textContent = finished ? 'Completed' : `Scraping ${done}/${total} · ${hsn}`;
    this.el.badgeText.textContent = finished ? 'Done' : `${done}/${total}`;
    this.el.dot.className = `hx-dot ${finished ? (error ? 'err' : 'ok') : 'run'}`;
  }

  private setProcessing(on: boolean): void {
    this.processing = on;
    const run = this.el.run as HTMLButtonElement;
    run.classList.toggle('stop', on);
    setHTML(run, on ? `${ICON.stop}<span>Stop</span>` : `${ICON.run}<span>Run</span>`);
    (this.el.input as HTMLTextAreaElement).disabled = on;
    (this.el.country as HTMLInputElement).disabled = on;
    (this.el.dl as HTMLButtonElement).disabled = on || !this.markdown;
  }

  /* ------------------------------ run job ---------------------------- */
  private async run(): Promise<void> {
    const raw = (this.el.input as HTMLTextAreaElement).value.trim();
    if (!raw) { alert('Enter at least one HSN code.'); return; }
    const codes = [...new Set(raw.split(/[\s,]+/).map((c) => c.trim()).filter(Boolean))];
    if (!codes.length) { alert('No valid codes detected.'); return; }
    const country = (this.el.country as HTMLInputElement).value.trim() || 'null';

    this.aborted = false; this.markdown = '';
    this.el.log.replaceChildren();
    this.setProcessing(true);
    this.log(`Queued ${codes.length} code(s). Country=${country}.`, 'info');
    this.progress(0, codes.length, '', false);

    const out: string[] = [this.reportHeader(codes.length)];
    let ok = 0, warn = 0, fail = 0;

    for (let i = 0; i < codes.length; i++) {
      if (this.aborted) { this.log('Aborted by user.', 'warn'); break; }
      const hsn = codes[i];
      this.progress(i, codes.length, hsn, fail > 0);
      this.log(`[${i + 1}/${codes.length}] ${hsn} …`, 'info');

      const data = await this.scrapeWithRetry(hsn, country);
      if (data.status === 'success') { ok++; this.log(`${hsn} ok`, 'ok'); out.push(this.recordMd(data)); }
      else if (data.status === 'no-data') { warn++; this.log(`${hsn} no data`, 'warn'); out.push(this.calloutMd(hsn, 'warning', 'No Data', `No Export Duty Structure data returned for \\\`${hsn}\\\`.`)); }
      else { fail++; this.log(`${hsn} failed: ${data.errorReason}`, 'err'); out.push(this.calloutMd(hsn, 'danger', 'Scrape Failed', `**Error:** ${data.errorReason ?? 'unknown'}`)); }

      this.progress(i + 1, codes.length, hsn, fail > 0);
      if (i < codes.length - 1 && !this.aborted) await sleep(INTER_CODE_DELAY);
    }

    this.markdown = out.join('');
    this.setProcessing(false);
    (this.el.dl as HTMLButtonElement).disabled = !this.markdown;
    this.log(`Done. ok=${ok} warn=${warn} fail=${fail}`, fail ? 'warn' : 'ok');
  }

  /* ---------------------------- scraping ----------------------------- */
  private async scrapeWithRetry(hsn: string, country: string): Promise<ScrapedHsnData> {
    try {
      return await this.scrape(hsn, country);
    } catch {
      this.log(`${hsn} retrying …`, 'warn');
      await sleep(RETRY_DELAY);
      try { return await this.scrape(hsn, country); }
      catch (e2) { return blankRecord(hsn, country, 'failed', (e2 as Error).message); }
    }
  }

  private async scrape(hsn: string, country: string): Promise<ScrapedHsnData> {
    const desc = await this.post<DescriptionResponse[]>(EP.desc, { RITC: hsn, Country: country, Mode: 'Description' });
    if (!desc?.length) return blankRecord(hsn, country, 'no-data');
    const d = desc[0];
    const [fta, meis, cess, dbk, swiftPga, rosl, rodetep] = await Promise.all([
      this.postSafe<FtaResponse[]>(EP.fta, { RITC: hsn, Country: country, Mode: 'FTA' }),
      this.postSafe<MeisResponse[]>(EP.meis, { RITC: hsn, Country: country, Mode: 'MEIS' }),
      this.postSafe<CessResponse[]>(EP.cess, { RITC: hsn, Country: country, Mode: 'CESS' }),
      this.postSafe<DbkResponse[]>(EP.dbk, { RITC: hsn, Country: country, Mode: 'DBK' }),
      this.postSafe<SwiftPgaResponse[]>(EP.pga, { RITC: hsn, Country: country, Mode: 'SingleWindow' }),
      this.postSafe<RoslResponse[]>(EP.details, { RITC: hsn, Country: country, Mode: 'ROSL' }),
      this.postSafe<RodetepResponse[]>(EP.details, { RITC: hsn, Country: country, Mode: 'RODEP' }),
    ]);
    return {
      hsn, country,
      uqc: d.StandardUQC || 'N/A',
      description: d.Item_Description || 'N/A',
      itcPolicy: d.Status || 'N/A',
      fta, meis, cess, dbk, swiftPga, rosl, rodetep, status: 'success',
    };
  }

  private post<T>(url: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST', url, timeout: REQUEST_TIMEOUT,
        headers: { 'Content-Type': 'application/json;charset=utf-8', Accept: 'application/json, text/plain, */*' },
        data: JSON.stringify(payload),
        onload: (r: any) => {
          if (r.status < 200 || r.status >= 300) return reject(new Error(`HTTP ${r.status}`));
          const text = (r.responseText || '').trim();
          if (!text || text === '""') return resolve([] as unknown as T);
          try { resolve(JSON.parse(text) as T); }
          catch (err) { reject(new Error(`Parse error: ${(err as Error).message}`)); }
        },
        onerror: (r: any) => reject(new Error(r?.statusText || 'Network error')),
        ontimeout: () => reject(new Error('Timeout (12s)')),
      });
    });
  }

  private async postSafe<T extends unknown[]>(url: string, payload: unknown): Promise<T> {
    try { const v = await this.post<T>(url, payload); return Array.isArray(v) ? v : ([] as unknown as T); }
    catch { return [] as unknown as T; }
  }

  /* ---------------------------- markdown ----------------------------- */
  private reportHeader(count: number): string {
    const date = new Date().toISOString().slice(0, 10);
    return [
      '---', 'title: Export Duty Structure Report', `date: ${date}`,
      'tags:', '  - impexcube', '  - duty-structure', '  - export', '---', '',
      '# Export Duty Structure Report', `*Generated: ${date} ${ts()} · ${count} code(s)*`, '', '---', '', '',
    ].join('\n');
  }

  private calloutMd(hsn: string, type: 'warning' | 'danger', title: string, body: string): string {
    return `## HSN ${hsn}\n> [!${type}] ${title}\n> ${body}\n\n---\n\n`;
  }

  private table<T>(title: string, headers: string[], keys: (keyof T)[], rows: T[]): string {
    if (!rows.length) return `### ${title}\n> [!info] No data\n\n`;
    const cell = (v: unknown) => (v == null ? '' : String(v).replace(/\|/g, '\\|').replace(/\n/g, '<br>').trim());
    return [
      `### ${title}`,
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map((r) => `| ${keys.map((k) => cell(r[k])).join(' | ')} |`),
      '',
    ].join('\n');
  }

  private recordMd(d: ScrapedHsnData): string {
    const desc = d.description.replace(/\s+/g, ' ').trim();
    return [
      `## HSN ${d.hsn}`,
      `**Country** \\\`${d.country}\\\` · **UQC** \\\`${d.uqc}\\\` · **ITC Policy** \\\`${d.itcPolicy}\\\``,
      '', '**Description**', `> ${desc}`, '',
      this.table('FTA Details', ['Agreement Code', 'Name', 'Date'], ['FTACode', 'FTAType', 'EffectiveDate'], d.fta),
      this.table('MEIS Details', ['Ser No', 'Handicraft', 'Description', 'Rate'], ['ActualSerNo', 'ActualHandicraft', 'ActualDescription', 'ActualRate'], d.meis),
      this.table('CESS Details', ['Sr No', 'Act', 'Commodity', 'Rate', 'Unit'], ['ActualCessSrNo', 'ActualCessAct', 'ActualCessCommodity', 'ActualCessRate', 'ActualAccUnit'], d.cess),
      this.table('DBK Details', ['Sr No', 'Notn No', 'Desc', 'Rate', 'Sp Rate/Cap', 'Unit', 'ROSL Rate', 'ROSL Cap'], ['ActualDBK_SERNo', 'ActualNotnNo', 'ActualDBK_Desc', 'ActualDBKRate', 'ActualDBKSPRate', 'ActualUnit', 'ActualROSLRate', 'ActualROSLCap'], d.dbk),
      this.table('SWIFT PGA Details', ['PGA', 'PGA Name', 'Info Cd', 'Info Desc', 'QFR', 'QFR Desc', 'Req', 'Man/Opt'], ['PGA_Cd', 'PGA_Name', 'Info_Cd', 'Info_Desc', 'QFR_Cd', 'QFR_Desc', 'REQ', 'Man_Opt'], d.swiftPga),
      this.table('ROSL Details', ['Sch No', 'Desc', 'Rate %', 'Amount', 'Unit'], ['ROSL_SCHNO', 'ROSL_DESC', 'ROSL_RATE_PERCENTAGE', 'ROSL_RATE_AMOUNT', 'ACCOUNTING_UNIT'], d.rosl),
      this.table('RoDTEP Details', ['RITC', 'Desc', 'Rate %', 'Cap', 'UQC'], ['RITCNo', 'RoDTEPDesc', 'RoDTEPRatePer', 'RoDTEPCapRate', 'RoDTEPUQC'], d.rodetep),
      '---', '', '',
    ].join('\n');
  }

  private download(): void {
    if (!this.markdown) return;
    const stamp = `${new Date().toISOString().slice(0, 10)}_${ts().replace(/:/g, '')}`;
    const url = URL.createObjectURL(new Blob([this.markdown], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `ImpexCube_Duty_Report_${stamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.log('Markdown downloaded.', 'ok');
  }
}

/* ------------------------------ helpers ------------------------------ */
function blankRecord(hsn: string, country: string, status: RecordStatus, errorReason?: string): ScrapedHsnData {
  return {
    hsn, country, uqc: 'N/A', description: '', itcPolicy: '',
    fta: [], meis: [], cess: [], dbk: [], swiftPga: [], rosl: [], rodetep: [],
    status, errorReason,
  };
}

/* ------------------------------ bootstrap ---------------------------- */
const ui = new ExporterUI();
GM_registerMenuCommand('Export HSN Duty Details', () => ui.show());