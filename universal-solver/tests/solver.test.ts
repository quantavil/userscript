import { afterEach, describe, expect, test } from 'bun:test';
import { createStore, type KV } from '../src/config/store.ts';
import { fillInput } from '../src/dom/fill.ts';
import { fitWithin } from '../src/image/capture.ts';
import { HttpError } from '../src/net/http.ts';
import { createProviders } from '../src/providers/index.ts';
import { createController } from '../src/solver/controller.ts';
import { explainError, withRetry } from '../src/solver/errors.ts';
import { RateGuard } from '../src/solver/guard.ts';

describe('RateGuard', () => {
  test('opens after max attempts in the window, closes again as time passes', () => {
    let t = 0;
    const g = new RateGuard(3, 1000, () => t);
    expect([g.allow(), g.allow(), g.allow(), g.allow()]).toEqual([true, true, true, false]);
    t = 1001;
    expect(g.allow()).toBe(true);
  });
  test('reset clears the breaker', () => {
    const g = new RateGuard(1, 1000, () => 0);
    g.allow();
    expect(g.allow()).toBe(false);
    g.reset();
    expect(g.allow()).toBe(true);
  });
});

describe('withRetry / explainError', () => {
  test('retries 429 and 5xx then succeeds', async () => {
    let n = 0;
    const out = await withRetry(
      async () => {
        if (++n < 3) throw new HttpError('x', n === 1 ? 429 : 503, 1);
        return 'ok';
      },
      { baseMs: 1 },
    );
    expect(out).toBe('ok');
    expect(n).toBe(3);
  });
  test('does not retry auth errors', async () => {
    let n = 0;
    await expect(
      withRetry(async () => {
        n++;
        throw new HttpError('nope', 401);
      }),
    ).rejects.toThrow();
    expect(n).toBe(1);
  });
  test('gives actionable messages, including for retired models', () => {
    expect(explainError(new HttpError('x', 401))).toMatch(/API key/);
    expect(explainError(new HttpError('x', 404))).toMatch(/retired/);
    expect(explainError(new HttpError('x', 429))).toMatch(/Rate limited/);
  });
});

describe('fitWithin', () => {
  test('downscales only', () => {
    expect(fitWithin(2048, 1024, 1024)).toEqual({ width: 1024, height: 512 });
    expect(fitWithin(120, 40, 1024)).toEqual({ width: 120, height: 40 });
  });
});

describe('fillInput', () => {
  test('bypasses a framework-wrapped value setter (React controlled inputs)', () => {
    const input = document.createElement('input');
    let tracked = '';
    // React replaces the instance `value` property to detect programmatic writes and ignore them.
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => tracked,
      set: (v) => {
        tracked = `IGNORED:${v}`;
      },
    });
    let seen = '';
    input.addEventListener('input', () => {
      seen = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.get?.call(input) ?? '';
    });
    fillInput(input, 'AB12');
    expect(tracked).toBe(''); // the wrapper was never hit
    expect(seen).toBe('AB12'); // the real value was set before the event fired
  });
  test('fires bubbling input and change events', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.append(input);
    const events: string[] = [];
    form.addEventListener('input', () => events.push('input'));
    form.addEventListener('change', () => events.push('change'));
    fillInput(input, 'x');
    expect(events).toEqual(['input', 'change']);
  });
});

describe('controller', () => {
  const memoryKV = (): KV => {
    const m = new Map<string, unknown>();
    return {
      get: <T>(k: string, d: T) => (m.has(k) ? (m.get(k) as T) : d),
      set: (k, v) => void m.set(k, v),
      keys: () => [...m.keys()],
    };
  };
  const loc = { hostname: 'example.com', host: 'example.com', pathname: '/login' };

  const controllers: ReturnType<typeof createController>[] = [];
  function setup(replies: (() => Promise<string>)[]) {
    document.body.innerHTML =
      '<img id="cap" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><input id="ans"><button id="go"></button>';
    const store = createStore(memoryKV());
    store.setApiKey('gemini', 'K');
    store.saveSite('example.com', {
      captcha: '#cap',
      input: '#ans',
      submit: '',
      kind: 'text',
      charset: 'alnum',
      caseMode: 'keep',
      minLength: 3,
      maxLength: 0,
      hint: '',
      auto: true,
      enabled: true,
    });
    const registry = createProviders();
    let i = 0;
    registry.gemini = {
      ...registry.gemini,
      complete: () => (replies[i++] ?? (replies.at(-1) as () => Promise<string>))(),
    };
    const ctl = createController({
      store,
      registry,
      location: () => loc,
      capture: async () => ({ mime: 'image/png', base64: 'AAAA', width: 1, height: 1, refetched: false }),
    });
    controllers.push(ctl);
    ctl.rematch();
    return { ctl, store };
  }
  afterEach(() => {
    for (const c of controllers.splice(0)) c.stop(); // stop watchers so they can't fire into later tests
    document.body.innerHTML = '';
  });

  test('solves, fills the input and reports the answer', async () => {
    const { ctl } = setup([async () => 'ab-12']);
    await ctl.solve('manual');
    expect(ctl.status.value.phase).toBe('solved');
    expect((document.querySelector('#ans') as HTMLInputElement).value).toBe('ab12');
  });

  test('a slow stale response can never overwrite a newer one', async () => {
    let releaseSlow: (v: string) => void = () => {};
    const { ctl } = setup([() => new Promise<string>((r) => (releaseSlow = r)), async () => 'FRESH1']);
    const slow = ctl.solve('manual');
    await ctl.solve('manual'); // newer run completes first
    releaseSlow('STALE9'); // older run resolves afterwards
    await slow;
    expect((document.querySelector('#ans') as HTMLInputElement).value).toBe('FRESH1');
    expect(ctl.status.value.answer).toBe('FRESH1');
  });

  test('missing API key yields a settings action, not a request', async () => {
    const { ctl, store } = setup([async () => 'ZZZ']);
    store.setApiKey('gemini', '');
    await ctl.solve('manual');
    expect(ctl.status.value).toMatchObject({ phase: 'error', action: 'settings' });
  });

  test('auto-solve trips the circuit breaker; a manual solve recovers', async () => {
    const { ctl } = setup([async () => 'OKAY1']);
    for (let i = 0; i < 6; i++) await ctl.solve('auto');
    expect(ctl.status.value.phase).toBe('paused');
    await ctl.solve('manual');
    expect(ctl.status.value.phase).toBe('solved');
  });

  test('bad model output surfaces as an error and leaves the field untouched', async () => {
    const { ctl } = setup([async () => 'ab']);
    await ctl.solve('manual');
    expect(ctl.status.value.phase).toBe('error');
    expect((document.querySelector('#ans') as HTMLInputElement).value).toBe('');
  });
});
