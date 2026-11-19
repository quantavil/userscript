import { render } from 'preact';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  FORKS_STOPS,
  IDS,
  KEYWORDS,
  NAME,
  POPULAR_LANGUAGES,
  SORTS,
  STAR_PRESETS,
  STARS_STOPS
} from './config';
import { Icon, type IconName, iconSvg } from './icons';
import {
  buildQuery,
  buildUrl,
  countActiveFilters,
  type DateRange,
  emptyState,
  type FormState,
  fromIndex,
  type NumberRange,
  parseUrl,
  queryParts,
  removeQueryPart,
  shiftDays,
  toIndex,
  tokenize
} from './query';
import { addPreset, getPresets, type Preset, removePreset } from './storage';

interface PanelControl {
  toggle(next: FormState): void;
}

let panelControl: PanelControl | null = null;
let host: HTMLDivElement | null = null;

const setExpanded = (open: boolean) =>
  document.getElementById(IDS.fab)?.setAttribute('aria-expanded', String(open));

const search = (state: FormState) => location.assign(buildUrl(state));

const formatCount = (value: number) => {
  if (value < 1000) return String(value);
  const k = Math.round(value / 100) / 10;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

function rangeReadout(r: NumberRange): string {
  if (r.min > 0 && r.max > 0) return `${formatCount(r.min)} – ${formatCount(r.max)}`;
  if (r.min > 0) return `${formatCount(r.min)}+`;
  if (r.max > 0) return `≤ ${formatCount(r.max)}`;
  return 'Any';
}

function dateReadout(d: DateRange): string {
  if (d.from && d.to) return d.from === d.to ? d.from : `${d.from} – ${d.to}`;
  if (d.from) return `From ${d.from}`;
  if (d.to) return `Until ${d.to}`;
  return 'Any';
}

function Field({
  id,
  label,
  value,
  placeholder,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange(val: string): void;
}) {
  return (
    <div class="ghf-field">
      <label class="ghf-label" for={`ghf-${id}`}>{label}</label>
      <div class="ghf-input-wrap">
        <input
          id={`ghf-${id}`}
          class="ghf-input"
          type="text"
          value={value}
          placeholder={placeholder}
          autocomplete="off"
          spellcheck={false}
          onInput={e => onChange(e.currentTarget.value)}
        />
        {value && (
          <button type="button" class="ghf-clear-btn" aria-label={`Clear ${label}`} onClick={() => onChange('')}>
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function RangeSlider({
  label,
  icon,
  stops,
  value,
  presets,
  onChange
}: {
  label: string;
  icon: IconName;
  stops: readonly number[];
  value: NumberRange;
  presets?: readonly number[];
  onChange(val: NumberRange): void;
}) {
  const last = stops.length - 1;
  const [lead, setLead] = useState<'min' | 'max'>('max');

  const lo = value.min > 0 ? toIndex(stops, value.min, 'min') : 0;
  const hi = value.max > 0 ? toIndex(stops, value.max, 'max') : last;
  const filtered = value.min > 0 || value.max > 0;

  const setLo = (idx: number) => onChange({ min: fromIndex(stops, Math.min(idx, hi), 'min'), max: value.max });
  const setHi = (idx: number) => onChange({ min: value.min, max: fromIndex(stops, Math.max(idx, lo, 1), 'max') });

  const jump = (e: PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left - 8) / Math.max(rect.width - 16, 1), 0), 1);
    const idx = Math.round(ratio * last);
    const target = idx < lo ? 'min' : idx > hi ? 'max' : idx - lo < hi - idx ? 'min' : 'max';
    setLead(target);
    if (target === 'min') setLo(idx);
    else setHi(idx);
  };

  return (
    <div class="ghf-slider-row">
      <div class="ghf-slider-header">
        <span class="ghf-slider-title"><Icon name={icon} size={14} />{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span class="ghf-readout">{rangeReadout(value)}</span>
          {filtered && (
            <button type="button" class="ghf-clear-btn" aria-label={`Clear ${label}`} onClick={() => onChange({ min: 0, max: 0 })}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>
      <div class="ghf-slider" onPointerDown={jump}>
        <div class="ghf-slider-track">
          {filtered && <div class="ghf-slider-fill" style={{ left: `${(lo / last) * 100}%`, right: `${(1 - hi / last) * 100}%` }} />}
        </div>
        <input
          type="range" min={0} max={last} step={1} value={lo}
          aria-label={`Minimum ${label}`}
          style={{ zIndex: lead === 'min' ? 3 : 2 }}
          onFocus={() => setLead('min')}
          onPointerDown={() => setLead('min')}
          onInput={e => { setLead('min'); setLo(Number(e.currentTarget.value)); }}
        />
        <input
          type="range" min={0} max={last} step={1} value={hi}
          aria-label={`Maximum ${label}`}
          style={{ zIndex: lead === 'max' ? 3 : 2 }}
          onFocus={() => setLead('max')}
          onPointerDown={() => setLead('max')}
          onInput={e => { setLead('max'); setHi(Number(e.currentTarget.value)); }}
        />
      </div>
      {presets && (
        <div class="ghf-chips">
          {presets.map(p => {
            const active = value.min === p && value.max === 0;
            return (
              <button
                key={p} type="button"
                class={`ghf-chip ${active ? 'ghf-chip-active' : ''}`}
                onClick={() => onChange({ min: active ? 0 : p, max: 0 })}
              >
                {formatCount(p)}+
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DatePicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: DateRange;
  onChange(val: DateRange): void;
}) {
  const filtered = Boolean(value.from || value.to);
  const applyPreset = (days: number) => {
    const today = new Date().toISOString().slice(0, 10);
    onChange({ from: shiftDays(today, -days), to: '' });
  };

  return (
    <div class="ghf-slider-row">
      <div class="ghf-slider-header">
        <span class="ghf-slider-title"><Icon name="calendar" size={14} />{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span class="ghf-readout">{dateReadout(value)}</span>
          {filtered && (
            <button type="button" class="ghf-clear-btn" aria-label={`Clear ${label}`} onClick={() => onChange({ from: '', to: '' })}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>
      <div class="ghf-dates">
        <input
          class="ghf-date" type="date" value={value.from} max={value.to || undefined}
          aria-label={`${label} from`} onInput={e => onChange({ ...value, from: e.currentTarget.value })}
        />
        <span class="ghf-date-sep">→</span>
        <input
          class="ghf-date" type="date" value={value.to} min={value.from || undefined}
          aria-label={`${label} to`} onInput={e => onChange({ ...value, to: e.currentTarget.value })}
        />
      </div>
      <div class="ghf-chips">
        {[{ label: 'Past 7d', days: 7 }, { label: 'Past 30d', days: 30 }, { label: 'Past year', days: 365 }].map(p => (
          <button key={p.days} type="button" class="ghf-chip" onClick={() => applyPreset(p.days)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  const [state, setState] = useState<FormState>(emptyState);
  const [tab, setTab] = useState<'builder' | 'presets'>('builder');
  const [presets, setPresets] = useState<Preset[]>(getPresets);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openRequest, setOpenRequest] = useState(0);

  const parts = useMemo(() => queryParts(state), [state]);
  const activeCount = useMemo(() => countActiveFilters(state), [state]);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setState(cur => ({ ...cur, [key]: val }));

  const toggleLang = (langName: string) => {
    const cur = tokenize(state.lang);
    const exists = cur.some(t => t.toLowerCase() === langName.toLowerCase());
    const next = exists ? cur.filter(t => t.toLowerCase() !== langName.toLowerCase()) : [...cur, langName];
    setField('lang', next.join(', '));
  };

  const savePreset = () => {
    if (!parts.length) {
      setError('Add terms or filters first.');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name required.');
      nameRef.current?.focus();
      return;
    }
    setPresets(addPreset(trimmed, state));
    setName('');
    setError('');
  };

  const copyQuery = () => {
    const text = buildQuery(state);
    if (!text) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
    });
  };

  useLayoutEffect(() => {
    panelControl = {
      toggle(next) {
        const d = dialogRef.current;
        if (!d) return;
        if (d.open) {
          d.close();
          return;
        }
        setState(next);
        setTab('builder');
        setPresets(getPresets());
        setOpenRequest(r => r + 1);
      }
    };
    return () => { panelControl = null; };
  }, []);

  useLayoutEffect(() => {
    if (!openRequest) return;
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
    setExpanded(true);
    d.querySelector<HTMLInputElement>('.ghf-input')?.focus();
  }, [openRequest]);

  const close = () => dialogRef.current?.close();

  const hideWords = tokenize(state.hide).map(w => w.replace(/^-?"|"$/g, ''));

  return (
    <dialog
      id={IDS.panel}
      ref={dialogRef}
      // Light dismiss per modern-web-guidance: closedby="any" with fallback click handler
      {...({ closedby: 'any' } as any)}
      aria-labelledby="ghf-panel-title"
      onClose={() => { setExpanded(false); setPendingDelete(null); }}
      onClick={e => { if (e.target === dialogRef.current) close(); }}
      onKeyDown={e => { if (e.key === 'Escape') close(); }}
    >
      <form class="ghf-form" onSubmit={e => { e.preventDefault(); search(state); }}>
        <header class="ghf-head">
          <div class="ghf-titlebar">
            <div class="ghf-brand">
              <span class="ghf-brand-icon"><Icon name="filter" size={15} /></span>
              <h2 id="ghf-panel-title">{NAME}</h2>
            </div>
            <button type="button" class="ghf-icon-btn" title="Close" aria-label="Close" onClick={close}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div class="ghf-tabs" role="tablist" aria-label="Sections">
            <button
              type="button" role="tab" class="ghf-tab-btn" aria-selected={tab === 'builder'}
              onClick={() => setTab('builder')}
            >
              Builder {activeCount > 0 && <span class="ghf-pill">{activeCount}</span>}
            </button>
            <button
              type="button" role="tab" class="ghf-tab-btn" aria-selected={tab === 'presets'}
              onClick={() => setTab('presets')}
            >
              Presets {presets.length > 0 && <span class="ghf-pill">{presets.length}</span>}
            </button>
          </div>
        </header>

        <div class="ghf-body">
          <div hidden={tab !== 'builder'}>
            <div class="ghf-card">
              <div class="ghf-card-head"><h3 class="ghf-card-title"><Icon name="search" size={14} />Keywords</h3></div>
              <div class="ghf-fields">
                {KEYWORDS.map(k => (
                  <Field key={k.id} id={k.id} label={k.label} placeholder={k.placeholder} value={state[k.id]} onChange={v => setField(k.id, v)} />
                ))}
              </div>
            </div>

            <div class="ghf-card">
              <div class="ghf-card-head">
                <h3 class="ghf-card-title"><Icon name="code" size={14} />Repository & Language</h3>
                <div class="ghf-sort-wrap">
                  <select class="ghf-sort-select" value={state.sort} onChange={e => setField('sort', e.currentTarget.value)}>
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Icon name="chevronDown" size={12} />
                </div>
              </div>
              <div class="ghf-fields">
                <Field id="repo" label="Target Repository" placeholder="e.g. facebook/react" value={state.repo} onChange={v => setField('repo', v)} />
                <div class="ghf-field">
                  <Field id="lang" label="Language" placeholder="e.g. python, -html" value={state.lang} onChange={v => setField('lang', v)} />
                  <div class="ghf-chips">
                    {POPULAR_LANGUAGES.map(lang => {
                      const active = tokenize(state.lang).some(t => t.toLowerCase() === lang.toLowerCase());
                      return (
                        <button key={lang} type="button" class={`ghf-chip ${active ? 'ghf-chip-active' : ''}`} onClick={() => toggleLang(lang)}>
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div class="ghf-card">
              <div class="ghf-card-head"><h3 class="ghf-card-title"><Icon name="star" size={14} />Metrics</h3></div>
              <RangeSlider label="Stars" icon="star" stops={STARS_STOPS} value={state.stars} presets={STAR_PRESETS} onChange={v => setField('stars', v)} />
              <RangeSlider label="Forks" icon="gitFork" stops={FORKS_STOPS} value={state.forks} onChange={v => setField('forks', v)} />
            </div>

            <div class="ghf-card">
              <div class="ghf-card-head"><h3 class="ghf-card-title"><Icon name="calendar" size={14} />Activity</h3></div>
              <DatePicker label="Created" value={state.created} onChange={v => setField('created', v)} />
              <DatePicker label="Pushed" value={state.pushed} onChange={v => setField('pushed', v)} />
            </div>
          </div>

          <div hidden={tab !== 'presets'}>
            <div class="ghf-card">
              <div class="ghf-card-head"><h3 class="ghf-card-title">Save Preset</h3></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div class="ghf-input-wrap" style={{ flex: 1 }}>
                  <input
                    ref={nameRef} class="ghf-input" type="text" placeholder="Preset name" maxLength={60}
                    value={name} onInput={e => { setName(e.currentTarget.value); setError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); savePreset(); } }}
                  />
                </div>
                <button type="button" class="ghf-btn ghf-btn-primary" disabled={!parts.length || !name.trim()} onClick={savePreset}>
                  Save
                </button>
              </div>
              {error && <p style={{ color: 'var(--ghf-danger)', fontSize: '11px', margin: '4px 0 0' }}>{error}</p>}
            </div>

            {presets.length ? (
              <ul class="ghf-preset-list">
                {presets.map(p => (
                  <li key={p.id} class="ghf-preset-card">
                    <div class="ghf-preset-row">
                      <span class="ghf-preset-name">{p.name}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" class="ghf-btn" onClick={() => { setState(p.state); setTab('builder'); }}>Load</button>
                        <button type="button" class="ghf-btn ghf-btn-primary" onClick={() => search(p.state)}>Run</button>
                        <button
                          type="button" class="ghf-icon-btn" style={{ color: pendingDelete === p.id ? 'var(--ghf-danger)' : undefined }}
                          onClick={() => {
                            if (pendingDelete === p.id) {
                              setPresets(removePreset(p.id));
                              setPendingDelete(null);
                            } else {
                              setPendingDelete(p.id);
                            }
                          }}
                        >
                          {pendingDelete === p.id ? 'Del?' : <Icon name="trash" size={13} />}
                        </button>
                      </div>
                    </div>
                    <span class="ghf-preset-summary">{buildQuery(p.state) || 'All repos'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div class="ghf-empty">
                <Icon name="filter" size={24} />
                <p style={{ margin: '4px 0 2px', fontWeight: 600, color: 'var(--ghf-fg)' }}>No saved presets</p>
                <p style={{ margin: 0, fontSize: '11.5px' }}>Configure filters and save them here for quick reuse.</p>
              </div>
            )}
          </div>
        </div>

        {tab === 'builder' && (
          <footer class="ghf-foot">
            <div class="ghf-tape-box">
              <div class="ghf-tape-head">
                <span class="ghf-tape-label">Live Query</span>
                <button type="button" class="ghf-btn" style={{ height: '20px', padding: '0 6px', fontSize: '10.5px' }} disabled={!parts.length} onClick={copyQuery}>
                  <Icon name={copied ? 'check' : 'copy'} size={11} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div class="ghf-tape-chips">
                {parts.length ? (
                  parts.map((p, i) => {
                    const colon = p.text.indexOf(':');
                    const hasColon = colon !== -1 && p.kind === 'qualifier';
                    return (
                      <span key={`${i}:${p.text}`} class="ghf-tape-chip">
                        {hasColon ? (
                          <>
                            <span class="ghf-tape-chip-key">{p.text.slice(0, colon + 1)}</span>
                            <span>{p.text.slice(colon + 1)}</span>
                          </>
                        ) : <span>{p.text}</span>}
                        <button type="button" class="ghf-tape-chip-x" aria-label={`Remove ${p.text}`} onClick={() => setState(cur => removeQueryPart(cur, p))}>
                          <Icon name="x" size={9} />
                        </button>
                      </span>
                    );
                  })
                ) : <span class="ghf-tape-empty">No active filters</span>}
              </div>
              {hideWords.length > 0 && (
                <div class="ghf-tape-hide">
                  🚫 Hiding: <b>{hideWords.join(', ')}</b>
                </div>
              )}
            </div>

            <div class="ghf-actions">
              <button type="button" class="ghf-btn" disabled={activeCount === 0} onClick={() => setState(emptyState())}>
                Reset
              </button>
              <button type="submit" class="ghf-btn ghf-btn-primary">
                Search <Icon name="arrowRight" size={13} />
              </button>
            </div>
          </footer>
        )}
      </form>
    </dialog>
  );
}

function mount() {
  if (!document.body) return;
  if (!host) {
    host = document.createElement('div');
    host.id = 'ghf-root';
    render(<App />, host);
  }
  if (!host.isConnected) document.body.append(host);
}

export function openPanel() {
  syncLauncher();
  mount();
  panelControl?.toggle(parseUrl(location.search));
}

function updateFabBadge(button: HTMLElement, count: number) {
  let badge = button.querySelector<HTMLElement>('.ghf-fab-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'ghf-fab-badge';
    button.append(badge);
  }
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

export function syncLauncher() {
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  if (!document.body) return;

  const count = countActiveFilters(parseUrl(location.search));
  const existing = document.getElementById(IDS.fab);
  if (existing) {
    if (!existing.isConnected) document.body.append(existing);
    updateFabBadge(existing, count);
    return;
  }

  const button = document.createElement('button');
  button.id = IDS.fab;
  button.type = 'button';
  button.title = NAME;
  button.setAttribute('aria-label', NAME);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', String(document.getElementById(IDS.panel)?.hasAttribute('open') ?? false));
  button.append(iconSvg('filter', 16));

  const text = document.createElement('span');
  text.className = 'ghf-fab-text';
  text.textContent = 'Filter';
  button.append(text);

  const badge = document.createElement('span');
  badge.className = 'ghf-fab-badge';
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
  button.append(badge);

  button.addEventListener('click', openPanel);
  document.body.append(button);
  observeLauncher();
}

let launcherObserved = false;
function observeLauncher() {
  if (launcherObserved) return;
  launcherObserved = true;
  new MutationObserver(() => syncLauncher()).observe(document.documentElement, { childList: true });
}
