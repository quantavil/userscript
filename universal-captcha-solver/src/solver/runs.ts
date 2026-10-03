import type { SiteRule } from '../config/schema.ts';
import { humanClick, pageElementAt, pause, pointIn, typeInto, waitFor } from '../dom/click.ts';
import { isTextField } from '../dom/fill.ts';
import { tileOpacity, tileSignature, tilesLoaded } from '../dom/tiles.ts';
import type { captureAudio, captureImage, captureTiles } from '../image/capture.ts';
import type { Provider, ProviderConfig } from '../providers/types.ts';
import { normalizeSpoken } from './audio.ts';
import { withRetry } from './errors.ts';
import { buildGridPrompt, parseGridAnswer, resolveGridSize } from './grid.ts';

/** Everything a grid or audio run needs; built per solve by the controller. */
export interface RunContext {
  rule: SiteRule;
  provider: Provider;
  cfg: ProviderConfig;
  signal: AbortSignal;
  /** False once a newer run superseded this one. */
  current: () => boolean;
  capture: typeof captureImage;
  captureTiles: typeof captureTiles;
  captureAudio: typeof captureAudio;
  /** Pause between tile clicks. */
  clickDelay: () => number;
  /** Called once per model request (stats). */
  onRequest: () => void;
}
export interface RunResult {
  answer: string;
  warning?: string;
}

/** "Click until there are none left" grids. After this many re-checks, press the button anyway. */
export const MAX_DYNAMIC_PASSES = 6;
/** English wording of reCAPTCHA's dynamic grids; only lengthens how long we watch for swaps. */
const DYNAMIC_WORDING = /none left|no more|until there are none/i;

const superseded = () => new DOMException('Superseded', 'AbortError');
const q = (sel: string) => (sel ? document.querySelector(sel) : null);
const textOf = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function pressSubmit(ctx: RunContext): Promise<void> {
  if (!ctx.rule.submit) return;
  await pause(250, 650, ctx.signal);
  if (!ctx.current()) throw superseded();
  const button = q(ctx.rule.submit);
  if (button) await humanClick(button, { signal: ctx.signal });
}

/**
 * After clicking, decides whether the grid is the "replace the tile" kind and, if so, waits for
 * the new pictures. Static grids only add a selection mark, so nothing changes within the window
 * and the answer stands. Dynamic grids fade the clicked tile out and load a new picture into it.
 */
export async function waitForReplacement(
  clicked: Element[],
  before: string[],
  expectDynamic: boolean,
  signal?: AbortSignal,
): Promise<boolean> {
  const changed = (t: Element, i: number) => !t.isConnected || tileSignature(t) !== before[i];
  const started = await waitFor(
    () => clicked.some((t, i) => changed(t, i) || (t.isConnected && tileOpacity(t) < 0.95)),
    expectDynamic ? 3000 : 1200,
    signal,
  );
  if (!started) return false;
  await waitFor(
    () =>
      clicked.every((t, i) => changed(t, i)) &&
      tilesLoaded(clicked.filter((t) => t.isConnected)) &&
      clicked.every((t) => !t.isConnected || tileOpacity(t) >= 0.95),
    9000,
    signal,
  );
  await pause(250, 450, signal);
  return true;
}

/**
 * Image grid: send the numbered grid with the challenge text, click the tiles the model names,
 * re-check replaced tiles until the model finds none, then press the blue button.
 */
export async function runGrid(ctx: RunContext, el: Element): Promise<RunResult> {
  const { rule, provider, cfg, signal } = ctx;
  const check = () => {
    if (!ctx.current()) throw superseded();
  };
  const queryTiles = () => (rule.tiles ? [...document.querySelectorAll(rule.tiles)] : []);

  let tiles = queryTiles();
  const size = resolveGridSize(rule.gridSize, tiles.length);
  const total = size * size;
  if (rule.tiles && tiles.length !== total) {
    throw new Error(`Found ${tiles.length} tiles, expected ${total} (${size}x${size}). Check the tiles selector`);
  }
  if (rule.compose && !tiles.length) throw new Error('Building the picture from tiles needs a tiles selector');
  const instruction = textOf(q(rule.instruction));
  if (!instruction && !rule.hint) throw new Error('No challenge text: set the instruction selector or a hint');
  const prompt = buildGridPrompt(size, instruction, rule.hint);

  const ask = async (image: Awaited<ReturnType<typeof captureTiles>>) => {
    ctx.onRequest();
    const raw = await withRetry(() => provider.complete(cfg, { image, prompt, json: true, signal }), { signal });
    check();
    return parseGridAnswer(raw, total);
  };

  const first = rule.compose
    ? await ctx.captureTiles(tiles, { signal })
    : await ctx.capture(el, { signal, grid: size });
  let picks = await ask(first);

  // Without a tiles selector, click the centre of each cell over the captcha image.
  const cell = (n: number) => {
    const r = el.getBoundingClientRect();
    const w = r.width / size;
    const h = r.height / size;
    return { left: r.left + ((n - 1) % size) * w, top: r.top + Math.floor((n - 1) / size) * h, width: w, height: h };
  };
  const expectDynamic = DYNAMIC_WORDING.test(instruction);
  const clickedAll = new Set<number>();
  let passes = 0;

  await pause(300, 800, signal); // a person looks before clicking
  for (;;) {
    passes++;
    const before = picks.map((n) => (tiles[n - 1] ? tileSignature(tiles[n - 1] as Element) : ''));
    for (const [i, n] of picks.entries()) {
      if (i > 0) await pause(ctx.clickDelay(), ctx.clickDelay() * 1.4, signal);
      check();
      const tile = tiles[n - 1];
      if (tile) {
        await humanClick(tile, { signal });
      } else {
        const at = pointIn(cell(n));
        const target = pageElementAt(at);
        if (!target) throw new Error(`Nothing clickable at tile ${n}`);
        await humanClick(target, { at, signal });
      }
      clickedAll.add(n);
    }
    // Replacement detection needs real tile elements; by-position grids are treated as static.
    if (!picks.length || !tiles.length || passes >= MAX_DYNAMIC_PASSES) break;
    const clicked = picks.map((n) => tiles[n - 1] as Element);
    if (!(await waitForReplacement(clicked, before, expectDynamic, signal))) break;
    check();
    tiles = queryTiles();
    if (tiles.length !== total) break;
    picks = await ask(await ctx.captureTiles(tiles, { signal }));
  }

  await pressSubmit(ctx);
  const list = [...clickedAll].sort((a, b) => a - b);
  const answer = list.length ? `Tiles ${list.join(', ')}` : 'No matching tiles';
  return {
    answer: passes > 1 ? `${answer} (${passes} passes)` : answer,
    warning: first.refetched ? 'Image was re-downloaded; it may differ from the one shown' : undefined,
  };
}

/** The clip's URL from an <audio>, <source> or download link. */
export function audioUrl(el: Element): string {
  if (el instanceof HTMLAudioElement) return el.currentSrc || el.src || el.querySelector('source')?.src || '';
  if (el instanceof HTMLSourceElement) return el.src;
  if (el instanceof HTMLAnchorElement) return el.href;
  const raw = el.getAttribute('src') ?? el.getAttribute('href') ?? '';
  return raw ? new URL(raw, location.href).href : '';
}

/**
 * Audio: switch the challenge to audio if needed, download the clip, transcribe it with the
 * speech-to-text model, type what was heard and press the button.
 */
export async function runAudio(ctx: RunContext): Promise<RunResult> {
  const { rule, provider, cfg, signal } = ctx;
  const findClip = () => {
    const el = q(rule.audioSource);
    const url = el ? audioUrl(el) : '';
    return url ? url : null;
  };

  let url = findClip();
  if (!url) {
    const button = q(rule.audioButton);
    if (!button) throw new Error('Audio button not found. Check the audio button selector');
    await pause(300, 800, signal);
    await humanClick(button, { signal });
    url = await waitFor(findClip, 8000, signal);
    if (!url) throw new Error('No audio challenge appeared. The site may be refusing audio for your network');
  }
  if (!ctx.current()) throw superseded();

  const audio = await ctx.captureAudio(url, { signal });
  ctx.onRequest();
  const raw = await withRetry(() => provider.transcribe(cfg, { audio, signal }), { signal });
  if (!ctx.current()) throw superseded();
  const answer = normalizeSpoken(raw);

  const input = q(rule.audioInput);
  if (!isTextField(input)) throw new Error('Audio answer box not found');
  await pause(400, 1100, signal); // "listening" before typing
  await typeInto(input, answer, signal);
  await pressSubmit(ctx);
  return { answer };
}

/** Image mode while the audio version is showing: go back to pictures and wait for the grid. */
export async function switchToImages(rule: SiteRule, signal: AbortSignal): Promise<Element | null> {
  const button = q(rule.imageButton);
  if (!button) return null;
  await humanClick(button, { signal });
  return waitFor(() => q(rule.captcha), 8000, signal);
}
