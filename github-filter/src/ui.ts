import { IDS, QUALIFIERS, SEARCH_PATH, SECTIONS } from './config';
import { el, ICON, svg } from './dom';
import { buildUrl, emptyState, type FormState, parseUrl } from './query';
import { addPreset, getPresets, type Preset, removePreset } from './storage';
import { applyTheme, getTheme, LABEL, nextTheme, THEME_ICON } from './theme';

let panel: HTMLDialogElement | null = null;
const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();

const field = (id: string) => inputs.get(id);
const textOf = (id: string) => field(id)?.value ?? '';

/* ----------------------------- form <-> state ---------------------------- */

function readForm(): FormState {
  const q: Record<string, string> = {};
  for (const f of QUALIFIERS) {
    const value = textOf(f.id).trim();
    if (value) q[f.id] = value;
  }
  return {
    type: textOf('type') || 'repositories',
    sort: textOf('sort'),
    and: textOf('and'),
    or: textOf('or'),
    hide: textOf('hide'),
    q
  };
}

function writeForm(state: FormState) {
  // Field ids match FormState keys, except qualifiers which live under `q`.
  for (const [id, input] of inputs) {
    input.value = id in state ? String(state[id as keyof FormState] ?? '') : (state.q[id] ?? '');
  }
}

const search = (state: FormState) => location.assign(buildUrl(state));

/* -------------------------------- building ------------------------------- */

function buildField(f: (typeof SECTIONS)[number]['fields'][number]) {
  const input =
    f.kind === 'select'
      ? el(
          'select',
          { class: 'ghf-input', id: `ghf-${f.id}` },
          ...f.options.map(o => el('option', { value: o.value }, o.label))
        )
      : el('input', { type: 'text', class: 'ghf-input', id: `ghf-${f.id}`, placeholder: f.placeholder ?? '', autocomplete: 'off', spellcheck: false });

  inputs.set(f.id, input);
  return el(
    'div',
    { class: `ghf-field${f.kind === 'text' && f.full ? ' ghf-wide' : ''}` },
    el('label', { htmlFor: `ghf-${f.id}` }, f.label),
    input
  );
}

function chipsFor(state: FormState): string[] {
  const chips = [state.type];
  if (state.sort) chips.push(`sort:${state.sort}`);
  if (state.and) chips.push(state.and);
  if (state.or) chips.push(`any: ${state.or}`);
  for (const f of QUALIFIERS) if (state.q[f.id]) chips.push(`${f.qualifier}:${state.q[f.id]}`);
  if (state.hide) chips.push(`hide: ${state.hide}`);
  return chips;
}

function renderPresets(list: HTMLElement, presets: Preset[], toBuilder: () => void) {
  if (!presets.length) {
    list.replaceChildren(
      el(
        'li',
        { class: 'ghf-empty' },
        el('strong', {}, 'No presets yet'),
        'Set up a search in the builder, then name and save it here.'
      )
    );
    return;
  }

  list.replaceChildren(
    ...presets.map(preset => {
      const remove = el('button', {
        type: 'button',
        class: 'ghf-icon-btn ghf-danger',
        title: `Delete "${preset.name}"`,
        'aria-label': `Delete preset ${preset.name}`,
        onclick: () => renderPresets(list, removePreset(preset.id), toBuilder)
      });
      remove.append(svg([ICON.trash], 14));

      return el(
        'li',
        { class: 'ghf-preset' },
        el('div', { class: 'ghf-preset-head' }, el('div', { class: 'ghf-preset-name' }, preset.name), remove),
        el('div', { class: 'ghf-chips' }, ...chipsFor(preset.state).map(c => el('span', { class: 'ghf-chip' }, c))),
        el(
          'div',
          { class: 'ghf-preset-actions' },
          el(
            'button',
            { type: 'button', class: 'ghf-btn ghf-primary', onclick: () => search(preset.state) },
            'Search'
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'ghf-btn',
              onclick: () => {
                writeForm(preset.state);
                toBuilder();
              }
            },
            'Edit'
          )
        )
      );
    })
  );
}

function build(): HTMLDialogElement {
  const dialog = el('dialog', { id: IDS.panel, 'aria-label': 'GitHub advanced search' }) as HTMLDialogElement;
  dialog.dataset.theme = getTheme();

  /* header */
  const themeBtn = el('button', { type: 'button', class: 'ghf-icon-btn' });
  const paintTheme = () => {
    const theme = getTheme();
    themeBtn.title = LABEL[theme];
    themeBtn.setAttribute('aria-label', LABEL[theme]);
    themeBtn.replaceChildren(svg([THEME_ICON[theme]], 15));
  };
  themeBtn.onclick = () => {
    applyTheme(nextTheme(getTheme()));
    paintTheme();
  };
  paintTheme();

  const closeBtn = el('button', {
    type: 'button',
    class: 'ghf-icon-btn',
    title: 'Close',
    'aria-label': 'Close',
    onclick: () => dialog.close()
  });
  closeBtn.append(svg([ICON.x], 16));

  const title = el('h2', {}, 'Advanced search');
  title.prepend(svg([ICON.search], 15));

  const tabs = { builder: el('button', { type: 'button' }, 'Builder'), presets: el('button', { type: 'button' }, 'Presets') };
  const panels = { builder: el('div', { role: 'tabpanel' }), presets: el('div', { role: 'tabpanel' }) };

  const showTab = (name: keyof typeof tabs) => {
    for (const key of ['builder', 'presets'] as const) {
      const on = key === name;
      tabs[key].setAttribute('aria-selected', String(on));
      tabs[key].tabIndex = on ? 0 : -1;
      panels[key].hidden = !on;
    }
    footer.hidden = name !== 'builder';
  };

  for (const [name, btn] of Object.entries(tabs)) {
    btn.setAttribute('role', 'tab');
    btn.onclick = () => showTab(name as keyof typeof tabs);
  }

  /* builder */
  for (const section of SECTIONS) {
    panels.builder.append(
      el(
        'fieldset',
        {},
        el('legend', {}, section.title),
        el('div', { class: 'ghf-grid' }, ...section.fields.map(buildField))
      )
    );
  }

  /* presets */
  const nameInput = el('input', {
    type: 'text',
    class: 'ghf-input',
    placeholder: 'Preset name',
    'aria-label': 'Preset name',
    maxLength: 60
  });
  const error = el('p', { class: 'ghf-error', role: 'alert', hidden: true });
  const list = el('ul', { class: 'ghf-presets' });
  const toBuilder = () => showTab('builder');

  const saveBtn = el(
    'button',
    {
      type: 'button',
      class: 'ghf-btn ghf-primary ghf-compact',
      onclick: () => {
        const name = nameInput.value.trim();
        if (!name) {
          // Inline, not window.alert — an alert also steals focus out of the dialog.
          error.textContent = 'Give the preset a name first.';
          error.hidden = false;
          nameInput.setAttribute('aria-invalid', 'true');
          nameInput.focus();
          return;
        }
        error.hidden = true;
        nameInput.removeAttribute('aria-invalid');
        renderPresets(list, addPreset(name, readForm()), toBuilder);
        nameInput.value = '';
      }
    },
    'Save'
  );
  nameInput.oninput = () => {
    error.hidden = true;
    nameInput.removeAttribute('aria-invalid');
  };
  // Otherwise Enter here reaches the form's submit button and runs a search
  // instead of saving — the same trap v7's global Enter handler fell into.
  nameInput.onkeydown = event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    saveBtn.click();
  };

  panels.presets.append(el('div', { class: 'ghf-save' }, nameInput, saveBtn), error, list);

  /* footer */
  const footer = el(
    'footer',
    {},
    el(
      'button',
      {
        type: 'button',
        class: 'ghf-btn',
        onclick: () => writeForm(emptyState())
      },
      'Reset'
    ),
    el('button', { type: 'submit', class: 'ghf-btn ghf-primary' }, 'Search')
  );

  const form = el(
    'form',
    { class: 'ghf-form', method: 'dialog' },
    el(
      'header',
      {},
      el('div', { class: 'ghf-titlebar' }, title, el('nav', {}, themeBtn, closeBtn)),
      el('div', { class: 'ghf-tabs', role: 'tablist', 'aria-label': 'Search panel sections' }, tabs.builder, tabs.presets)
    ),
    el('div', { class: 'ghf-body' }, panels.builder, panels.presets),
    footer
  );

  form.onsubmit = event => {
    event.preventDefault();
    search(readForm());
  };

  dialog.append(form);
  // Clicks that land on the dialog box itself are backdrop clicks; children swallow the rest.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  showTab('builder');
  renderPresets(list, getPresets(), toBuilder);
  document.body.append(dialog);
  return dialog;
}

export function openPanel() {
  // Built on first open rather than on every github.com page load.
  panel ??= build();
  if (panel.open) {
    panel.close();
    return;
  }
  writeForm(parseUrl(location.search));
  // <dialog> gives the focus trap, Escape handling, inert background and top-layer
  // stacking that v7 hand-rolled with a z-index:9999 overlay.
  panel.showModal();
  (field('and') as HTMLInputElement | undefined)?.focus();
}

/**
 * The launcher lives on search pages only. Fixed to the bottom-right corner it lands
 * on top of GitHub's own Copilot button, and there is nothing to build a search from
 * on a settings or PR page anyway — the userscript menu command opens the panel
 * everywhere. Re-checked on Turbo navigation, which has no document load.
 */
export function syncLauncher() {
  const existing = document.getElementById(IDS.fab);
  const isSearchPage = location.pathname === SEARCH_PATH || location.pathname.startsWith('/search/');
  if (!isSearchPage) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const btn = el('button', {
    id: IDS.fab,
    type: 'button',
    title: 'Advanced search',
    'aria-label': 'Open advanced search',
    dataset: { theme: getTheme() },
    onclick: openPanel
  });
  btn.append(svg([ICON.search], 18));
  document.body.append(btn);
}
