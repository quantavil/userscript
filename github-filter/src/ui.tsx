import { Fragment, render } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FILTER_GROUPS, IDS, KEYWORDS, type QualifierField, SORTS, TYPES } from './config';
import { Icon, iconSvg } from './icons';
import { buildQuery, buildUrl, emptyState, type FormState, parseUrl, queryParts, tokenize } from './query';
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

interface RowProps {
  id: string;
  label: string;
  gutter: string;
  placeholder: string;
  value: string;
  large?: boolean;
  colon?: boolean;
  onChange(value: string): void;
}

/** One line of the query table: a monospace key gutter, the input, and a clear affordance. */
function QueryRow({ id, label, gutter, placeholder, value, large, colon, onChange }: RowProps) {
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

function QualifierRow({ field, value, onChange }: { field: QualifierField; value: string; onChange(value: string): void }) {
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
  const summary =
    buildQuery(preset.state) ||
    `All ${(TYPES.find(type => type.value === preset.state.type)?.label ?? 'results').toLowerCase()}`;

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

  const patch = (change: Partial<FormState>) => setState(current => ({ ...current, ...change }));

  const setQualifier = (id: string, value: string) =>
    setState(current => {
      const q = { ...current.q };
      if (value) q[id] = value;
      else delete q[id];
      return { ...current, q };
    });

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
      setError('Add a term or qualifier to save.');
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
              <Icon name="search" size={15} />
              Advanced search
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
              <fieldset class="ghf-scope">
                <legend class="ghf-sr">Search in</legend>
                {TYPES.map(type => (
                  <button
                    type="button"
                    key={type.value}
                    aria-pressed={state.type === type.value}
                    title={type.label}
                    onClick={() => patch({ type: type.value })}
                  >
                    {type.short}
                  </button>
                ))}
              </fieldset>
            </section>

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
                    onChange={value => patch({ [field.id]: value })}
                  />
                ))}
              </div>
              <p class="ghf-hint">
                Commas or spaces separate values · <code>-</code> excludes · quotes keep phrases
              </p>
            </section>

            <section class="ghf-sec">
              <div class="ghf-sec-head">
                <h3 class="ghf-sec-title">Qualifiers</h3>
                <div class="ghf-sort">
                  <span class="ghf-sort-label" aria-hidden="true">
                    Sort
                  </span>
                  <select value={state.sort} aria-label="Sort results" onChange={event => patch({ sort: event.currentTarget.value })}>
                    {SORTS.map(sort => (
                      <option key={sort.value} value={sort.value}>
                        {sort.label}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={12} />
                </div>
              </div>

              {FILTER_GROUPS.map(group => (
                <div class="ghf-group" key={group.title}>
                  <p class="ghf-group-title">{group.title}</p>
                  <div class="ghf-rows">
                    {group.fields.map(field => (
                      <QualifierRow
                        key={field.id}
                        field={field}
                        value={state.q[field.id] ?? ''}
                        onChange={value => setQualifier(field.id, value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
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
                  <Icon name="search" size={20} />
                  <p class="ghf-empty-title">No saved searches yet</p>
                  <p>
                    Build a query, then name it above. A preset keeps its scope, terms, qualifiers and local hide list.
                  </p>
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
                  <span class="ghf-tape-empty">Nothing yet — add a term or a qualifier.</span>
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
  button.title = 'Advanced search';
  button.setAttribute('aria-label', 'Advanced search');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', String(dialogRefOpen()));
  button.dataset.theme = getTheme();
  button.append(iconSvg('search', 18));

  const label = document.createElement('span');
  label.className = 'ghf-fab-label';
  label.textContent = 'Advanced search';
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
