/**
 * Plays muted preview clips on cards that are mostly on screen. Same on desktop and
 * mobile, no hover needed. The most visible cards win when more than `maxActive` qualify.
 */

interface RankedItem<T> {
  item: T;
  ratio: number;
}

/** The `max` most visible items at or above `minRatio`, most visible first. */
export function pickTop<T>(items: ReadonlyArray<RankedItem<T>>, max: number, minRatio: number): T[] {
  return items
    .filter((c) => c.ratio >= minRatio)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, Math.max(0, max))
    .map((c) => c.item);
}

interface AutoplayOptions {
  maxActive: number;
  minRatio: number;
  enabled: boolean;
  /** Return false to keep a card's preview off (for example when it is watched). */
  isEligible?: (card: HTMLElement) => boolean;
}

interface Tracked {
  card: HTMLElement;
  ratio: number;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

/** The preview clip URL. Read at play time because the site can set it after the card appears. */
function previewUrlOf(wrap: HTMLElement): string | null {
  return wrap.dataset.preview || wrap.closest<HTMLElement>('[data-preview]')?.dataset.preview || null;
}

export class AutoplayController {
  private readonly maxActive: number;
  private readonly minRatio: number;
  private readonly isEligible: (card: HTMLElement) => boolean;
  private enabled: boolean;
  private readonly io: IntersectionObserver | null;
  /** Keyed by the preview wrapper (.wrap_image), which is what gets observed. */
  private readonly tracked = new Map<HTMLElement, Tracked>();
  private readonly players = new Map<HTMLElement, HTMLVideoElement>();
  private readonly attempts = new Map<HTMLElement, number>();
  private readonly retryTimers = new Map<HTMLElement, number>();

  private readonly onVisibilityChange = (): void => this.reconcile();

  constructor(options: AutoplayOptions) {
    this.maxActive = options.maxActive;
    this.minRatio = options.minRatio;
    this.enabled = options.enabled;
    this.isEligible = options.isEligible ?? (() => true);
    this.io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const t = this.tracked.get(entry.target as HTMLElement);
                if (t) t.ratio = entry.intersectionRatio;
              }
              this.reconcile();
            },
            { threshold: [0, 0.25, 0.5, 0.75, 1] },
          );
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  observe(card: HTMLElement): void {
    const wrap = card.querySelector<HTMLElement>('.wrap_image');
    if (!this.io || !wrap || this.tracked.has(wrap)) return;
    this.tracked.set(wrap, { card, ratio: 0 });
    this.io.observe(wrap);
  }

  unobserve(card: HTMLElement): void {
    for (const [wrap, t] of [...this.tracked]) {
      if (t.card !== card) continue;
      this.io?.unobserve(wrap);
      this.forget(wrap);
      this.tracked.delete(wrap);
    }
  }

  /** Re-checks eligibility and playback, e.g. after a card's watched state changes. */
  refresh(): void {
    this.reconcile();
  }

  /** Stops all playback and forgets every card. Used when the list is replaced. */
  reset(): void {
    for (const wrap of [...this.players.keys(), ...this.retryTimers.keys()]) this.forget(wrap);
    for (const wrap of this.tracked.keys()) this.io?.unobserve(wrap);
    this.tracked.clear();
    this.attempts.clear();
  }

  private reconcile(): void {
    for (const t of [...this.tracked.values()]) {
      if (!t.card.isConnected) this.unobserve(t.card);
    }
    if (!this.enabled || document.hidden) {
      for (const wrap of [...this.players.keys()]) this.stop(wrap);
      return;
    }
    const candidates: RankedItem<HTMLElement>[] = [];
    for (const [wrap, t] of this.tracked) {
      if ((this.attempts.get(wrap) ?? 0) >= MAX_ATTEMPTS) continue;
      if (!this.isEligible(t.card) || !previewUrlOf(wrap)) continue;
      candidates.push({ item: wrap, ratio: t.ratio });
    }
    const wanted = new Set(pickTop(candidates, this.maxActive, this.minRatio));
    for (const wrap of [...this.players.keys()]) {
      if (!wanted.has(wrap)) this.stop(wrap);
    }
    for (const wrap of wanted) {
      if (!this.players.has(wrap) && !this.retryTimers.has(wrap)) this.start(wrap);
    }
  }

  private start(wrap: HTMLElement): void {
    const url = previewUrlOf(wrap);
    if (!url) return;
    const video = document.createElement('video');
    video.className = 'br34-autoplay-video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    // The clip stays invisible until a frame is really playing, so a slow or broken
    // clip never covers the thumbnail with a black box.
    video.addEventListener('playing', () => {
      // A clip that really plays clears its failure count, so later glitches get retries again.
      this.attempts.delete(wrap);
      wrap.classList.add('br34-playing');
    });
    video.addEventListener('error', () => this.fail(wrap, video));
    video.src = url;
    wrap.append(video);
    this.players.set(wrap, video);
    video.play().catch((err: unknown) => {
      // play() is rejected with AbortError when we stop the clip ourselves. Not a failure.
      if ((err as DOMException | undefined)?.name !== 'AbortError') this.fail(wrap, video);
    });
  }

  /** Playback broke: retry a couple of times, then give up on this card until the list resets. */
  private fail(wrap: HTMLElement, video: HTMLVideoElement): void {
    if (this.players.get(wrap) !== video) return;
    const tries = (this.attempts.get(wrap) ?? 0) + 1;
    this.attempts.set(wrap, tries);
    this.stop(wrap);
    if (tries >= MAX_ATTEMPTS) return;
    window.clearTimeout(this.retryTimers.get(wrap));
    this.retryTimers.set(
      wrap,
      window.setTimeout(() => {
        this.retryTimers.delete(wrap);
        this.reconcile();
      }, RETRY_DELAY_MS * tries),
    );
  }

  private stop(wrap: HTMLElement): void {
    wrap.classList.remove('br34-playing');
    const video = this.players.get(wrap);
    if (!video) return;
    this.players.delete(wrap);
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
  }

  private forget(wrap: HTMLElement): void {
    this.stop(wrap);
    window.clearTimeout(this.retryTimers.get(wrap));
    this.retryTimers.delete(wrap);
    this.attempts.delete(wrap);
  }
}
