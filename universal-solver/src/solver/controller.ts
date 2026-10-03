import { effect, signal, untracked } from '@preact/signals';
import { findBestRule, type LocationLike, type RuleMatch } from '../config/match.ts';
import type { ProviderId, Settings } from '../config/schema.ts';
import type { Store } from '../config/store.ts';
import { clickElement, fillInput, isTextField } from '../dom/fill.ts';
import { onUrlChange, type Watch, watchCaptcha } from '../dom/watch.ts';
import { captureImage } from '../image/capture.ts';
import { isAbort } from '../net/http.ts';
import type { Provider, ProviderConfig } from '../providers/index.ts';
import { buildPrompt, normalizeAnswer } from './answer.ts';
import { explainError, withRetry } from './errors.ts';
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

export interface ControllerDeps {
  store: Store;
  registry: Record<ProviderId, Provider>;
  capture?: typeof captureImage;
  location?: () => LocationLike;
}

export function createController({
  store,
  registry,
  capture = captureImage,
  location: getLoc = () => window.location,
}: ControllerDeps) {
  const status = signal<Status>({ phase: 'idle', text: 'Idle' });
  const match = signal<RuleMatch | null>(null);
  // 5 automatic attempts per minute; manual clicks reset the breaker.
  const guard = new RateGuard(5, 60_000);

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
      if (!guard.allow()) {
        set({ phase: 'paused', text: 'Auto-solve paused (too many attempts). Click Solve' });
        return;
      }
    } else {
      guard.reset();
    }

    const { provider, cfg } = resolveProvider(store.settings.value, registry);
    if (!cfg.apiKey) {
      set({ phase: 'error', text: `Add a ${provider.label} API key`, action: 'settings' });
      return;
    }
    if (!cfg.model) {
      set({ phase: 'error', text: 'Choose a model', action: 'settings' });
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

  function rematch(): void {
    const next = findBestRule(store.sites.value, getLoc());
    match.value = next;
    const active = next?.rule.enabled ? next.rule.captcha : '';
    if (active === watched) return;
    watch?.stop();
    watch = null;
    watched = active;
    abort?.abort();
    if (!active) {
      set({ phase: 'idle', text: 'Idle' });
      return;
    }

    set({ phase: 'idle', text: 'Waiting for captcha…' });
    watch = watchCaptcha(
      () => watched,
      (el) => {
        if (!el) {
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
