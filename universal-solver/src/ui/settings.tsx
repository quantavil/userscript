import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { controller, providers, store } from '../app.ts';
import { PROVIDER_IDS, type ProviderId } from '../config/schema.ts';
import { exportSites, importSites, pickJsonFile } from '../flows/data.ts';
import { configureCurrentPage } from '../flows/setup.ts';
import { resolveProvider } from '../solver/controller.ts';
import { explainError } from '../solver/errors.ts';
import { testProvider } from '../solver/selftest.ts';
import { Icon } from './icons.tsx';
import { Modal } from './modal.tsx';
import { editor, settingsTab, type Tab, toast } from './state.ts';

const TABS: [Tab, string][] = [
  ['provider', 'AI provider'],
  ['sites', 'Sites'],
  ['data', 'Backup'],
];

export function SettingsDialog() {
  const tab = settingsTab.value;
  return (
    <Modal open={tab !== null && !editor.value} title="Captcha Solver" onClose={() => (settingsTab.value = null)}>
      <div class="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            class="tab"
            aria-selected={tab === id}
            onClick={() => (settingsTab.value = id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div class="body">
        {tab === 'provider' && <ProviderTab />}
        {tab === 'sites' && <SitesTab />}
        {tab === 'data' && <DataTab />}
      </div>
    </Modal>
  );
}

function ProviderTab() {
  const settings = store.settings.value;
  const id = settings.provider;
  const provider = providers[id];
  const { cfg } = resolveProvider(settings, providers);
  const models = useSignal<string[]>([...provider.suggestedModels]);
  const busy = useSignal<'' | 'models' | 'test'>('');
  const result = useSignal<{ ok: boolean; text: string } | null>(null);
  const reveal = useSignal(false);

  useEffect(() => {
    models.value = [...provider.suggestedModels];
    result.value = null;
  }, [id]);

  const refreshModels = async () => {
    busy.value = 'models';
    try {
      const list = await provider.listModels(cfg);
      models.value = list.length ? list : [...provider.suggestedModels];
      toast(`${list.length} models available`);
    } catch (e) {
      toast(explainError(e), 'error');
    } finally {
      busy.value = '';
    }
  };

  const runTest = async () => {
    busy.value = 'test';
    result.value = null;
    result.value = await testProvider(provider, cfg);
    busy.value = '';
  };

  return (
    <>
      <fieldset class="seg" aria-label="Provider">
        {PROVIDER_IDS.map((p: ProviderId) => (
          <button key={p} type="button" aria-pressed={p === id} onClick={() => store.patchSettings({ provider: p })}>
            {providers[p].label}
          </button>
        ))}
      </fieldset>

      {id === 'openai' && (
        <div class="field">
          <label for="ucs-base">Base URL</label>
          <input
            id="ucs-base"
            type="url"
            class="mono"
            value={settings.openaiBaseUrl}
            onInput={(e) => store.patchSettings({ openaiBaseUrl: e.currentTarget.value.trim() })}
          />
          <p class="hint">
            Any OpenAI-compatible endpoint: OpenRouter, OpenAI, Ollama (http://localhost:11434/v1), LM Studio…
          </p>
        </div>
      )}

      <div class="field">
        <label for="ucs-key">API key</label>
        <div class="row">
          <input
            id="ucs-key"
            class="grow mono"
            type={(reveal.value ? 'text' : 'password') as 'text'}
            autocomplete="off"
            spellcheck={false}
            value={cfg.apiKey}
            placeholder="Paste your key"
            onInput={(e) => store.setApiKey(id, e.currentTarget.value)}
          />
          <button type="button" class="btn sm" onClick={() => (reveal.value = !reveal.value)}>
            {reveal.value ? 'Hide' : 'Show'}
          </button>
        </div>
        <p class="hint">
          <a href={provider.keyHelpUrl} target="_blank" rel="noreferrer noopener">
            Get a {provider.label} key
          </a>
          . Stored by your userscript manager; sent only to the provider.
        </p>
      </div>

      <div class="field">
        <label for="ucs-model">Model</label>
        <div class="row">
          <input
            id="ucs-model"
            class="grow mono"
            type="text"
            list="ucs-models"
            autocomplete="off"
            spellcheck={false}
            value={cfg.model}
            placeholder={provider.defaultModel || 'model id'}
            onInput={(e) => store.setModel(id, e.currentTarget.value)}
          />
          <datalist id="ucs-models">
            {models.value.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <button
            type="button"
            class="btn sm"
            disabled={!cfg.apiKey || busy.value !== ''}
            onClick={() => void refreshModels()}
          >
            {busy.value === 'models' ? '…' : 'Fetch list'}
          </button>
        </div>
        <p class="hint">
          Providers retire models often. If solving starts failing with “model not found”, fetch the list and pick a
          current vision model.
        </p>
      </div>

      <div class="row">
        <button type="button" class="btn primary" disabled={busy.value !== ''} onClick={() => void runTest()}>
          {busy.value === 'test' ? 'Testing…' : 'Test with a sample captcha'}
        </button>
      </div>
      {result.value && (
        <div class={`result ${result.value.ok ? 'ok' : 'bad'}`} role="status">
          {result.value.text}
        </div>
      )}

      <label class="check">
        <input
          type="checkbox"
          checked={settings.autoSolve}
          onChange={(e) => store.patchSettings({ autoSolve: e.currentTarget.checked })}
        />
        Auto-solve when a captcha appears or refreshes
      </label>
    </>
  );
}

function SitesTab() {
  const sites = Object.entries(store.sites.value);
  const here = controller.match.value?.pattern;

  const remove = (pattern: string) => {
    const rule = store.sites.value[pattern];
    store.removeSite(pattern);
    if (rule) toast(`Removed ${pattern}`, 'ok', { label: 'Undo', run: () => store.saveSite(pattern, rule) });
  };

  return (
    <>
      <div class="row">
        <button type="button" class="btn primary" onClick={() => void configureCurrentPage()}>
          <Icon name="target" /> Configure this page
        </button>
        <button
          type="button"
          class="btn"
          onClick={() =>
            (editor.value = { pattern: location.hostname, rule: { captcha: '', input: '' }, fromSettings: true })
          }
        >
          <Icon name="plus" /> Add manually
        </button>
      </div>
      <p class="hint">
        Note: Currently solves text and math captchas only (images, canvas, SVG). Puzzle, slider, and
        Turnstile/reCAPTCHA challenges are not supported.
      </p>
      {sites.length === 0 ? (
        <p class="empty">
          No sites yet. Open a page with a text captcha and choose “Configure this page”; it takes two clicks.
        </p>
      ) : (
        sites.map(([pattern, rule]) => (
          <div key={pattern} class={`site${rule.enabled ? '' : ' off'}`}>
            <div class="pat">
              {pattern} {pattern === here && <span class="chip ok">active here</span>}
            </div>
            <div class="sel">
              {rule.captcha} → {rule.input}
            </div>
            <div class="acts">
              <input
                type="checkbox"
                aria-label={`Enable ${pattern}`}
                checked={rule.enabled}
                onChange={(e) => store.saveSite(pattern, { ...rule, enabled: e.currentTarget.checked })}
              />
              <button
                type="button"
                class="icon"
                aria-label={`Edit ${pattern}`}
                onClick={() => (editor.value = { original: pattern, pattern, rule, fromSettings: true })}
              >
                <Icon name="pencil" />
              </button>
              <button type="button" class="icon" aria-label={`Remove ${pattern}`} onClick={() => remove(pattern)}>
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function DataTab() {
  const doImport = async () => {
    const text = await pickJsonFile();
    if (text === null) return;
    try {
      toast(`Imported ${importSites(store, text)} rule(s)`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <>
      <p class="hint">Back up or share your site rules. API keys are never included in exports.</p>
      <div class="row">
        <button type="button" class="btn" onClick={() => exportSites(store)}>
          Export rules
        </button>
        <button type="button" class="btn" onClick={() => void doImport()}>
          Import rules
        </button>
      </div>
      <p class="hint">
        Shortcuts: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> solve now · <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>{' '}
        configure this page.
      </p>
    </>
  );
}
