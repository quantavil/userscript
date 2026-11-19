import { Fragment, render } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { IDS, KEYWORDS, NAME, QUALIFIERS, type QualifierField, SORTS } from './config';
import { Icon, iconSvg } from './icons';
import {
  buildQuery,
  buildUrl,
  type DateRange,
  emptyState,
  type FormState,
  fromIndex,
  type NumberRange,
  parseUrl,
  queryParts,
  toIndex,
  tokenize
} from './query';
import { addPreset, getPresets, type Preset, removePreset } from './storage';
import { getTheme, LABEL, nextTheme, setTheme as persistTheme, THEME_ICON, type Theme } from './theme';

/* ------------------------------- controller ------------------------------ */

interface PanelControl {
  /** Open with `next`, or close when the panel is already open. */
  toggle(next: FormState): void;
}

let panelControl: PanelControl | null = null;
let host: HTMLDivElement | null = null;

const setExpanded = (open: boolean) =>
  document.getElementById(IDS.fab)?.setAttribute('aria-expanded', String(open));

const search = (state: FormState) => location.assign(buildUrl(state));

/* -------------------------------- building ------------------------------- */

/** Must match the thumb width in the stylesheet: the pointer maths depends on it. */
const THUMB = 14;

type TextQualifier = Extract<QualifierField, { kind: 'text' }>;
type NumberQualifier = Extract<QualifierField, { kind: 'number' }>;
type DateQualifier = Extract<QualifierField, { kind: 'date' }>;

const formatCount = (value: number) => {
  if (value < 1000) return String(value);
  // One decimal is enough at this scale; 1001 reads as "1k", not "1.0k".
  const thousands = Math.round(value / 100) / 10;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
};

function rangeReadout(range: NumberRange): string {
  if (range.min > 0 && range.max > 0) return `${formatCount(range.min)} – ${formatCount(range.max)}`;
  if (range.min > 0) return `${formatCount(range.min)}+`;
  if (range.max > 0) return `Under ${formatCount(range.max)}`;
  return 'Any';
}

function dateReadout(range: DateRange): string {
  if (range.from && range.to) return `${range.from} – ${range.to}`;
  if (range.from) return `From ${range.from}`;
  if (range.to) return `Until ${range.to}`;
  return 'Any';
}

function QualifierToken({ text }: { text: string }) {
  const negated = text.startsWith('-');
  const body = negated ? text.slice(1) : text;
  const colon = body.indexOf(':');

  return (
    <span class="ghf-tok">
      {negated && <span class="ghf-tok-neg">-</span>}
      <span class="ghf-tok-key">{body.slice(0, colon + 1)}</span>
      <span class="ghf-tok-val">{body.slice(colon + 1)}</span>
    </span>
  );
}

interface TextRowProps {
  id: string;
  label: string;
  gutter: string;
  placeholder: string;
  value: string;
  /** Keyword rows are the three headline inputs and get a taller hit area. */
  large?: boolean;
  colon?: boolean;
  onChange(value: string): void;
}

/** One line of the query table: a monospace key gutter, the input, and a clear affordance. */
function QueryRow({ id, label, gutter, placeholder, value, large, colon, onChange }: TextRowProps) {
  const inputId = `ghf-${id}`;

  return (
    <div class={large ? 'ghf-row ghf-row--lg' : 'ghf-row'}>
      <label class="ghf-key" for={inputId} aria-hidden="true">
        {gutter}
        {colon && <span class="ghf-colon">:</span>}
      </label>
      <input
        id={inputId}
        class="ghf-input"
        type="text"
        value={value}
        placeholder={placeholder}
        autocomplete="off"
        spellcheck={false}
        aria-label={label}
        onInput={event => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button type="button" class="ghf-clear" aria-label={`Clear ${label}`} onClick={() => onChange('')}>
          <Icon name="x" size={12} />
        </button>
      ) : null}
    </div>
  );
}

function TextRow({ field, value, onChange }: { field: TextQualifier; value: string; onChange(value: string): void }) {
  return (
    <QueryRow
      id={field.id}
      label={field.label}
      gutter={field.qualifier}
      colon
      placeholder={field.placeholder}
      value={value}
      onChange={onChange}
    />
  );
}

/**
 * Two thumbs over one track. The inputs are stacked transparent ranges with
 * `pointer-events` only on the thumbs, so each thumb stays grabbable while the
 * container handles a bare track press. `lead` decides which input wins when the
 * thumbs meet, which is the only state a plain range pair cannot express.
 */
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
  // Index 0 would mean "at most nothing", so the upper thumb starts at the first real stop.
  const setHi = (index: number) =>
    onChange({ min: value.min, max: fromIndex(stops, Math.max(index, lo, 1), 'max') });

  const jump = (event: PointerEvent) => {
    if (event.target !== event.currentTarget) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const usable = Math.max(rect.width - THUMB, 1);
    const ratio = Math.min(Math.max((event.clientX - rect.left - THUMB / 2) / usable, 0), 1);
    const index = Math.round(ratio * last);
    if (Math.abs(index - lo) <= Math.abs(index - hi)) setLo(index);
    else setHi(index);
  };

  return (
    <div class="ghf-row ghf-row--stack">
      <span class="ghf-key" aria-hidden="true">
        {field.qualifier}
      </span>
      <div class="ghf-row-head">
        <output class="ghf-value">{rangeReadout(value)}</output>
        {filtered && (
          <button
            type="button"
            class="ghf-clear"
            aria-label={`Clear ${field.label}`}
            onClick={() => onChange({ min: 0, max: 0 })}
          >
            <Icon name="x" size={12} />
          </button>
        )}
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
          onPointerDown={() => setLead('max')}
          onInput={event => {
            setLead('max');
            setHi(Number(event.currentTarget.value));
          }}
        />
      </div>
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

  return (
    <div class="ghf-row ghf-row--stack">
      <span class="ghf-key" aria-hidden="true">
        {field.qualifier}
      </span>
      <div class="ghf-row-head">
        <output class="ghf-value">{dateReadout(value)}</output>
        {filtered && (
          <button
            type="button"
            class="ghf-clear"
            aria-label={`Clear ${field.label}`}
            onClick={() => onChange({ from: '', to: '' })}
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      <div class="ghf-dates">
        <input
          class="ghf-date"
          type="date"
          value={value.from}
          max={value.to || undefined}
          aria-label={`${field.label} on or after`}
          onInput={event => onChange({ ...value, from: event.currentTarget.value })}
        />
        <span class="ghf-dash" aria-hidden="true">
          →
        </span>
        <input
          class="ghf-date"
          type="date"
          value={value.to}
          min={value.from || undefined}
          aria-label={`${field.label} on or before`}
          onInput={event => onChange({ ...value, to: event.currentTarget.value })}
        />
      </div>
    </div>
  );
}

function PresetRow({
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
  const summary = buildQuery(preset.state) || 'All repositories';

  return (
    <li class="ghf-preset">
      <button
        type="button"
        class="ghf-preset-main"
        onClick={onLoad}
        aria-label={`Load ${preset.name} into the builder`}
        title={`Load ${preset.name} into the builder`}
      >
        <span class="ghf-preset-name">{preset.name}</span>
        <span class="ghf-preset-query">{summary}</span>
      </button>
      <div class="ghf-preset-side">
        <button type="button" class="ghf-run" onClick={onRun} title={`Run ${preset.name}`}>
          Run
          <Icon name="arrowRight" size={12} />
        </button>
        <button
          type="button"
          class={pending ? 'ghf-icon-btn ghf-danger ghf-confirm' : 'ghf-icon-btn ghf-danger'}
          aria-label={pending ? `Confirm delete ${preset.name}` : `Delete ${preset.name}`}
          title={pending ? 'Click again to delete' : 'Delete preset'}
          onClick={onDelete}
        >
          {pending ? 'Delete?' : <Icon name="trash" size={13} />}
        </button>
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

  /* -------------------------------- state -------------------------------- */

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState(current => ({ ...current, [key]: value }));

  const reset = () => {
    setState(emptyState());
    setError('');
  };

  const loadPreset = (preset: Preset) => {
    setState(preset.state);
    setTab('builder');
    requestAnimationFrame(() => document.getElementById('ghf-and')?.focus());
  };

  const savePreset = () => {
    if (!parts.length) {
      setError('Add a term or filter to save.');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the preset a name first.');
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
      .catch(() => {
        /* Clipboard blocked — the query is still selectable in the tape. */
      });
  };

  const cycleTheme = () => {
    const next = nextTheme(theme);
    setTheme(next);
    persistTheme(next);
  };

  /* ------------------------------- effects ------------------------------- */

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

  // The request counter changes after the state above is committed, so the
  // dialog opens on the new content instead of flashing the previous search.
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

  /* -------------------------------- markup ------------------------------- */

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
            <h2 id="ghf-panel-title">
              <Icon name="filter" size={15} />
              {NAME}
            </h2>
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

          <div class="ghf-tabs" role="tablist" aria-label="Search panel sections" onKeyDown={tabKeyDown}>
            <button
              type="button"
              role="tab"
              id="ghf-tab-builder"
              aria-selected={tab === 'builder'}
              aria-controls="ghf-panel-builder"
              tabIndex={tab === 'builder' ? 0 : -1}
              onClick={() => setTab('builder')}
            >
              Builder
            </button>
            <button
              type="button"
              role="tab"
              id="ghf-tab-presets"
              aria-selected={tab === 'presets'}
              aria-controls="ghf-panel-presets"
              tabIndex={tab === 'presets' ? 0 : -1}
              onClick={() => setTab('presets')}
            >
              Presets
              {presets.length > 0 && <span class="ghf-count">{presets.length}</span>}
            </button>
          </div>
        </header>

        <div class="ghf-body" ref={bodyRef}>
          <div id="ghf-panel-builder" role="tabpanel" aria-labelledby="ghf-tab-builder" hidden={tab !== 'builder'}>
            <section class="ghf-sec">
              <div class="ghf-sec-head">
                <h3 class="ghf-sec-title">Terms</h3>
              </div>
              <div class="ghf-rows">
                {KEYWORDS.map(field => (
                  <QueryRow
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    gutter={field.key}
                    placeholder={field.placeholder}
                    value={state[field.id]}
                    large
                    onChange={value => setField(field.id, value)}
                  />
                ))}
              </div>
              <p class="ghf-hint">
                Commas or spaces separate values · <code>-</code> excludes · quotes keep phrases
              </p>
            </section>

            <section class="ghf-sec">
              <div class="ghf-sec-head">
                <h3 class="ghf-sec-title">Filters</h3>
                <div class="ghf-sort">
                  <span class="ghf-sort-label" aria-hidden="true">
                    Sort
                  </span>
                  <select value={state.sort} aria-label="Sort results" onChange={event => setField('sort', event.currentTarget.value)}>
                    {SORTS.map(sort => (
                      <option key={sort.value} value={sort.value}>
                        {sort.label}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={12} />
                </div>
              </div>

              <div class="ghf-rows">
                {QUALIFIERS.map(field => {
                  if (field.kind === 'number') {
                    return (
                      <RangeRow
                        key={field.id}
                        field={field}
                        value={state[field.id]}
                        onChange={next => setField(field.id, next)}
                      />
                    );
                  }
                  if (field.kind === 'date') {
                    return (
                      <DateRow
                        key={field.id}
                        field={field}
                        value={state[field.id]}
                        onChange={next => setField(field.id, next)}
                      />
                    );
                  }
                  return (
                    <TextRow
                      key={field.id}
                      field={field}
                      value={state[field.id]}
                      onChange={next => setField(field.id, next)}
                    />
                  );
                })}
              </div>
            </section>
          </div>

          <div id="ghf-panel-presets" role="tabpanel" aria-labelledby="ghf-tab-presets" hidden={tab !== 'presets'}>
            <section class="ghf-sec">
              <div class="ghf-save">
                <input
                  ref={nameRef}
                  class="ghf-name"
                  type="text"
                  placeholder="Name this search"
                  aria-label="Preset name"
                  maxLength={60}
                  value={name}
                  aria-invalid={error ? 'true' : undefined}
                  onInput={event => {
                    setName(event.currentTarget.value);
                    setError('');
                  }}
                  onKeyDown={event => {
                    // Otherwise Enter reaches the form's submit button and searches.
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      savePreset();
                    }
                  }}
                />
                <button
                  type="button"
                  class="ghf-btn ghf-primary ghf-compact"
                  disabled={!parts.length || !name.trim()}
                  onClick={savePreset}
                >
                  Save
                </button>
              </div>
              <p class="ghf-error" role="alert">
                {error}
              </p>

              {presets.length ? (
                <ul class="ghf-presets">
                  {presets.map(preset => (
                    <PresetRow
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
                <div class="ghf-empty">
                  <Icon name="filter" size={20} />
                  <p class="ghf-empty-title">No saved searches yet</p>
                  <p>Build a query, then name it above. A preset keeps its terms, filters and local hide list.</p>
                  <button type="button" class="ghf-btn ghf-compact" onClick={() => setTab('builder')}>
                    Open the builder
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {tab === 'builder' && (
          <footer class="ghf-foot">
            <div class="ghf-tape">
              <div class="ghf-tape-head">
                <span class="ghf-tape-label">Query</span>
                <button type="button" class="ghf-copy" disabled={!parts.length} onClick={copyQuery} aria-live="polite">
                  <Icon name={copied ? 'check' : 'copy'} size={12} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p class="ghf-tape-body">
                {parts.length ? (
                  parts.map((part, index) => (
                    <Fragment key={`${index}:${part.text}`}>
                      {index > 0 ? ' ' : null}
                      {part.kind === 'qualifier' ? <QualifierToken text={part.text} /> : <span class="ghf-tok">{part.text}</span>}
                    </Fragment>
                  ))
                ) : (
                  <span class="ghf-tape-empty">Nothing yet — add a term or a filter.</span>
                )}
              </p>
              {hideWords.length > 0 && (
                <p class="ghf-tape-hide">
                  Hiding results with <b>{hideWords.join(' · ')}</b>
                </p>
              )}
            </div>

            <div class="ghf-actions">
              <button type="button" class="ghf-btn" onClick={reset}>
                Reset
              </button>
              <button type="submit" class="ghf-btn ghf-primary" title="Search GitHub (Enter)">
                Search
                <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </footer>
        )}
      </form>
    </dialog>
  );
}

/* ------------------------------- mounting -------------------------------- */

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

/**
 * The launcher lives on all GitHub pages. Fixed to the bottom-right corner with high z-index
 * and safe-area spacing. Re-checked on Turbo navigation, which has no document load, and
 * re-inserted if Turbo swapped the body out from under it.
 */
export function syncLauncher() {
  // Never mount inside iframes (embeds, previews) — the top frame owns the launcher.
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  if (!document.body) return;

  const existing = document.getElementById(IDS.fab);
  if (existing) {
    if (existing.isConnected) return;
    document.body.append(existing);
    return;
  }

  const button = document.createElement('button');
  button.id = IDS.fab;
  button.type = 'button';
  button.title = NAME;
  button.setAttribute('aria-label', NAME);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', String(dialogRefOpen()));
  button.dataset.theme = getTheme();
  button.append(iconSvg('filter', 18));

  const label = document.createElement('span');
  label.className = 'ghf-fab-label';
  label.textContent = NAME;
  button.append(label);

  button.addEventListener('click', openPanel);
  document.body.append(button);
  observeLauncher();
}

const dialogRefOpen = () => document.getElementById(IDS.panel)?.hasAttribute('open') ?? false;

let launcherObserved = false;
/** Re-run the presence check when Turbo swaps <head>/<body>, catching the gap
 *  between a navigation event firing and the new body landing. */
function observeLauncher() {
  if (launcherObserved) return;
  launcherObserved = true;
  new MutationObserver(() => syncLauncher()).observe(document.documentElement, { childList: true });
}
