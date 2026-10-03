import { effect, signal, untracked } from '@preact/signals';
import { findBestRule, type LocationLike, type RuleMatch } from '../config/match.ts';
import type { ProviderId, Settings, SiteRule } from '../config/schema.ts';
import type { Store } from '../config/store.ts';
import { pageElementAt, pointIn, simulateClick } from '../dom/click.ts';
import { clickElement, fillInput, isTextField } from '../dom/fill.ts';
import { onUrlChange, type Watch, watchCaptcha } from '../dom/watch.ts';
import { captureImage } from '../image/capture.ts';
import { isAbort } from '../net/http.ts';
import type { Provider, ProviderConfig } from '../providers/index.ts';
import { buildPrompt, normalizeAnswer } from './answer.ts';
import { explainError, sleep, withRetry } from './errors.ts';
import { buildGridPrompt, parseGridAnswer, resolveGridSize } from './grid.ts';
import { RateGuard } from './guard.ts';

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
const textOf = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export function createController({
  store,
  registry,
  capture = captureImage,
  location: getLoc = () => window.location,
  clickDelay = humanDelay,
  now = Date.now,
}: ControllerDeps) {
  const status = signal<Status>({ phase: 'idle', text: 'Idle' });
  const match = signal<RuleMatch | null>(null);
  /** Whether the captcha element is currently on the page. */
  const present = signal(false);
  // 5 automatic attempts per minute; manual clicks reset the breaker.
  const guard = new RateGuard(5, 60_000);

  let rounds = 0;
  let lastRound = 0;
  let runId = 0;
  let abort: AbortController | null = null;
  let watch: Watch | null = null;
  let watched = '';

  const set = (s: Status) => {
    status.value = s;
  };

  async function solve(trigger: 'auto' | 'manual'): Promise<void> {
    const current = match.value;
    if (!current?.rule.enabled) return;
    const { rule } = current;

    if (trigger === 'auto') {
      if (rule.kind === 'grid') {
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

    const { provider, cfg } = resolveProvider(store.settings.value, registry);
    const problem = configProblem(provider, cfg);
    if (problem) {
      set({ phase: 'error', text: problem, action: 'settings' });
      return;
    }

    abort?.abort();
    const ac = new AbortController();
    abort = ac;
    const id = ++runId;
    const started = performance.now();
    set({ phase: 'solving', text: 'Solving…' });

    try {
      const el = document.querySelector(rule.captcha);
      if (!el) {
        set({ phase: 'missing', text: 'Captcha not found on this page' });
        return;
      }

      if (rule.kind === 'grid') {
        await solveGrid(rule, el, provider, cfg, ac.signal, () => id === runId, started);
        return;
      }

      const image = await capture(el, { signal: ac.signal });
      const raw = await withRetry(
        () => provider.complete(cfg, { image, prompt: buildPrompt(rule), signal: ac.signal }),
        { signal: ac.signal },
      );
      if (id !== runId) return; // a newer run superseded this one

      const answer = normalizeAnswer(raw, rule);
      const input = document.querySelector(rule.input);
      if (!isTextField(input)) throw new Error('Answer field not found');
      fillInput(input, answer);
      if (rule.submit) setTimeout(() => clickElement(rule.submit), 80);

      set({
        phase: 'solved',
        text: answer,
        answer,
        ms: Math.round(performance.now() - started),
        warning: image.refetched ? 'Image was re-downloaded; it may differ from the one shown' : undefined,
      });
    } catch (e) {
      if (isAbort(e) || id !== runId) return;
      console.warn('[ucs]', e);
      set({ phase: 'error', text: explainError(e) });
    }
  }

  /**
   * Image-grid flow: send the whole grid (tiles numbered on it) with the challenge text, get back
   * {"tiles":[...]}, then click each tile with a short human-like pause and press Verify.
   */
  async function solveGrid(
    rule: SiteRule,
    el: Element,
    provider: Provider,
    cfg: ProviderConfig,
    signal: AbortSignal,
    current: () => boolean,
    started: number,
  ): Promise<void> {
    const tiles = rule.tiles ? [...document.querySelectorAll(rule.tiles)] : [];
    const size = resolveGridSize(rule.gridSize, tiles.length);
    const total = size * size;
    if (rule.tiles && tiles.length !== total) {
      throw new Error(`Found ${tiles.length} tiles, expected ${total} (${size}x${size}). Check the tiles selector`);
    }
    const instruction = rule.instruction ? textOf(document.querySelector(rule.instruction)) : '';
    if (!instruction && !rule.hint) throw new Error('No challenge text: set the instruction selector or a hint');

    const image = await capture(el, { signal, grid: size });
    const raw = await withRetry(
      () => provider.complete(cfg, { image, prompt: buildGridPrompt(size, instruction, rule.hint), signal }),
      { signal },
    );
    if (!current()) return;
    const picks = parseGridAnswer(raw, total);

    // Without a tiles selector, click the centre of each cell over the captcha image.
    const cell = (n: number) => {
      const r = el.getBoundingClientRect();
      const w = r.width / size;
      const h = r.height / size;
      return { left: r.left + ((n - 1) % size) * w, top: r.top + Math.floor((n - 1) / size) * h, width: w, height: h };
    };
    for (const [i, n] of picks.entries()) {
      if (i > 0) await sleep(clickDelay(), signal);
      if (!current()) return;
      const tile = tiles[n - 1];
      if (tile) {
        simulateClick(tile);
      } else {
        const at = pointIn(cell(n));
        const target = pageElementAt(at);
        if (!target) throw new Error(`Nothing clickable at tile ${n}`);
        simulateClick(target, at);
      }
    }
    if (rule.submit) {
      await sleep(clickDelay() + 200, signal);
      if (!current()) return;
      const button = document.querySelector(rule.submit);
      if (button) simulateClick(button);
    }

    const answer = picks.length ? `Tiles ${picks.join(', ')}` : 'No matching tiles';
    set({
      phase: 'solved',
      text: answer,
      answer,
      ms: Math.round(performance.now() - started),
      warning: image.refetched ? 'Image was re-downloaded; it may differ from the one shown' : undefined,
    });
  }

  function rematch(): void {
    const next = findBestRule(store.sites.value, getLoc());
    match.value = next;
    const active = next?.rule.enabled ? next.rule.captcha : '';
    if (active === watched) return;
    watch?.stop();
    watch = null;
    watched = active;
    present.value = false;
    rounds = 0;
    abort?.abort();
    if (!active) {
      set({ phase: 'idle', text: 'Idle' });
      return;
    }

    set({ phase: 'idle', text: 'Waiting for captcha…' });
    watch = watchCaptcha(
      () => watched,
      (el) => {
        present.value = Boolean(el);
        if (!el) {
          rounds = 0;
          set({ phase: 'idle', text: 'Waiting for captcha…' });
          return;
        }
        if (match.value?.rule.auto && store.settings.value.autoSolve) void solve('auto');
      },
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
      abort?.abort();
    },
  };
}
export type Controller = ReturnType<typeof createController>;
