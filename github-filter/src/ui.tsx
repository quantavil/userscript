import { render } from 'preact';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  FORK_PRESETS,
  FORKS_MAX,
  IDS,
  isSearchPath,
  KEYWORDS,
  POPULAR_LANGUAGES,
  SORTS,
  STAR_PRESETS,
  STARS_MAX
} from './config';
import { Icon, type IconName } from './icons';
import { syncLauncher } from './launcher';
import {
  buildQuery,
  buildUrl,
  countActiveFilters,
  type DateRange,
  emptyState,
  type FormState,
  type NumberRange,
  parseUrl,
  queryParts,
  ratioToVal,
  removeQueryPart,
  shiftDays,
  stepValue,
  todayLocal,
  tokenize,
  valToRatio
} from './query';
import { addPreset, getPresets, type Preset, removePreset } from './storage';

interface PanelControl {
  toggle(next: FormState): void;
  close(): void;
}

let panelControl: PanelControl | null = null;
let host: HTMLDivElement | null = null;

const setExpanded = (open: boolean) =>
  document.getElementById(IDS.fab)?.setAttribute('aria-expanded', String(open));

const closePanel = () => panelControl?.close();

type CopyState = 'idle' | 'copied' | 'failed';

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

/** Run the search through GitHub's own Turbo router so the page does not reload. */
const search = (state: FormState) => {
  const url = buildUrl(state);
  closePanel();
  const turbo = (window as Window & { Turbo?: { visit?: (url: string) => void } }).Turbo;
  if (typeof turbo?.visit === 'function') turbo.visit(url);
  else location.assign(url);
};

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
          <button
            type="button"
            class="ghf-clear-btn"
            title={`Clear ${label}`}
            aria-label={`Clear ${label}`}
            onClick={() => onChange('')}
          >
            <Icon name="x" size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function SmoothSlider({
  label,
  icon,
  maxCap,
  value,
  presets,
  onChange
}: {
  label: string;
  icon: IconName;
  maxCap: number;
  value: NumberRange;
  presets: readonly number[];
  onChange(val: NumberRange): void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<'min' | 'max' | null>(null);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const [lead, setLead] = useState<'min' | 'max'>('max');

  const loRatio = valToRatio(value.min, maxCap, 'min');
  const hiRatio = valToRatio(value.max, maxCap, 'max');
  const filtered = value.min > 0 || value.max > 0;

  const getRatioFromPointer = (clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const activate = (thumb: 'min' | 'max') => {
    // A ref lets pointermove see the thumb immediately, before React re-renders.
    activeThumbRef.current = thumb;
    setLead(thumb);
    setActiveThumb(thumb);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const ratio = getRatioFromPointer(e.clientX);
    const distToLo = Math.abs(ratio - loRatio);
    const distToHi = Math.abs(ratio - hiRatio);

    const target: 'min' | 'max' =
      distToLo === distToHi ? (ratio < loRatio ? 'min' : 'max') : distToLo < distToHi ? 'min' : 'max';

    activate(target);

    if (target === 'min') {
      const clampedRatio = Math.min(ratio, hiRatio);
      onChange({ min: ratioToVal(clampedRatio, maxCap, 'min'), max: value.max });
    } else {
      const clampedRatio = Math.max(ratio, loRatio);
      onChange({ min: value.min, max: ratioToVal(clampedRatio, maxCap, 'max') });
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: PointerEvent) => {
    const thumb = activeThumbRef.current;
    if (!thumb) return;
    const ratio = getRatioFromPointer(e.clientX);
    if (thumb === 'min') {
      const clampedRatio = Math.min(ratio, hiRatio);
      const newMin = ratioToVal(clampedRatio, maxCap, 'min');
      if (newMin !== value.min) onChange({ min: newMin, max: value.max });
    } else {
      const clampedRatio = Math.max(ratio, loRatio);
      const newMax = ratioToVal(clampedRatio, maxCap, 'max');
      if (newMax !== value.max) onChange({ min: value.min, max: newMax });
    }
  };

  const endDrag = (e: PointerEvent) => {
    if (!activeThumbRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    activeThumbRef.current = null;
    setActiveThumb(null);
  };

  const handleKey = (thumb: 'min' | 'max', e: KeyboardEvent) => {
    const key = e.key;
    if (
      key !== 'ArrowRight' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowDown' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }

    e.preventDefault();
    setLead(thumb);
    const current = thumb === 'min' ? value.min : value.max;
    let next: number;
    if (key === 'Home') next = thumb === 'min' ? 0 : 1;
    else if (key === 'End') next = thumb === 'min' ? maxCap : 0;
    else {
      const direction = key === 'ArrowRight' || key === 'ArrowUp' ? 1 : -1;
      next = stepValue(current, maxCap, thumb, direction);
    }

    if (thumb === 'min') {
      onChange({ min: value.max > 0 ? Math.min(next, value.max) : next, max: value.max });
    } else {
      onChange({ min: value.min, max: next > 0 ? Math.max(next, value.min) : 0 });
    }
  };

  const minText = value.min > 0 ? `${formatCount(value.min)}+` : 'Any';
  const maxText = value.max > 0 ? `Up to ${formatCount(value.max)}` : 'Any';

  return (
    <div class="ghf-slider-row">
      <div class="ghf-slider-header">
        <div class="ghf-slider-title-group">
          <span class="ghf-slider-title"><Icon name={icon} size={13} />{label}</span>
          <div class="ghf-mini-chips">
            {presets.map(p => {
              const active = value.min === p && value.max === 0;
              return (
                <button
                  key={p}
                  type="button"
                  class={`ghf-mini-chip ${active ? 'ghf-mini-chip-active' : ''}`}
                  aria-pressed={active}
                  aria-label={`${label} at least ${formatCount(p)}`}
                  onClick={() => onChange({ min: active ? 0 : p, max: 0 })}
                >
                  {formatCount(p)}+
                </button>
              );
            })}
          </div>
        </div>
        <div class="ghf-slider-readout-group">
          <span class="ghf-readout">{rangeReadout(value)}</span>
          {filtered && (
            <button
              type="button"
              class="ghf-clear-btn"
              title={`Clear ${label}`}
              aria-label={`Clear ${label}`}
              onClick={() => onChange({ min: 0, max: 0 })}
            >
              <Icon name="x" size={11} />
            </button>
          )}
        </div>
      </div>
      <div
        ref={trackRef}
        class="ghf-slider"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div class="ghf-slider-track">
          {filtered && (
            <div
              class="ghf-slider-fill"
              style={{
                left: `${loRatio * 100}%`,
                width: `${Math.max(0, hiRatio - loRatio) * 100}%`
              }}
            />
          )}
        </div>
        <div
          class={`ghf-slider-thumb ${activeThumb === 'min' ? 'ghf-thumb-active' : ''}`}
          style={{ left: `${loRatio * 100}%`, zIndex: lead === 'min' ? 4 : 2 }}
          tabIndex={0}
          role="slider"
          aria-label={`Minimum ${label}`}
          aria-orientation="horizontal"
          aria-valuenow={value.min}
          aria-valuemin={0}
          aria-valuemax={maxCap}
          aria-valuetext={minText}
          onKeyDown={e => handleKey('min', e)}
          onFocus={() => setLead('min')}
        />
        <div
          class={`ghf-slider-thumb ${activeThumb === 'max' ? 'ghf-thumb-active' : ''}`}
          style={{ left: `${hiRatio * 100}%`, zIndex: lead === 'max' ? 4 : 2 }}
          tabIndex={0}
          role="slider"
          aria-label={`Maximum ${label}`}
          aria-orientation="horizontal"
          aria-valuenow={value.max}
          aria-valuemin={0}
          aria-valuemax={maxCap}
          aria-valuetext={maxText}
          onKeyDown={e => handleKey('max', e)}
          onFocus={() => setLead('max')}
        />
      </div>
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
  const today = todayLocal();
  const presets = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '1y', days: 365 }
  ];

  return (
    <div class="ghf-slider-row">
      <div class="ghf-slider-header">
        <div class="ghf-slider-title-group">
          <span class="ghf-slider-title"><Icon name="calendar" size={13} />{label}</span>
          <div class="ghf-mini-chips">
            {presets.map(p => {
              const active = value.to === '' && value.from === shiftDays(today, -p.days);
              return (
                <button
                  key={p.days}
                  type="button"
                  class={`ghf-mini-chip ${active ? 'ghf-mini-chip-active' : ''}`}
                  aria-pressed={active}
                  aria-label={`${label} in the last ${p.days} days`}
                  onClick={() => onChange({ from: shiftDays(today, -p.days), to: '' })}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div class="ghf-slider-readout-group">
          <span class="ghf-readout">{dateReadout(value)}</span>
          {filtered && (
            <button
              type="button"
              class="ghf-clear-btn"
              title={`Clear ${label}`}
              aria-label={`Clear ${label}`}
              onClick={() => onChange({ from: '', to: '' })}
            >
              <Icon name="x" size={11} />
            </button>
          )}
        </div>
      </div>
      <div class="ghf-dates">
        <input
          class="ghf-date"
          type="date"
          value={value.from}
          max={value.to || undefined}
          aria-label={`${label} from`}
          onInput={e => onChange({ ...value, from: e.currentTarget.value })}
        />
        <span class="ghf-date-sep" aria-hidden="true">→</span>
        <input
          class="ghf-date"
          type="date"
          value={value.to}
          min={value.from || undefined}
          aria-label={`${label} to`}
          onInput={e => onChange({ ...value, to: e.currentTarget.value })}
        />
      </div>
    </div>
  );
}

function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  const [state, setState] = useState<FormState>(emptyState);
  const [presets, setPresets] = useState<Preset[]>(getPresets);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');
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
      setError('Add filters first.');
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
    const markResult = (result: 'copied' | 'failed') => {
      setCopyState(result);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopyState('idle'), 1600);
    };
    if (!navigator.clipboard?.writeText) {
      markResult('failed');
      return;
    }
    void navigator.clipboard
      .writeText(text)
      .then(() => markResult('copied'))
      .catch(() => markResult('failed'));
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
        setPresets(getPresets());
        setOpenRequest(r => r + 1);
      },
      close() {
        dialogRef.current?.close();
      }
    };
    return () => {
      panelControl = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!openRequest) return;
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
    setExpanded(true);
    if (window.innerWidth > 767) {
      d.querySelector<HTMLInputElement>('.ghf-input')?.focus();
    }
  }, [openRequest]);

  useLayoutEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const close = () => dialogRef.current?.close();
  const hideWords = tokenize(state.hide).map(w => w.replace(/^-?"|"$/g, ''));

  return (
    <dialog
      id={IDS.panel}
      ref={dialogRef}
      // Light dismiss per modern-web-guidance: closedby="any" with fallback click handler
      {...({ closedby: 'any' } as any)}
      aria-labelledby="ghf-panel-title"
      onClose={() => {
        setExpanded(false);
        setPendingDelete(null);
        setCopyState('idle');
      }}
      onClick={e => {
        const d = dialogRef.current;
        if (!d) return;
        if (e.target === d) {
          const rect = d.getBoundingClientRect();
          const isOutside =
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom;
          if (isOutside) close();
        }
      }}
      onKeyDown={e => {
        if (e.key === 'Escape' && !e.defaultPrevented) close();
      }}
    >
      <form
        class="ghf-form"
        onSubmit={e => {
          e.preventDefault();
          search(state);
        }}
      >
        <header class="ghf-head">
          <div class="ghf-drag-handle" aria-hidden="true" />
          <div class="ghf-titlebar">
            <div class="ghf-brand">
              <span class="ghf-brand-icon"><Icon name="filter" size={14} /></span>
              <h2 id="ghf-panel-title">Filter repositories</h2>
              {activeCount > 0 && (
                <span class="ghf-pill">{activeCount}<span class="ghf-sr-only"> active filters</span></span>
              )}
            </div>
            <button type="button" class="ghf-icon-btn" title="Close" aria-label="Close" onClick={close}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </header>

        <div class="ghf-body">
          <div class="ghf-card">
            <div class="ghf-card-head">
              <h3 class="ghf-card-title"><Icon name="search" size={13} />Keywords</h3>
            </div>
            <div class="ghf-fields">
              {KEYWORDS.map(k => (
                <Field
                  key={k.id}
                  id={k.id}
                  label={k.label}
                  placeholder={k.placeholder}
                  value={state[k.id]}
                  onChange={v => setField(k.id, v)}
                />
              ))}
            </div>
          </div>

          <div class="ghf-card">
            <div class="ghf-card-head">
              <h3 class="ghf-card-title"><Icon name="code" size={13} />Repository & Language</h3>
              <div class="ghf-sort-wrap">
                <select
                  id="ghf-sort"
                  class="ghf-sort-select"
                  aria-label="Sort repositories by"
                  value={state.sort}
                  onChange={e => setField('sort', e.currentTarget.value)}
                >
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <Icon name="chevronDown" size={11} />
              </div>
            </div>
            <div class="ghf-fields">
              <Field
                id="repo"
                label="Target Repository"
                placeholder="e.g. facebook/react"
                value={state.repo}
                onChange={v => setField('repo', v)}
              />
              <div class="ghf-field">
                <Field
                  id="lang"
                  label="Language"
                  placeholder="e.g. python, -html"
                  value={state.lang}
                  onChange={v => setField('lang', v)}
                />
                <div class="ghf-chips">
                  {POPULAR_LANGUAGES.map(lang => {
                    const active = tokenize(state.lang).some(t => t.toLowerCase() === lang.toLowerCase());
                    return (
                      <button
                        key={lang}
                        type="button"
                        class={`ghf-chip ${active ? 'ghf-chip-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => toggleLang(lang)}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div class="ghf-card">
            <div class="ghf-card-head">
              <h3 class="ghf-card-title"><Icon name="star" size={13} />Metrics</h3>
            </div>
            <SmoothSlider
              label="Stars"
              icon="star"
              maxCap={STARS_MAX}
              value={state.stars}
              presets={STAR_PRESETS}
              onChange={v => setField('stars', v)}
            />
            <SmoothSlider
              label="Forks"
              icon="gitFork"
              maxCap={FORKS_MAX}
              value={state.forks}
              presets={FORK_PRESETS}
              onChange={v => setField('forks', v)}
            />
          </div>

          <div class="ghf-card">
            <div class="ghf-card-head">
              <h3 class="ghf-card-title"><Icon name="calendar" size={13} />Activity</h3>
            </div>
            <DatePicker label="Created" value={state.created} onChange={v => setField('created', v)} />
            <DatePicker label="Pushed" value={state.pushed} onChange={v => setField('pushed', v)} />
          </div>

          <div class="ghf-card">
            <div class="ghf-card-head">
              <h3 class="ghf-card-title">
                <Icon name="bookmark" size={13} />
                Presets
                {presets.length > 0 && <span class="ghf-pill">{presets.length}</span>}
              </h3>
            </div>
            {presets.length > 0 && (
              <div class="ghf-preset-chips">
                {presets.map(p => (
                  <div key={p.id} class="ghf-preset-chip-item">
                    <button
                      type="button"
                      class="ghf-preset-apply-btn"
                      title={`Load: ${buildQuery(p.state) || 'All repos'}`}
                      aria-label={`Load preset ${p.name}`}
                      onClick={() => setState(p.state)}
                    >
                      <span class="ghf-preset-chip-name">{p.name}</span>
                    </button>
                    <button
                      type="button"
                      class="ghf-preset-run-btn"
                      title="Run search"
                      aria-label={`Run preset ${p.name}`}
                      onClick={() => search(p.state)}
                    >
                      <Icon name="arrowRight" size={10} />
                    </button>
                    <button
                      type="button"
                      class="ghf-preset-del-btn"
                      title={pendingDelete === p.id ? 'Confirm delete' : 'Delete preset'}
                      aria-label={
                        pendingDelete === p.id
                          ? `Confirm delete preset ${p.name}`
                          : `Delete preset ${p.name}`
                      }
                      onClick={() => {
                        if (pendingDelete === p.id) {
                          setPresets(removePreset(p.id));
                          setPendingDelete(null);
                        } else {
                          setPendingDelete(p.id);
                        }
                      }}
                    >
                      {pendingDelete === p.id ? (
                        <span class="ghf-del-confirm">del?</span>
                      ) : (
                        <Icon name="x" size={10} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div class="ghf-preset-save-row">
              <div class="ghf-input-wrap">
                <input
                  ref={nameRef}
                  class="ghf-input"
                  type="text"
                  placeholder="Save current filters as preset..."
                  maxLength={60}
                  value={name}
                  onInput={e => {
                    setName(e.currentTarget.value);
                    setError('');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      savePreset();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                class="ghf-btn ghf-btn-primary"
                disabled={!parts.length || !name.trim()}
                onClick={savePreset}
              >
                Save
              </button>
            </div>
            {error && <p class="ghf-error-msg" role="alert">{error}</p>}
          </div>
        </div>

        <footer class="ghf-foot">
          <div class="ghf-tape-box">
            <div class="ghf-tape-head">
              <span class="ghf-tape-label">Live Query</span>
              <button
                type="button"
                class="ghf-btn ghf-tape-copy"
                disabled={!parts.length}
                onClick={copyQuery}
              >
                <Icon name={copyState === 'copied' ? 'check' : 'copy'} size={10} />
                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Failed' : 'Copy'}
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
                      <button
                        type="button"
                        class="ghf-tape-chip-x"
                        aria-label={`Remove ${p.text}`}
                        onClick={() => setState(cur => removeQueryPart(cur, p))}
                      >
                        <Icon name="x" size={9} />
                      </button>
                    </span>
                  );
                })
              ) : <span class="ghf-tape-empty">No active filters</span>}
            </div>
            {hideWords.length > 0 && (
              <div class="ghf-tape-hide">
                <Icon name="filter" size={11} />
                <span>Hiding <b>{hideWords.join(', ')}</b></span>
              </div>
            )}
          </div>
          <span class="ghf-sr-only" role="status" aria-live="polite">
            {copyState === 'copied' ? 'Query copied' : copyState === 'failed' ? 'Copy failed' : ''}
          </span>

          <div class="ghf-actions">
            <button type="button" class="ghf-btn" disabled={activeCount === 0} onClick={() => setState(emptyState())}>
              Reset
            </button>
            <button type="submit" class="ghf-btn ghf-btn-primary">
              Search <Icon name="arrowRight" size={12} />
            </button>
          </div>
        </footer>
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
  syncLauncher(openPanel);
  mount();
  const initial = isSearchPath(location.pathname) ? parseUrl(location.search) : emptyState();
  panelControl?.toggle(initial);
}
