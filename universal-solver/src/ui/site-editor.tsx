import { useSignal } from '@preact/signals';
import * as v from 'valibot';
import { store } from '../app.ts';
import { parsePattern, scorePattern } from '../config/match.ts';
import { type CaptchaKind, type SiteRuleInput, SiteRuleSchema, type SolveBy } from '../config/schema.ts';
import { pickerView } from '../dom/picker.ts';
import { type PickField, repick } from '../flows/setup.ts';
import { Icon } from './icons.tsx';
import { Modal } from './modal.tsx';
import { type EditorState, editor, settingsTab, toast } from './state.ts';

function matchChip(selector: string | undefined, many = false) {
  if (!selector?.trim()) return null;
  try {
    const n = document.querySelectorAll(selector).length;
    if (many) return <span class={`chip ${n ? 'ok' : 'warn'}`}>{n ? `${n} tiles` : 'not on this page'}</span>;
    if (n === 1) return <span class="chip ok">1 match on this page</span>;
    if (n === 0) return <span class="chip warn">not on this page</span>;
    return <span class="chip warn">{n} matches (first is used)</span>;
  } catch {
    return <span class="chip bad">invalid selector</span>;
  }
}

export function SiteEditorDialog() {
  const state = editor.value;
  const errors = useSignal<Record<string, string>>({});
  const close = () => {
    const back = editor.value?.fromSettings;
    editor.value = null;
    if (back) settingsTab.value = 'sites';
  };
  return (
    <Modal
      open={state !== null && !pickerView.value}
      title={state?.original ? 'Edit site rule' : 'New site rule'}
      onClose={close}
    >
      {state && <EditorBody state={state} errors={errors} close={close} />}
    </Modal>
  );
}

function EditorBody({
  state,
  errors,
  close,
}: {
  state: EditorState;
  errors: { value: Record<string, string> };
  close: () => void;
}) {
  const { rule, pattern } = state;
  const set = (patch: Partial<SiteRuleInput>) => (editor.value = { ...state, rule: { ...rule, ...patch } });
  const setPattern = (p: string) => (editor.value = { ...state, pattern: p });
  const err = (k: string) => errors.value[k] && <p class="err">{errors.value[k]}</p>;

  const patternOk = parsePattern(pattern) !== null;
  const matchesHere = patternOk && scorePattern(pattern, location) !== null;

  const save = () => {
    const parsed = v.safeParse(SiteRuleSchema, rule);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.issues) next[String(issue.path?.[0]?.key ?? '_')] = issue.message;
    }
    if (!patternOk) next.pattern = 'Use a domain such as example.com or *.example.com/login';
    errors.value = next;
    if (!parsed.success || !patternOk) return;
    store.saveSite(pattern.trim(), parsed.output, state.original);
    toast('Saved. Solving now…');
    close();
  };

  const selectorField = (key: PickField, label: string, help?: string) => (
    <div class="field">
      <label for={`ucs-${key}`}>
        {label} {matchChip(rule[key], key === 'tiles')}
      </label>
      <div class="row">
        <input
          id={`ucs-${key}`}
          class="grow mono"
          type="text"
          spellcheck={false}
          value={rule[key] ?? ''}
          onInput={(e) => set({ [key]: e.currentTarget.value })}
        />
        <button type="button" class="btn sm" onClick={() => void repick(key)}>
          <Icon name="target" size={14} /> Pick
        </button>
      </div>
      {help && <p class="hint">{help}</p>}
      {err(key)}
    </div>
  );

  const n = (value: string) => (value === '' ? Number.NaN : Number(value));
  const kind = rule.kind ?? 'text';
  const grid = kind === 'grid';
  const audio = grid && rule.solveBy === 'audio';

  return (
    <div class="body">
      <div class="field">
        <label for="ucs-pattern">Applies to {matchesHere && <span class="chip ok">this page</span>}</label>
        <input
          id="ucs-pattern"
          class="mono"
          type="text"
          spellcheck={false}
          value={pattern}
          onInput={(e) => setPattern(e.currentTarget.value)}
        />
        <div class="chips">
          <button type="button" onClick={() => setPattern(location.hostname)}>
            Whole site
          </button>
          <button type="button" onClick={() => setPattern(`${location.hostname}${location.pathname}`)}>
            This page only
          </button>
          <button type="button" onClick={() => setPattern(`*.${location.hostname.replace(/^www\./, '')}`)}>
            All subdomains
          </button>
        </div>
        {err('pattern')}
      </div>

      <div class="field">
        <label for="ucs-kind">Captcha type</label>
        <select id="ucs-kind" value={kind} onChange={(e) => set({ kind: e.currentTarget.value as CaptchaKind })}>
          <option value="text">Distorted text</option>
          <option value="math">Arithmetic (3 + 4)</option>
          <option value="grid">Image grid (click the matching tiles)</option>
        </select>
      </div>

      {grid ? (
        <>
          <div class="field">
            <label for="ucs-solveby">Solve by</label>
            <select
              id="ucs-solveby"
              value={audio ? 'audio' : 'image'}
              onChange={(e) => set({ solveBy: e.currentTarget.value as SolveBy })}
            >
              <option value="image">Pictures: click the matching tiles</option>
              <option value="audio">Audio: switch to the audio version, transcribe, type</option>
            </select>
            <p class="hint">Your choice per site; the widget has a one-click switch too.</p>
          </div>
          {selectorField('captcha', 'Grid image', 'The picture sent to the model, with tile numbers drawn on.')}
          {selectorField(
            'tiles',
            'Tiles (optional)',
            'Pick one tile; it widens to all of them. Needed for "click until none left" grids. Empty = click by position.',
          )}
          <label class="check">
            <input
              type="checkbox"
              checked={rule.compose ?? false}
              onChange={(e) => set({ compose: e.currentTarget.checked })}
            />
            Each tile is its own picture (build the grid from the tiles, e.g. hCaptcha)
          </label>
          {selectorField('instruction', 'Challenge text', 'The "Select all images with…" text. Or put it in the hint.')}
          {selectorField(
            'submit',
            'Verify / Next button (optional)',
            'Clicked after the tiles or the typed audio answer. Leave empty to press it yourself.',
          )}
          <details open={audio}>
            <summary>Audio version</summary>
            <div class="body" style={{ padding: 0 }}>
              {selectorField('audioButton', 'Audio button', 'Switches the challenge to audio (headphones icon).')}
              {selectorField('audioSource', 'Audio clip', 'The <audio> element or the download link.')}
              {selectorField('audioInput', 'Audio answer box')}
              {selectorField('imageButton', 'Back-to-pictures button (optional)')}
            </div>
          </details>
          <details open={Boolean(rule.autoCheckbox)}>
            <summary>"I'm not a robot" checkbox</summary>
            <div class="body" style={{ padding: 0 }}>
              {selectorField('checkbox', 'Checkbox', 'Used to count passes (it turns green). Lives in its own frame.')}
              <label class="check">
                <input
                  type="checkbox"
                  checked={rule.autoCheckbox ?? false}
                  disabled={!rule.checkbox}
                  onChange={(e) => set({ autoCheckbox: e.currentTarget.checked })}
                />
                Tick it for me
              </label>
              <p class="hint">
                Waits until the checkbox is on screen in a visible tab, pauses 1–2.5 s, then moves to it along a curve
                and presses. The click is still synthetic, so the site may serve more challenges than when you tick it
                yourself.
              </p>
            </div>
          </details>
          <div class="grid2">
            <div class="field">
              <label for="ucs-grid">Tiles per side (0 = auto)</label>
              <input
                id="ucs-grid"
                type="number"
                min={0}
                max={8}
                value={rule.gridSize ?? 0}
                onInput={(e) => set({ gridSize: n(e.currentTarget.value) })}
              />
            </div>
          </div>
          {err('gridSize')}
          <div class="field">
            <label for="ucs-hint">Extra hint for the model</label>
            <input
              id="ucs-hint"
              type="text"
              maxLength={200}
              placeholder="e.g. Count bicycles even when partly hidden"
              value={rule.hint ?? ''}
              onInput={(e) => set({ hint: e.currentTarget.value })}
            />
          </div>
        </>
      ) : (
        <>
          {selectorField('captcha', 'Captcha image')}
          {selectorField('input', 'Answer box')}
          {selectorField(
            'submit',
            'Submit button (optional)',
            'Clicked after a successful fill. Leave empty to submit yourself.',
          )}
        </>
      )}

      <label class="check">
        <input type="checkbox" checked={rule.auto ?? true} onChange={(e) => set({ auto: e.currentTarget.checked })} />
        Solve automatically on this site
      </label>

      {!grid && (
        <details>
          <summary>Advanced: accuracy tuning</summary>
          <div class="body" style={{ padding: 0 }}>
            <div class="grid2">
              <div class="field">
                <label for="ucs-charset">Characters</label>
                <select
                  id="ucs-charset"
                  value={rule.charset ?? 'alnum'}
                  onChange={(e) => set({ charset: e.currentTarget.value as 'alnum' })}
                >
                  <option value="alnum">Letters + digits</option>
                  <option value="alpha">Letters only</option>
                  <option value="digits">Digits only</option>
                  <option value="any">Anything</option>
                </select>
              </div>
              <div class="field">
                <label for="ucs-case">Letter case</label>
                <select
                  id="ucs-case"
                  value={rule.caseMode ?? 'keep'}
                  onChange={(e) => set({ caseMode: e.currentTarget.value as 'keep' })}
                >
                  <option value="keep">As read</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="lower">lowercase</option>
                </select>
              </div>
              <div class="field">
                <label for="ucs-min">Length (min – max, 0 = any)</label>
                <div class="row">
                  <input
                    id="ucs-min"
                    type="number"
                    min={1}
                    max={32}
                    value={rule.minLength ?? 3}
                    onInput={(e) => set({ minLength: n(e.currentTarget.value) })}
                  />
                  <input
                    aria-label="Maximum length"
                    type="number"
                    min={0}
                    max={64}
                    value={rule.maxLength ?? 0}
                    onInput={(e) => set({ maxLength: n(e.currentTarget.value) })}
                  />
                </div>
              </div>
            </div>
            {err('minLength')}
            {err('maxLength')}
            <div class="field">
              <label for="ucs-hint">Extra hint for the model</label>
              <input
                id="ucs-hint"
                type="text"
                maxLength={200}
                placeholder="e.g. Ignore the strike-through line"
                value={rule.hint ?? ''}
                onInput={(e) => set({ hint: e.currentTarget.value })}
              />
            </div>
          </div>
        </details>
      )}

      <div class="footer">
        <button type="button" class="btn" onClick={close}>
          Cancel
        </button>
        <button type="button" class="btn primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
