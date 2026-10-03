import { afterEach, describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { type SiteRule, SiteRuleSchema } from '../src/config/schema.ts';
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
    store.saveSite('example.com', v.parse(SiteRuleSchema, { captcha: '#cap', input: '#ans' }));
    const registry = createProviders();
    let i = 0;
    const calls: { prompt: string; grid?: number }[] = [];
    registry.gemini = {
      ...registry.gemini,
      complete: (_cfg, input) => {
        calls.push({ prompt: input.prompt });
        return (replies[i++] ?? (replies.at(-1) as () => Promise<string>))();
      },
      transcribe: (cfg, input) => {
        calls.push({ prompt: `audio:${cfg.model}:${input.audio.mime}` });
        return (replies[i++] ?? (replies.at(-1) as () => Promise<string>))();
      },
    };
    const ctl = createController({
      store,
      registry,
      location: () => loc,
      clickDelay: () => 0,
      capture: async (_el, opts) => {
        calls.push({ prompt: '', grid: opts?.grid });
        return { mime: 'image/png', base64: 'AAAA', width: 1, height: 1, refetched: false };
      },
      captureTiles: async (tiles) => {
        calls.push({ prompt: '', grid: -tiles.length }); // negative = composed from tiles
        return { mime: 'image/png', base64: 'AAAA', width: 1, height: 1, refetched: false };
      },
      captureAudio: async () => ({ mime: 'audio/mpeg', base64: 'SUQz', blob: new Blob(['x']) }),
    });
    controllers.push(ctl);
    ctl.rematch();
    return { ctl, store, calls };
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

  describe('image grid', () => {
    function grid(reply: string, rule: Record<string, unknown> = {}) {
      const { ctl, store, calls } = setup([async () => reply]);
      document.body.innerHTML = `<p id="task">Select all images with <b>buses</b></p>
        <img id="cap" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
        <table>${[0, 1, 2].map((r) => `<tr>${[1, 2, 3].map((c) => `<td class="tile" data-n="${r * 3 + c}"></td>`).join('')}</tr>`).join('')}</table>
        <button id="verify"></button>`;
      const clicks: string[] = [];
      document.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        clicks.push(t.dataset.n ?? t.id);
      });
      const events: string[] = [];
      document.querySelector('[data-n="1"]')?.addEventListener('mousedown', () => events.push('mousedown'));
      document.querySelector('[data-n="1"]')?.addEventListener('mouseup', () => events.push('mouseup'));
      store.saveSite('example.com', {
        ...(store.sites.value['example.com'] as SiteRule),
        auto: false,
        kind: 'grid',
        input: '',
        tiles: 'td.tile',
        instruction: '#task',
        submit: '#verify',
        ...rule,
      });
      ctl.rematch();
      return { ctl, clicks, events, calls };
    }

    test('clicks the tiles the model names, in order, then Verify', async () => {
      const { ctl, clicks, events } = grid('{"tiles":[7,1,5]}');
      await ctl.solve('manual');
      expect(clicks).toEqual(['1', '5', '7', 'verify']);
      expect(events).toEqual(['mousedown', 'mouseup']); // a full press, not a bare click()
      expect(ctl.status.value).toMatchObject({ phase: 'solved', answer: 'Tiles 1, 5, 7' });
    });

    test('sends the challenge text in the prompt and numbers the grid on the image', async () => {
      const { ctl, calls } = grid('{"tiles":[]}');
      await ctl.solve('manual');
      expect(calls[0]?.grid).toBe(3);
      expect(calls[1]?.prompt).toContain('Task: Select all images with buses');
      expect(ctl.status.value).toMatchObject({ phase: 'solved', answer: 'No matching tiles' });
    });

    test('auto mode gives up after 3 chained rounds; a manual Solve continues', async () => {
      const { ctl, clicks } = grid('{"tiles":[1]}');
      const img = document.querySelector('#cap') as HTMLImageElement;
      for (let i = 0; i < 4; i++) {
        img.src = `data:image/gif;base64,R0lGODlhAQABAAAAACw=#round${i}`; // each round is a new picture
        await ctl.solve('auto');
      }
      expect(ctl.status.value).toMatchObject({ phase: 'paused' });
      expect(ctl.status.value.text).toMatch(/Gave up after 3 rounds/);
      expect(clicks.filter((c) => c === 'verify')).toHaveLength(3);
      await ctl.solve('manual');
      expect(ctl.status.value.phase).toBe('solved');
    });

    test('an unchanged challenge is not re-solved automatically (our own clicks mutate the DOM)', async () => {
      const { ctl, calls } = grid('{"tiles":[2]}');
      await ctl.solve('auto');
      await ctl.solve('auto');
      expect(calls.filter((c) => c.prompt)).toHaveLength(1);
    });

    test('"click until none left": re-checks replaced tiles until the model finds none, then Verify', async () => {
      const { ctl, store } = setup([
        async () => '{"tiles":[2,4]}',
        async () => '{"tiles":[4]}',
        async () => '{"tiles":[]}',
      ]);
      document.body.innerHTML = `<p id="task">Select all images with cars. Click verify once there are none left.</p>
        <div id="grid">${Array.from({ length: 9 }, (_, i) => `<div class="tile" data-n="${i + 1}"><img src="https://x.test/${i + 1}-0.jpg"></div>`).join('')}</div>
        <button id="verify"></button>`;
      const clicks: string[] = [];
      document.addEventListener('click', (e) => {
        const t = (e.target as HTMLElement).closest('[data-n],#verify') as HTMLElement | null;
        if (!t) return;
        clicks.push(t.dataset.n ?? t.id);
        // A dynamic grid swaps the clicked tile's picture for a new one.
        const img = t.querySelector('img');
        if (img) img.src = img.src.replace(/-(\d+)\.jpg$/, (_, k) => `-${Number(k) + 1}.jpg`);
      });
      store.saveSite('example.com', {
        ...(store.sites.value['example.com'] as SiteRule),
        auto: false,
        kind: 'grid',
        captcha: '#grid img',
        tiles: '.tile',
        instruction: '#task',
        submit: '#verify',
      });
      ctl.rematch();
      await ctl.solve('manual');
      expect(clicks).toEqual(['2', '4', '4', 'verify']);
      expect(ctl.status.value.answer).toBe('Tiles 2, 4 (3 passes)');
    });

    test('a tile count that does not fit the grid is an error, nothing is clicked', async () => {
      const { ctl, clicks } = grid('{"tiles":[1]}', { gridSize: 4 });
      await ctl.solve('manual');
      expect(ctl.status.value.text).toMatch(/Found 9 tiles, expected 16/);
      expect(clicks).toEqual([]);
    });

    test('an out-of-range tile aborts before any click', async () => {
      const { ctl, clicks } = grid('{"tiles":[2,12]}');
      await ctl.solve('manual');
      expect(ctl.status.value.phase).toBe('error');
      expect(clicks).toEqual([]);
    });
  });

  describe('audio mode (user choice)', () => {
    function audio(reply: string) {
      const { ctl, store, calls } = setup([async () => reply]);
      document.body.innerHTML = `<img id="cap" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
        <button id="audio-btn"></button><div id="audio-view"></div><button id="verify"></button>`;
      const clicks: string[] = [];
      document.addEventListener('click', (e) => clicks.push((e.target as HTMLElement).id));
      // Like reCAPTCHA: the audio button swaps the challenge to an <audio> clip and a text box.
      document.querySelector('#audio-btn')?.addEventListener('click', () => {
        (document.querySelector('#audio-view') as HTMLElement).innerHTML =
          '<audio id="audio-source" src="https://x.test/clip.mp3"></audio><input id="audio-response">';
      });
      store.saveSite('example.com', {
        ...(store.sites.value['example.com'] as SiteRule),
        auto: false,
        kind: 'grid',
        input: '',
        solveBy: 'audio',
        audioButton: '#audio-btn',
        audioSource: '#audio-source',
        audioInput: '#audio-response',
        submit: '#verify',
      });
      ctl.rematch();
      return { ctl, store, calls, clicks };
    }

    test('switches to audio, transcribes, types what was heard key by key, then Verify', async () => {
      const { ctl, calls, clicks } = audio('Hello, World.');
      const keys: string[] = [];
      document.addEventListener('keydown', (e) => keys.push(e.key));
      await ctl.solve('manual');
      expect(calls.map((c) => c.prompt)).toEqual(['audio:gemini-3.5-flash-lite:audio/mpeg']); // Gemini hears audio itself
      expect((document.querySelector('#audio-response') as HTMLInputElement).value).toBe('hello world');
      expect(keys.join('')).toBe('hello world');
      expect(clicks).toEqual(['audio-btn', 'audio-response', 'verify']);
      expect(ctl.status.value).toMatchObject({ phase: 'solved', answer: 'hello world' });
    });

    test('uses the provider speech-to-text model when one is set', async () => {
      const { ctl, store, calls } = audio('seven');
      store.patchSettings({ audioModels: { gemini: 'my-stt' } });
      await ctl.solve('manual');
      expect(calls[0]?.prompt).toBe('audio:my-stt:audio/mpeg');
    });
  });

  test('stats count tries and answers per rule and model', async () => {
    const { ctl, store } = setup([async () => 'ab-12', async () => 'x']);
    await ctl.solve('manual');
    await ctl.solve('manual');
    expect(store.stats.value['example.com']?.['gemini-3.5-flash-lite']).toMatchObject({
      tries: 2,
      answered: 1,
      errors: 1,
    });
  });

  test('checkbox: opt-in auto tick once, pass counted when it turns checked, no widget for it', async () => {
    const { ctl, store } = setup([async () => '{"tiles":[]}']);
    document.body.innerHTML = '<span id="anchor" role="checkbox" aria-checked="false"></span>';
    const anchor = document.querySelector('#anchor') as HTMLElement;
    let ticks = 0;
    anchor.addEventListener('click', () => {
      ticks++;
      anchor.setAttribute('aria-checked', 'true');
    });
    store.saveSite('example.com', {
      ...(store.sites.value['example.com'] as SiteRule),
      kind: 'grid',
      captcha: '#grid-img',
      checkbox: '#anchor',
      autoCheckbox: true,
    });
    ctl.rematch();
    await new Promise((r) => setTimeout(r, 300));
    expect(ticks).toBe(1);
    expect(store.stats.value['example.com']?.['gemini-3.5-flash-lite']?.passes).toBe(1);
    expect(ctl.present.value).toBe(false);
  });

  test('checkbox is left alone unless auto-tick is switched on', async () => {
    const { ctl, store } = setup([async () => '{"tiles":[]}']);
    document.body.innerHTML = '<span id="anchor" role="checkbox" aria-checked="false"></span>';
    let ticks = 0;
    document.querySelector('#anchor')?.addEventListener('click', () => ticks++);
    store.saveSite('example.com', {
      ...(store.sites.value['example.com'] as SiteRule),
      kind: 'grid',
      captcha: '#grid-img',
      checkbox: '#anchor',
    });
    ctl.rematch();
    await new Promise((r) => setTimeout(r, 300));
    expect(ticks).toBe(0);
  });

  test('bad model output surfaces as an error and leaves the field untouched', async () => {
    const { ctl } = setup([async () => 'ab']);
    await ctl.solve('manual');
    expect(ctl.status.value.phase).toBe('error');
    expect((document.querySelector('#ans') as HTMLInputElement).value).toBe('');
  });
});
