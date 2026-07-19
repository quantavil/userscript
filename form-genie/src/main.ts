/**
 * Form Genie entry point. Wires the scan → describe → match → (AI) → fill
 * pipeline to the panel UI, registers menu commands, and honors per-site
 * enable/disable.
 */
import { scan } from './engine/scan';
import { describe } from './engine/describe';
import { matchAll, THRESHOLD_SUGGEST, FieldMatch } from './engine/match';
import { fillAll, FillResult } from './engine/fill';
import { mapWithAI, AiInput } from './engine/ai';
import { FormGeniePanel, PanelController } from './ui/panel';
import {
  loadProfile, saveProfile, loadSettings, saveSettings, loadRules,
  deleteRule, upsertRule, exportBundle, importBundle,
  isSiteDisabled, toggleSiteDisabled,
} from './profile/store';
import { setDebug, drawOverlay, log } from './debug';

const host = location.hostname;

function boot(): void {
  if (isSiteDisabled(host)) {
    GM_registerMenuCommand('Enable Form Genie on this site', () => {
      toggleSiteDisabled(host);
      location.reload();
    });
    return;
  }

  setDebug(loadSettings().debug);

  let panel: FormGeniePanel;

  const controller: PanelController = {
    host,
    getProfile: () => loadProfile().data,
    saveProfile: (data) => saveProfile(data),
    getSettings: () => loadSettings(),
    saveSettings: (s) => { saveSettings(s); setDebug(s.debug); },
    getRules: () => loadRules(host),
    deleteRule: (fp, occ) => deleteRule(host, fp, occ),
    exportJson: () => exportBundle(false),
    importJson: (json) => importBundle(json),
    runFill: (accepted) => runFill(accepted, (m) => panel.toast(m)),
  };

  panel = new FormGeniePanel(controller);

  GM_registerMenuCommand('Open Form Genie', () => panel.open());
  GM_registerMenuCommand('Disable Form Genie on this site', () => {
    toggleSiteDisabled(host);
    location.reload();
  });
  GM_registerMenuCommand('Toggle debug mode', () => {
    const s = loadSettings();
    s.debug = !s.debug;
    saveSettings(s);
    setDebug(s.debug);
    panel.toast(`Debug ${s.debug ? 'on' : 'off'}`);
  });

  log('Form Genie ready on', host);
}

async function runFill(
  accepted: Set<string> | undefined,
  notify: (msg: string) => void,
): Promise<FillResult[]> {
  const settings = loadSettings();
  setDebug(settings.debug);
  const profile = loadProfile();
  const rules = loadRules(host);

  const units = scan();
  const descriptors = units.map(describe);
  const matches: FieldMatch[] = matchAll(descriptors, rules);

  if (settings.ai.enabled && settings.ai.apiKey) {
    await applyAiTier(matches, settings, notify);
  }

  drawOverlay(matches);
  log('matched', matches.filter((m) => m.key).length, 'of', matches.length, 'fields');

  return fillAll(matches, profile.data, {
    overwrite: settings.overwrite,
    acceptedFingerprints: accepted,
  });
}

/** Ask Gemini to map fields heuristics left uncertain; cache hits as rules. */
async function applyAiTier(
  matches: FieldMatch[],
  settings: ReturnType<typeof loadSettings>,
  notify: (msg: string) => void,
): Promise<void> {
  const inputs: AiInput[] = [];
  matches.forEach((m, index) => {
    if (m.source === 'teach' || m.source === 'ai') return; // already resolved by a rule
    if (m.confidence >= THRESHOLD_SUGGEST && m.key) return;
    inputs.push({
      index,
      descriptorText: m.descriptor.text,
      type: m.descriptor.unit.type,
      options: m.descriptor.options,
    });
  });
  if (!inputs.length) return;

  const res = await mapWithAI(inputs, settings);
  if (!res.ok) {
    notify(`AI: ${res.error}`);
    return;
  }
  for (const [index, key] of res.mapping) {
    const m = matches[index];
    matches[index] = { ...m, key, confidence: 0.8, source: 'ai' };
    upsertRule(host, {
      fingerprint: m.fingerprint,
      occurrence: m.occurrence,
      key,
      source: 'ai',
      ts: Date.now(),
    });
  }
  log('AI mapped', res.mapping.size, 'fields');
}

boot();
