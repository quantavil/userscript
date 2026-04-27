type UIState = 'idle' | 'loading' | 'success' | 'error';

const ICONS: Record<UIState, string> = {
  idle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>`,
  loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle class="sp" cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/><path class="x" d="M9 9l6 6M15 9l-6 6"/></svg>`,
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path class="chk" d="M5 13l4 4L19 7"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
};

const STYLES = `
#tb-fab { position:fixed; bottom:24px; right:24px; width:44px; height:44px; border-radius:22px; background:#000; color:#fff; display:grid; place-items:center; cursor:pointer; transition:all .3s cubic-bezier(.25,.8,.25,1); box-shadow:0 4px 12px rgba(0,0,0,.15); z-index:99999; border:1px solid transparent; }
#tb-fab svg { width:20px; height:20px; transition:all .3s; }
#tb-fab[data-s="idle"] { opacity:0.3; }
#tb-fab[data-s="idle"]:hover { opacity:1; box-shadow:0 6px 16px rgba(0,0,0,.25); }
#tb-fab[data-s="idle"]:active { transform:scale(.92); }
#tb-fab[data-s="success"] { background:#fff; color:#000; border-color:#e5e5e5; pointer-events:none; transform:scale(1.1); }
#tb-fab[data-s="error"] { background:#fff; color:#000; border-color:#000; animation:sh .4s; }
#tb-fab::after { content:attr(data-t); position:absolute; right:56px; background:#000; color:#fff; padding:6px 12px; border-radius:6px; font:500 12px/1.2 -apple-system,sans-serif; opacity:0; pointer-events:none; transition:opacity .2s; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,.2); }
#tb-fab:hover::after, #tb-fab[data-s="loading"]::after, #tb-fab[data-s="error"]::after { opacity:1; }
#tb-fab[data-s="idle"]:not(:hover):::after { opacity:0; }
@keyframes sp { to { transform:rotate(360deg); } }
.sp { animation:sp 1s linear infinite; transform-origin:50% 50%; }
.x { opacity:0; transition:opacity .2s; }
#tb-fab[data-s="loading"]:hover .sp { opacity:0; }
#tb-fab[data-s="loading"]:hover .x { opacity:1; }
#tb-fab[data-s="loading"]:hover::after { content:"Cancel"; }
@keyframes sh { 25%,75%{transform:translateX(-4px)} 50%{transform:translateX(4px)} }
.chk { stroke-dasharray:24; stroke-dashoffset:24; animation:dr .4s forwards .1s; }
@keyframes dr { to { stroke-dashoffset:0; } }
`;

export class DownloaderUI {
  private el = document.createElement('div');
  private state: UIState = 'idle';

  constructor(private onStart: () => void, private onCancel: () => void) {
    if (!document.getElementById('tb-css')) document.head.insertAdjacentHTML('beforeend', `<style id="tb-css">${STYLES}</style>`);
    this.el.id = 'tb-fab';
    this.el.onclick = () => {
      if (this.state === 'idle' || this.state === 'error') return this.setState('loading'), this.onStart();
      if (this.state === 'loading') return this.onCancel();
    };
    this.setState('idle');
  }

  private setState(s: UIState) {
    this.state = s;
    this.el.dataset.s = s;
    this.el.innerHTML = ICONS[s];
    this.el.dataset.t = { idle:'Download', loading:'Crawling…', success:'Done!', error:'Failed — retry' }[s];
  }

  mount() { document.body.appendChild(this.el); }
  updateStatus(m: string) { if (this.state === 'loading') this.el.dataset.t = m; }
  error(m?: string) { this.setState('error'); if(m) this.el.dataset.t = `Error: ${m}`; setTimeout(() => this.state === 'error' && this.setState('idle'), 5000); }
  finish() { this.setState('success'); setTimeout(() => this.setState('idle'), 2500); }
}