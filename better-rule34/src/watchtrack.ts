import { isWatched, markWatched, onWatchChange, toggleWatched } from './watchstore';

/** Share of the video that must play before it counts as watched. */
const WATCH_THRESHOLD = 0.85;
/** Larger jumps in playback time are seeks, not watching. */
const MAX_JUMP_SECONDS = 2;
const CHECK_ICON =
  '<svg class="vp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>';

export function watchIdFromPath(pathname: string): string | null {
  const match = /^\/videos?\/(\d{1,12})(?:\/|$)/.exec(pathname);
  return match ? match[1] : null;
}

interface CoverageTracker {
  /** Feed the playback position. Returns true once, when the threshold is first reached. */
  update(time: number, playing: boolean): boolean;
  /** Forget the last position (after pause or seek) so resumed play is not read as a jump. */
  reset(): void;
  readonly covered: number;
}

/** Counts distinct whole seconds of contiguous playback. Seeks and paused time do not count. */
export function createCoverageTracker(
  duration: number,
  threshold = WATCH_THRESHOLD,
  maxJump = MAX_JUMP_SECONDS,
): CoverageTracker {
  const seen = new Set<number>();
  let last: number | null = null;
  let reached = false;
  return {
    get covered(): number {
      return seen.size;
    },
    reset(): void {
      last = null;
    },
    update(time: number, playing: boolean): boolean {
      if (!playing || !Number.isFinite(time) || !(duration > 0)) {
        last = null;
        return false;
      }
      if (last !== null && time >= last && time - last <= maxJump) {
        for (let s = Math.floor(last); s <= Math.floor(time); s++) seen.add(s);
      } else {
        seen.add(Math.floor(time));
      }
      last = time;
      if (!reached && Math.min(seen.size, duration) / duration >= threshold) {
        reached = true;
        return true;
      }
      return false;
    },
  };
}

/** The site's own player source lives under /get_file/. Ad players do not. */
function findMainVideo(): HTMLVideoElement | null {
  for (const v of document.querySelectorAll<HTMLVideoElement>('video')) {
    const src = v.currentSrc || v.src || v.querySelector<HTMLSourceElement>('source')?.src || '';
    if (src.includes('/get_file/')) return v;
  }
  return document.querySelector<HTMLVideoElement>('#kt_player video, .player video, .video-player video');
}

let attached = false;

/** Watches the page's player and marks the video watched at 85% of playback. */
export function attachWatchTracker(): void {
  const id = watchIdFromPath(window.location.pathname);
  if (!id || attached) return;
  attached = true;

  let bound: HTMLVideoElement | null = null;
  let tracker: CoverageTracker | null = null;
  let trackedDuration = 0;

  const onMeta = (): void => {
    if (!bound) return;
    const d = bound.duration;
    // durationchange also fires mid-playback. Keep progress unless the length really changed.
    if (!Number.isFinite(d) || d <= 0 || (tracker && Math.abs(d - trackedDuration) < 1)) return;
    trackedDuration = d;
    tracker = createCoverageTracker(d);
  };
  const onTime = (): void => {
    if (!bound || !tracker) return;
    const playing = !bound.paused && !bound.seeking && !bound.ended;
    // A manual mark stays manual.
    if (tracker.update(bound.currentTime, playing) && !isWatched(id)) markWatched(id, false);
  };
  const onReset = (): void => tracker?.reset();
  const bind = (v: HTMLVideoElement): void => {
    if (v === bound) return;
    bound = v;
    tracker = null;
    trackedDuration = 0;
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('durationchange', onMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('pause', onReset);
    v.addEventListener('seeking', onReset);
    onMeta();
  };

  const first = findMainVideo();
  if (first) bind(first);
  // The player is often created after load (on press play), so keep watching the DOM.
  new MutationObserver(() => {
    if (bound?.isConnected) return;
    const v = findMainVideo();
    if (v && v !== bound) bind(v);
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });
}

function paintToggle(button: HTMLButtonElement): void {
  const on = isWatched(button.dataset.id ?? '');
  button.classList.toggle('is-on', on);
  button.setAttribute('aria-pressed', String(on));
  button.title = on ? 'Mark as unwatched' : 'Mark as watched';
  const label = button.querySelector('.vp-btn__label');
  if (label) label.textContent = on ? 'Watched' : 'Mark watched';
}

function floatingHost(): HTMLElement {
  let dock = document.querySelector<HTMLElement>('.br34-dock');
  if (!dock) {
    dock = document.createElement('div');
    dock.className = 'br34-dock';
    document.body.append(dock);
  }
  return dock;
}

let toggleSubscribed = false;

/**
 * "Mark watched" on a video page, in the action row next to Download and Share.
 * Falls back to a floating button when the page has no action row.
 */
export function mountWatchToggle(): void {
  const id = watchIdFromPath(window.location.pathname);
  if (!id) return;
  let button = document.querySelector<HTMLButtonElement>('.br34-watch-btn');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'vp-btn br34-watch-btn';
    button.dataset.id = id;
    button.innerHTML = `${CHECK_ICON}<span class="vp-btn__label"></span>`;
    button.addEventListener('click', () => toggleWatched(id));
  }
  if (!button.isConnected) {
    const row = document.querySelector<HTMLElement>('.vp-actions') ?? floatingHost();
    row.insertBefore(button, row.querySelector(':scope > [data-sheet="more"]'));
  }
  paintToggle(button);
  if (!toggleSubscribed) {
    toggleSubscribed = true;
    onWatchChange(() => {
      for (const b of document.querySelectorAll<HTMLButtonElement>('.br34-watch-btn')) paintToggle(b);
    });
  }
}
