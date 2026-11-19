import { render } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  IDS,
  KEYWORDS,
  NAME,
  POPULAR_LANGUAGES,
  QUALIFIERS,
  type QualifierField,
  SHORTCUT_LABEL,
  SORTS,
  STAR_PRESETS
} from './config';
import { Icon, iconSvg } from './icons';
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
  type QueryPart,
  queryParts,
  removeQueryPart,
  shiftDays,
  toIndex,
  tokenize
} from './query';
import { addPreset, getPresets, type Preset, removePreset } from './storage';
import { getTheme, LABEL, nextTheme, setTheme as persistTheme, THEME_ICON, type Theme } from './theme';

interface PanelControl {
  toggle(next: FormState): void;
}

let panelControl: PanelControl | null = null;
let host: HTMLDivElement | null = null;

const setExpanded = (open: boolean) =>
  document.getElementById(IDS.fab)?.setAttribute('aria-expanded', String(open));

const search = (state: FormState) => location.assign(buildUrl(state));

const THUMB = 16;

type NumberQualifier = Extract<QualifierField, { kind: 'number' }>;
type DateQualifier = Extract<QualifierField, { kind: 'date' }>;

const formatCount = (value: number) => {
  if (value < 1000) return String(value);
  const thousands = Math.round(value / 100) / 10;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
};

function rangeReadout(range: NumberRange): string {
  if (range.min > 0 && range.max > 0) return `${formatCount(range.min)} – ${formatCount(range.max)}`;
  if (range.min > 0) return `${formatCount(range.min)}+`;
  if (range.max > 0) return `≤ ${formatCount(range.max)}`;
  return 'Any';
}

function dateReadout(range: DateRange): string {
  if (range.from && range.to) {
    return range.from === range.to ? range.from : `${range.from} – ${range.to}`;
  }
  if (range.from) return `From ${range.from}`;
  if (range.to) return `Until ${range.to}`;
  return 'Any time';
}

interface KeywordRowProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
}

function KeywordRow({ id, label, placeholder, value, onChange }: KeywordRowProps) {
  const inputId = `ghf-${id}`;

  return (
    <div class="ghf-field">
      <label class="ghf-label" for={inputId}>
        {label}
      </label>
      <div class="ghf-input-wrap">
        <input
          id={inputId}
          class="ghf-input"
          type="text"
          value={value}
          placeholder={placeholder}
          autocomplete="off"
          spellcheck={false}
          onInput={event => onChange(event.currentTarget.value)}
        />
        {value ? (
          <button type="button" class="ghf-clear-btn" aria-label={`Clear ${label}`} onClick={() => onChange('')}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LanguageRow({
  value,
  onChange
}: {
  value: string;
  onChange(val: string): void;
}) {
  const currentTokens = tokenize(value);

  const toggleLang = (langName: string) => {
    const exists = currentTokens.some(t => t.toLowerCase() === langName.toLowerCase());
    const nextTokens = exists
      ? currentTokens.filter(t => t.toLowerCase() !== langName.toLowerCase())
      : [...currentTokens, langName];
    onChange(nextTokens.join(', '));
  };

  return (
    <div class="ghf-field">
      <div class="ghf-field-label-row">
        <label class="ghf-label" for="ghf-lang">
          Language
        </label>
        {value && (
          <button type="button" class="ghf-clear-btn" aria-label="Clear language" onClick={() => onChange('')}>
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
      <div class="ghf-input-wrap">
        <input
          id="ghf-lang"
          class="ghf-input"
          type="text"
          value={value}
          placeholder="e.g. python, -html"
          autocomplete="off"
          spellcheck={false}
          onInput={event => onChange(event.currentTarget.value)}
        />
      </div>
      <div class="ghf-chips">
        {POPULAR_LANGUAGES.map(lang => {
          const active = currentTokens.some(t => t.toLowerCase() === lang.toLowerCase());
          return (
            <button
              key={lang}
              type="button"
              class={active ? 'ghf-chip ghf-chip-active' : 'ghf-chip'}
              onClick={() => toggleLang(lang)}
            >
              {lang}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RepoRow({
  value,
  onChange
}: {
  value: string;
  onChange(val: string): void;
}) {
  return (
    <div class="ghf-field">
      <label class="ghf-label" for="ghf-repo">
        Target Repository
      </label>
      <div class="ghf-input-wrap">
        <input
          id="ghf-repo"
          class="ghf-input"
          type="text"
          value={value}
          placeholder="e.g. facebook/react"
          autocomplete="off"
          spellcheck={false}
          onInput={event => onChange(event.currentTarget.value)}
        />
        {value ? (
          <button type="button" class="ghf-clear-btn" aria-label="Clear repo" onClick={() => onChange('')}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RangeRow({
  field,
  value,
  onChange
}: {
  field: NumberQualifier;
  value: NumberRange;
  onChange(next: NumberRange): void;
}) {
  const { stops } = field;
  const last = stops.length - 1;
  const [lead, setLead] = useState<'min' | 'max'>('max');

  const lo = value.min > 0 ? toIndex(stops, value.min, 'min') : 0;
  const hi = value.max > 0 ? toIndex(stops, value.max, 'max') : last;
  const filtered = value.min > 0 || value.max > 0;

  const setLo = (index: number) =>
    onChange({ min: fromIndex(stops, Math.min(index, hi), 'min'), max: value.max });
  const setHi = (index: number) =>
    onChange({ min: value.min, max: fromIndex(stops, Math.max(index, lo, 1), 'max') });

  const jump = (event: PointerEvent) => {
    if (event.target !== event.currentTarget) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const usable = Math.max(rect.width - THUMB, 1);
    const ratio = Math.min(Math.max((event.clientX - rect.left - THUMB / 2) / usable, 0), 1);
    const index = Math.round(ratio * last);
    if (index < lo) {
      setLead('min');
      setLo(index);
    } else if (index > hi) {
      setLead('max');
      setHi(index);
    } else if (index - lo < hi - index) {
      setLead('min');
      setLo(index);
    } else {
      setLead('max');
      setHi(index);
    }
  };

  return (
    <div class="ghf-slider-row">
      <div class="ghf-slider-header">
        <span class="ghf-slider-title">
          <Icon name={field.id === 'stars' ? 'star' : 'gitFork'} size={14} />
          {field.label}
        </span>
        <div class="ghf-field-label-row">
          <span class="ghf-readout-badge">{rangeReadout(value)}</span>
          {filtered && (
            <button
              type="button"
              class="ghf-clear-btn"
              aria-label={`Clear ${field.label}`}
              onClick={() => onChange({ min: 0, max: 0 })}
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>

      <div class="ghf-slider" onPointerDown={jump}>
        <div class="ghf-slider-track">
          {filtered && (
            <div
              class="ghf-slider-fill"
              style={{ left: `${(lo / last) * 100}%`, right: `${(1 - hi / last) * 100}%` }}
            />
          )}
        </div>
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={lo}
          aria-label={`Minimum ${field.label.toLowerCase()}`}
          aria-valuetext={value.min > 0 ? `${formatCount(value.min)} or more` : 'No minimum'}
          style={{ zIndex: lead === 'min' ? 3 : 2 }}
          onFocus={() => setLead('min')}
          onPointerDown={() => setLead('min')}
          onInput={event => {
            setLead('min');
            setLo(Number(event.currentTarget.value));
          }}
        />
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={hi}
          aria-label={`Maximum ${field.label.toLowerCase()}`}
          aria-valuetext={value.max > 0 ? `Up to ${formatCount(value.max)}` : 'No maximum'}
          style={{ zIndex: lead === 'max' ? 3 : 2 }}
          onFocus={() => setLead('max')}
          onPointerDown={() => setLead('max')}
          onInput={event => {
            setLead('max');
            setHi(Number(event.currentTarget.value));
          }}
        />
      </div>

      {field.id === 'stars' && (
        <div class="ghf-chips">
          {STAR_PRESETS.map(preset => {
            const active = value.min === preset && value.max === 0;
            return (
              <button
                key={preset}
                type="button"
                class={active ? 'ghf-chip ghf-chip-active' : 'ghf-chip'}
                onClick={() => onChange({ min: active ? 0 : preset, max: 0 })}
              >
                {formatCount(preset)}+
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateRow({
  field,
  value,
  onChange
}: {
  field: DateQualifier;
  value: DateRange;
  onChange(next: DateRange): void;
}) {
  const filtered = Boolean(value.from || value.to);

  const applyPreset = (days: number) => {
    const today = new Date().toISOString().slice(0, 10);
    onChange({ from: shiftDays(today, -days), to: '' });
  };

  return (
    <div class="ghf-slider-row">
      <div class="ghf-slider-header">
        <span class="ghf-slider-title">
          <Icon name="calendar" size={14} />
          {field.label}
        </span>
        <div class="ghf-field-label-row">
          <span class="ghf-readout-badge">{dateReadout(value)}</span>
          {filtered && (
            <button
              type="button"
              class="ghf-clear-btn"
              aria-label={`Clear ${field.label}`}
              onClick={() => onChange({ from: '', to: '' })}
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      </div>

      <div class="ghf-date-grid">
        <input
          class="ghf-date-input"
          type="date"
          value={value.from}
          max={value.to || undefined}
          aria-label={`${field.label} on or after`}
          onInput={event => onChange({ ...value, from: event.currentTarget.value })}
        />
        <span class="ghf-date-sep" aria-hidden="true">
          →
        </span>
        <input
          class="ghf-date-input"
          type="date"
          value={value.to}
          min={value.from || undefined}
          aria-label={`${field.label} on or before`}
          onInput={event => onChange({ ...value, to: event.currentTarget.value })}
        />
      </div>

      <div class="ghf-chips">
        {[
          { label: 'Past 7 days', days: 7 },
          { label: 'Past 30 days', days: 30 },
          { label: 'Past year', days: 365 }
        ].map(p => (
          <button key={p.days} type="button" class="ghf-chip" onClick={() => applyPreset(p.days)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  pending,
  onLoad,
  onRun,
  onDelete
}: {
  preset: Preset;
  pending: boolean;
  onLoad(): void;
  onRun(): void;
  onDelete(): void;
}) {
  const parts = queryParts(preset.state);
  const summary = buildQuery(preset.state) || 'All repositories';

  return (
    <li class="ghf-preset-card">
      <div class="ghf-preset-top">
        <span class="ghf-preset-name">{preset.name}</span>
        <div class="ghf-preset-actions">
          <button type="button" class="ghf-btn" onClick={onLoad} title="Load into builder">
            Load
          </button>
          <button type="button" class="ghf-btn ghf-btn-primary" onClick={onRun} title="Run search">
            Run
            <Icon name="arrowRight" size={12} />
          </button>
          <button
            type="button"
            class="ghf-icon-btn"
            style={{ color: pending ? 'var(--ghf-danger)' : undefined }}
            title={pending ? 'Click again to confirm delete' : 'Delete preset'}
            onClick={onDelete}
          >
            {pending ? <span style={{ fontSize: '11px', fontWeight: 600 }}>Sure?</span> : <Icon name="trash" size={13} />}
          </button>
        </div>
      </div>
      <div class="ghf-preset-query" title={summary}>
        {parts.length ? (
          parts.map(p => (
            <span key={p.text} class="ghf-tape-chip" style={{ marginRight: '4px' }}>
              {p.text}
            </span>
          ))
        ) : (
          <span>{summary}</span>
        )}
      </div>
    </li>
  );
}

function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  const [state, setState] = useState<FormState>(emptyState);
  const [tab, setTab] = useState<'builder' | 'presets'>('builder');
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [presets, setPresets] = useState<Preset[]>(getPresets);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openRequest, setOpenRequest] = useState(0);

  const parts = useMemo(() => queryParts(state), [state]);
  const activeCount = useMemo(() => countActiveFilters(state), [state]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState(current => ({ ...current, [key]: value }));

  const reset = () => {
    setState(emptyState());
    setError('');
  };

  const handleRemovePart = (part: QueryPart) => {
    setState(current => removeQueryPart(current, part));
  };

  const loadPreset = (preset: Preset) => {
    setState(preset.state);
    setTab('builder');
  };

  const savePreset = () => {
    if (!parts.length) {
      setError('Add at least one search term or filter to save.');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please give this preset a name.');
      nameRef.current?.focus();
      return;
    }
    setPresets(addPreset(trimmed, state));
    setName('');
    setError('');
  };

  const deletePreset = (id: string) => {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      return;
    }
    setPresets(removePreset(id));
    setPendingDelete(null);
  };

  const copyQuery = () => {
    const text = buildQuery(state);
    if (!text) return;
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  };

  const cycleTheme = () => {
    const next = nextTheme(theme);
    setTheme(next);
    persistTheme(next);
  };

  useLayoutEffect(() => {
    panelControl = {
      toggle(next) {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (dialog.open) {
          dialog.close();
          return;
        }
        setState(next);
        setTab('builder');
        setPresets(getPresets());
        setOpenRequest(request => request + 1);
      }
    };
    return () => {
      panelControl = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!openRequest) return;
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setExpanded(true);
    dialog.querySelector<HTMLInputElement>('.ghf-input')?.focus();
  }, [openRequest]);

  useEffect(() => {
    dialogRef.current?.setAttribute('data-theme', theme);
    document.getElementById(IDS.fab)?.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    setPendingDelete(null);
  }, [tab]);

  useEffect(() => {
    setPendingDelete(null);
  }, [presets.length]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const close = () => dialogRef.current?.close();

  const tabKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = tab === 'builder' ? 'presets' : 'builder';
    setTab(next);
    document.getElementById(`ghf-tab-${next}`)?.focus();
  };

  const hideWords = tokenize(state.hide).map(word => word.replace(/^-?"|"$/g, ''));

  return (
    <dialog
      id={IDS.panel}
      ref={dialogRef}
      aria-labelledby="ghf-panel-title"
      onClose={() => {
        setExpanded(false);
        setPendingDelete(null);
      }}
      onClick={event => {
        if (event.target === dialogRef.current) close();
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') close();
      }}
    >
      <form
        class="ghf-form"
        onSubmit={event => {
          event.preventDefault();
          search(state);
        }}
      >
        <header class="ghf-head">
          <div class="ghf-titlebar">
            <div class="ghf-brand">
              <span class="ghf-brand-icon">
                <Icon name="filter" size={15} />
              </span>
              <h2 id="ghf-panel-title">{NAME}</h2>
              <span class="ghf-badge-shortcut" title="Keyboard shortcut">
                {SHORTCUT_LABEL}
              </span>
            </div>
            <nav>
              <button
                type="button"
                class="ghf-icon-btn"
                title={LABEL[theme]}
                aria-label={LABEL[theme]}
                onClick={cycleTheme}
              >
                <Icon name={THEME_ICON[theme]} size={15} />
              </button>
              <button type="button" class="ghf-icon-btn" title="Close" aria-label="Close" onClick={close}>
                <Icon name="x" size={16} />
              </button>
            </nav>
          </div>

          <div class="ghf-tabs" role="tablist" aria-label="Search sections" onKeyDown={tabKeyDown}>
            <button
              type="button"
              role="tab"
              id="ghf-tab-builder"
              class="ghf-tab-btn"
              aria-selected={tab === 'builder'}
              aria-controls="ghf-panel-builder"
              tabIndex={tab === 'builder' ? 0 : -1}
              onClick={() => setTab('builder')}
            >
              Builder
              {activeCount > 0 && <span class="ghf-pill-badge">{activeCount}</span>}
            </button>
            <button
              type="button"
              role="tab"
              id="ghf-tab-presets"
              class="ghf-tab-btn"
              aria-selected={tab === 'presets'}
              aria-controls="ghf-panel-presets"
              tabIndex={tab === 'presets' ? 0 : -1}
              onClick={() => setTab('presets')}
            >
              Saved Presets
              {presets.length > 0 && <span class="ghf-pill-badge">{presets.length}</span>}
            </button>
          </div>
        </header>

        <div class="ghf-body" ref={bodyRef}>
          <div id="ghf-panel-builder" role="tabpanel" aria-labelledby="ghf-tab-builder" hidden={tab !== 'builder'}>
            {/* Search terms */}
            <div class="ghf-card">
              <div class="ghf-card-head">
                <h3 class="ghf-card-title">
                  <Icon name="search" size={14} />
                  Keywords & Search Terms
                </h3>
              </div>
              <div class="ghf-field-group">
                {KEYWORDS.map(field => (
                  <KeywordRow
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={state[field.id]}
                    onChange={value => setField(field.id, value)}
                  />
                ))}
              </div>
            </div>

            {/* Scope & Language */}
            <div class="ghf-card">
              <div class="ghf-card-head">
                <h3 class="ghf-card-title">
                  <Icon name="code" size={14} />
                  Repository & Language
                </h3>
                <div class="ghf-sort-wrap">
                  <select
                    class="ghf-sort-select"
                    value={state.sort}
                    aria-label="Sort repositories"
                    onChange={event => setField('sort', event.currentTarget.value)}
                  >
                    {SORTS.map(sort => (
                      <option key={sort.value} value={sort.value}>
                        {sort.label}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={12} />
                </div>
              </div>

              <div class="ghf-field-group">
                <RepoRow value={state.repo} onChange={val => setField('repo', val)} />
                <LanguageRow value={state.lang} onChange={val => setField('lang', val)} />
              </div>
            </div>

            {/* Metrics */}
            <div class="ghf-card">
              <div class="ghf-card-head">
                <h3 class="ghf-card-title">
                  <Icon name="star" size={14} />
                  Metrics & Popularity
                </h3>
              </div>
              <div class="ghf-field-group">
                {QUALIFIERS.filter(
                  (f): f is NumberQualifier => f.kind === 'number'
                ).map(field => (
                  <RangeRow
                    key={field.id}
                    field={field}
                    value={state[field.id]}
                    onChange={next => setField(field.id, next)}
                  />
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div class="ghf-card">
              <div class="ghf-card-head">
                <h3 class="ghf-card-title">
                  <Icon name="calendar" size={14} />
                  Activity & Dates
                </h3>
              </div>
              <div class="ghf-field-group">
                {QUALIFIERS.filter(
                  (f): f is DateQualifier => f.kind === 'date'
                ).map(field => (
                  <DateRow
                    key={field.id}
                    field={field}
                    value={state[field.id]}
                    onChange={next => setField(field.id, next)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div id="ghf-panel-presets" role="tabpanel" aria-labelledby="ghf-tab-presets" hidden={tab !== 'presets'}>
            <div class="ghf-card">
              <div class="ghf-card-head">
                <h3 class="ghf-card-title">Save Current Search</h3>
              </div>
              <div class="ghf-save-bar">
                <div class="ghf-input-wrap" style={{ flex: 1 }}>
                  <input
                    ref={nameRef}
                    class="ghf-input"
                    type="text"
                    placeholder="e.g. Active Rust Projects"
                    aria-label="Preset name"
                    maxLength={60}
                    value={name}
                    onInput={event => {
                      setName(event.currentTarget.value);
                      setError('');
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
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
              {error && <p class="ghf-error-msg">{error}</p>}
            </div>

            {presets.length ? (
              <ul class="ghf-preset-list">
                {presets.map(preset => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    pending={pendingDelete === preset.id}
                    onLoad={() => loadPreset(preset)}
                    onRun={() => search(preset.state)}
                    onDelete={() => deletePreset(preset.id)}
                  />
                ))}
              </ul>
            ) : (
              <div class="ghf-empty-presets">
                <Icon name="filter" size={24} />
                <h4 class="ghf-empty-title">No saved presets yet</h4>
                <p class="ghf-empty-text">
                  Configure filters in the Builder tab and name them above to quickly re-run queries later.
                </p>
                <button type="button" class="ghf-btn" onClick={() => setTab('builder')}>
                  Open Builder
                </button>
              </div>
            )}
          </div>
        </div>

        {tab === 'builder' && (
          <footer class="ghf-foot">
            <div class="ghf-tape-card">
              <div class="ghf-tape-head">
                <span class="ghf-tape-title">Live GitHub Query</span>
                <button
                  type="button"
                  class="ghf-copy-btn"
                  disabled={!parts.length}
                  onClick={copyQuery}
                  aria-live="polite"
                >
                  <Icon name={copied ? 'check' : 'copy'} size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div class="ghf-tape-chips">
                {parts.length ? (
                  parts.map((part, index) => {
                    const colonIdx = part.text.indexOf(':');
                    const hasColon = colonIdx !== -1 && part.kind === 'qualifier';
                    return (
                      <span key={`${index}:${part.text}`} class="ghf-tape-chip">
                        {hasColon ? (
                          <>
                            <span class="ghf-tape-chip-key">{part.text.slice(0, colonIdx + 1)}</span>
                            <span>{part.text.slice(colonIdx + 1)}</span>
                          </>
                        ) : (
                          <span>{part.text}</span>
                        )}
                        <button
                          type="button"
                          class="ghf-tape-chip-remove"
                          title={`Remove ${part.text}`}
                          aria-label={`Remove ${part.text}`}
                          onClick={() => handleRemovePart(part)}
                        >
                          <Icon name="x" size={10} />
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span class="ghf-tape-empty">No active filters — add keywords or qualifiers above.</span>
                )}
              </div>
              {hideWords.length > 0 && (
                <div class="ghf-tape-hide">
                  🚫 Hiding results matching: <b>{hideWords.join(', ')}</b>
                </div>
              )}
            </div>

            <div class="ghf-actions-bar">
              <button type="button" class="ghf-btn" disabled={activeCount === 0} onClick={reset}>
                Reset
              </button>
              <button type="submit" class="ghf-btn ghf-btn-primary" title="Search GitHub (Enter)">
                Search GitHub
                <Icon name="arrowRight" size={14} />
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

  const activeCount = countActiveFilters(parseUrl(location.search));
  const existing = document.getElementById(IDS.fab);
  if (existing) {
    if (!existing.isConnected) document.body.append(existing);
    updateFabBadge(existing, activeCount);
    return;
  }

  const button = document.createElement('button');
  button.id = IDS.fab;
  button.type = 'button';
  button.title = `${NAME} (${SHORTCUT_LABEL})`;
  button.setAttribute('aria-label', `${NAME} (${SHORTCUT_LABEL})`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', String(dialogRefOpen()));
  button.dataset.theme = getTheme();
  button.append(iconSvg('filter', 16));

  const text = document.createElement('span');
  text.className = 'ghf-fab-text';
  text.textContent = 'Filter';
  button.append(text);

  const badge = document.createElement('span');
  badge.className = 'ghf-fab-badge';
  badge.textContent = String(activeCount);
  badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
  button.append(badge);

  button.addEventListener('click', openPanel);
  document.body.append(button);
  observeLauncher();
}

const dialogRefOpen = () => document.getElementById(IDS.panel)?.hasAttribute('open') ?? false;

let launcherObserved = false;
function observeLauncher() {
  if (launcherObserved) return;
  launcherObserved = true;
  new MutationObserver(() => syncLauncher()).observe(document.documentElement, { childList: true });
}
