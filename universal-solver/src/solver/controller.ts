import { effect, signal, untracked } from '@preact/signals';
import { findBestRule, type LocationLike, type RuleMatch } from '../config/match.ts';
import type { ProviderId, Settings, SiteRule } from '../config/schema.ts';
import type { Store } from '../config/store.ts';
import { humanClick, pause, whenOnScreen } from '../dom/click.ts';
import { clickElement, fillInput, isTextField } from '../dom/fill.ts';
import { tileSignature } from '../dom/tiles.ts';
import { elementSignature, onUrlChange, type Watch, watchCaptcha } from '../dom/watch.ts';
import { captureAudio, captureImage, captureTiles } from '../image/capture.ts';
import { isAbort } from '../net/http.ts';
import type { Provider, ProviderConfig } from '../providers/index.ts';
import { buildPrompt, normalizeAnswer } from './answer.ts';
import { explainError, withRetry } from './errors.ts';
import { RateGuard } from './guard.ts';
import { audioUrl, type RunContext, type RunResult, runAudio, runGrid, switchToImages } from './runs.ts';

export type Phase = 'idle' | 'solving' | 'solved' | 'error' | 'missing' | 'paused';
export interface Status {
  phase: Phase;
  text: string;
  answer?: string;
  ms?: number;
  /** Set when the pixels were re-downloaded and may differ from what the user sees. */
  warning?: string;
  /** Hint to the UI about a one-click fix. */
  action?: 'settings';
}

export function resolveProvider(
  settings: Settings,
  registry: Record<ProviderId, Provider>,
  id: ProviderId = settings.provider,
): { provider: Provider; cfg: ProviderConfig } {
  const provider = registry[id];
  return {
    provider,
    cfg: {
      apiKey: settings.keys[id] ?? '',
      model: settings.models[id] || provider.defaultModel,
      baseUrl: id === 'openai' ? settings.openaiBaseUrl : provider.defaultBaseUrl,
    },
  };
}

/** Same provider and key, but the speech-to-text model (falls back to the vision model, e.g. Gemini). */
export function resolveAudio(
  settings: Settings,
  registry: Record<ProviderId, Provider>,
): { provider: Provider; cfg: ProviderConfig } {
  const { provider, cfg } = resolveProvider(settings, registry);
  return {
    provider,
    cfg: { ...cfg, model: settings.audioModels[provider.id] || provider.defaultAudioModel || cfg.model },
  };
}

/** What's missing before a request can be made, or null. */
export function configProblem(provider: Provider, cfg: ProviderConfig): string | null {
  if (!cfg.baseUrl) return 'Enter the endpoint URL';
  if (!cfg.apiKey && !provider.keyOptional) return `Add a ${provider.label} API key`;
  if (!cfg.model) return 'Choose a model';
  return null;
}

export interface ControllerDeps {
  store: Store;
  registry: Record<ProviderId, Provider>;
  capture?: typeof captureImage;
  captureTiles?: typeof captureTiles;
  captureAudio?: typeof captureAudio;
  location?: () => LocationLike;
  /** Pause between synthetic tile clicks; randomised so it doesn't look scripted. */
  clickDelay?: () => number;
  now?: () => number;
}

/** Grid challenges chain rounds ("Next", or a fresh grid after a miss). Give up after this many. */
export const MAX_GRID_ROUNDS = 3;
/** A round starting longer than this after the previous one is a new challenge, not a follow-up. */
const ROUND_GAP_MS = 30_000;

const humanDelay = () => 180 + Math.random() * 220;
const isGrid = (rule: SiteRule) => rule.kind === 'grid';
const isChecked = (el: Element) =>
  el.getAttribute('aria-checked') === 'true' || (el instanceof HTMLInputElement && el.checked);

/** What the watcher looks for: the grid, or (in audio mode) the audio version of the challenge too. */
const watchSelector = (rule: SiteRule) =>
  isGrid(rule) && rule.solveBy === 'audio' && rule.audioSource ? `${rule.captcha}, ${rule.audioSource}` : rule.captcha;

/** Fingerprint of the whole challenge; a new one means a new round worth solving. */
function challengeSignature(rule: SiteRule): string {
  const parts: string[] = [];
  const el = document.querySelector(rule.captcha);
  if (el) parts.push(elementSignature(el));
  if (rule.tiles) for (const t of document.querySelectorAll(rule.tiles)) parts.push(tileSignature(t));
  if (rule.solveBy === 'audio' && rule.audioSource) {
    const a = document.querySelector(rule.audioSource);
    if (a) parts.push(audioUrl(a));
  }
  return parts.join('#');
}

export function createController({
  store,
  registry,
  capture = captureImage,
  captureTiles: composeTiles = captureTiles,
  captureAudio: fetchAudio = captureAudio,
  location: getLoc = () => window.location,
  clickDelay = humanDelay,
  now = Date.now,
}: ControllerDeps) {
  const status = signal<Status>({ phase: 'idle', text: 'Idle' });
  const match = signal<RuleMatch | null>(null);
  /** Whether the captcha (or its audio version) is currently on the page. */
  const present = signal(false);
  // 5 automatic attempts per minute; manual clicks reset the breaker.
  const guard = new RateGuard(5, 60_000);

  let rounds = 0;
  let lastRound = 0;
  let runId = 0;
  let busy = false;
  /** Challenge fingerprint after the last grid run: our own clicks must not trigger another. */
  let lastSolved = '';
  let abort: AbortController | null = null;
  let watch: Watch | null = null;
  let boxWatch: Watch | null = null;
  let boxObserver: MutationObserver | null = null;
  let boxAbort: AbortController | null = null;
  let watched = '';

  const set = (s: Status) => {
    status.value = s;
  };

  /** Model name stats are filed under: the one that answers in this rule's mode. */
  const statModel = (rule: SiteRule) => {
    const s = store.settings.value;
    return (isGrid(rule) && rule.solveBy === 'audio' ? resolveAudio(s, registry) : resolveProvider(s, registry)).cfg
      .model;
  };

  async function solve(trigger: 'auto' | 'manual'): Promise<void> {
    const current = match.value;
    if (!current?.rule.enabled) return;
    const { rule, pattern } = current;
    const grid = isGrid(rule);

    if (trigger === 'auto') {
      if (grid) {
        // Mutations from our own clicks (selection marks, swapped tiles) are not a new challenge.
        if (busy) return;
        const sig = challengeSignature(rule);
        if (sig && sig === lastSolved) return;
        const t = now();
        if (t - lastRound > ROUND_GAP_MS) rounds = 0;
        lastRound = t;
        if (++rounds > MAX_GRID_ROUNDS) {
          set({ phase: 'paused', text: `Gave up after ${MAX_GRID_ROUNDS} rounds. Finish by hand or click Solve` });
          return;
        }
      }
      if (!guard.allow()) {
        set({ phase: 'paused', text: 'Auto-solve paused (too many attempts). Click Solve' });
        return;
      }
    } else {
      guard.reset();
      rounds = 0;
    }

    const audio = grid && rule.solveBy === 'audio';
    const { provider, cfg } = (audio ? resolveAudio : resolveProvider)(store.settings.value, registry);
    const problem = configProblem(provider, cfg);
    if (problem) {
      set({ phase: 'error', text: audio ? `Audio: ${problem.toLowerCase()}` : problem, action: 'settings' });
      return;
    }

    abort?.abort();
    const ac = new AbortController();
    abort = ac;
    const id = ++runId;
    const started = performance.now();
    busy = grid;
    set({ phase: 'solving', text: audio ? 'Listening…' : 'Solving…' });
    const stat = (event: 'try' | 'answered' | 'error', ms = 0) => store.recordStat(pattern, cfg.model, event, ms);

    try {
      const ctx: RunContext = {
        rule,
        provider,
        cfg,
        signal: ac.signal,
        current: () => id === runId,
        capture,
        captureTiles: composeTiles,
        captureAudio: fetchAudio,
        clickDelay,
        onRequest: () => stat('try'),
      };
      let result: RunResult;
      if (audio) {
        result = await runAudio(ctx);
      } else {
        let el = document.querySelector(rule.captcha);
        if (!el && grid && rule.imageButton) el = await switchToImages(rule, ac.signal);
        if (!el) {
          set({ phase: 'missing', text: 'Captcha not found on this page' });
          return;
        }
        result = grid ? await runGrid(ctx, el) : await solveText(ctx, el);
      }
      if (id !== runId) return;
      const ms = Math.round(performance.now() - started);
      stat('answered', ms);
      set({ phase: 'solved', text: result.answer, answer: result.answer, ms, warning: result.warning });
    } catch (e) {
      if (isAbort(e) || id !== runId) return;
      console.warn('[ucs]', e);
      stat('error');
      set({ phase: 'error', text: explainError(e) });
    } finally {
      if (id === runId) {
        busy = false;
        if (grid) lastSolved = challengeSignature(rule);
      }
    }
  }

  /** Text and math: read the picture, type the answer, optionally submit. */
  async function solveText(ctx: RunContext, el: Element): Promise<RunResult> {
    const { rule, provider, cfg, signal } = ctx;
    const image = await capture(el, { signal });
    ctx.onRequest();
    const raw = await withRetry(() => provider.complete(cfg, { image, prompt: buildPrompt(rule), signal }), {
      signal,
    });
    if (!ctx.current()) throw new DOMException('Superseded', 'AbortError');
    const answer = normalizeAnswer(raw, rule);
    const input = document.querySelector(rule.input);
    if (!isTextField(input)) throw new Error('Answer field not found');
    fillInput(input, answer);
    if (rule.submit) setTimeout(() => clickElement(rule.submit), 80);
    return {
      answer,
      warning: image.refetched ? 'Image was re-downloaded; it may differ from the one shown' : undefined,
    };
  }

  /**
   * The "I'm not a robot" checkbox (its own frame). Always: count a pass when it turns checked.
   * Opt-in: tick it once per appearance, only after it is on screen in a visible tab, after a
   * human-ish delay, with a curved approach and a real press duration.
   */
  function watchCheckbox(rule: SiteRule, pattern: string): void {
    const ticked = new WeakSet<Element>();
    boxAbort = new AbortController();
    const signal = boxAbort.signal;
    boxWatch = watchCaptcha(
      () => rule.checkbox,
      (el) => {
        boxObserver?.disconnect();
        if (!el) return;
        let was = isChecked(el);
        boxObserver = new MutationObserver(() => {
          const now = isChecked(el);
          if (now && !was) store.recordStat(pattern, statModel(rule), 'pass');
          was = now;
        });
        boxObserver.observe(el, { attributes: true, attributeFilter: ['aria-checked', 'checked', 'class'] });

        const wanted = rule.autoCheckbox && rule.auto && store.settings.value.autoSolve;
        if (!wanted || was || ticked.has(el)) return;
        ticked.add(el);
        void (async () => {
          await whenOnScreen(el, signal);
          await pause(900, 2600, signal);
          if (!el.isConnected || isChecked(el)) return;
          await humanClick(el, { signal });
        })().catch((e) => {
          if (!isAbort(e)) console.warn('[ucs] checkbox', e);
        });
      },
    );
  }

  function stopCheckbox(): void {
    boxAbort?.abort();
    boxWatch?.stop();
    boxObserver?.disconnect();
    boxWatch = null;
    boxObserver = null;
  }

  function rematch(): void {
    const next = findBestRule(store.sites.value, getLoc());
    match.value = next;
    const rule = next?.rule.enabled ? next.rule : null;
    // Watchers close over the rule, so any edit to it restarts them.
    const active = rule ? JSON.stringify([next?.pattern, rule]) : '';
    if (active === watched) return;
    watch?.stop();
    watch = null;
    stopCheckbox();
    watched = active;
    present.value = false;
    rounds = 0;
    lastSolved = '';
    abort?.abort();
    if (!rule || !next) {
      set({ phase: 'idle', text: 'Idle' });
      return;
    }

    if (rule.checkbox) watchCheckbox(rule, next.pattern);
    set({ phase: 'idle', text: 'Waiting for captcha…' });
    watch = watchCaptcha(
      () => watchSelector(rule),
      (el) => {
        present.value = Boolean(el);
        if (!el) {
          rounds = 0;
          set({ phase: 'idle', text: 'Waiting for captcha…' });
          return;
        }
        if (match.value?.rule.auto && store.settings.value.autoSolve) void solve('auto');
      },
      120,
      isGrid(rule) ? () => challengeSignature(rule) : undefined,
    );
  }

  const disposers: (() => void)[] = [];
  return {
    status,
    match,
    present,
    solve,
    rematch,
    start() {
      disposers.push(
        effect(() => {
          store.sites.value; // subscribe: rules edited in the UI apply live, no reload
          untracked(rematch); // rematch writes signals; keep those out of this effect's deps
        }),
        onUrlChange(rematch),
      );
    },
    stop() {
      for (const d of disposers.splice(0)) d();
      watch?.stop();
      stopCheckbox();
      abort?.abort();
    },
  };
}
export type Controller = ReturnType<typeof createController>;
