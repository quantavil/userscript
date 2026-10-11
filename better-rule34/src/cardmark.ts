import { toggleWatched } from './watchstore';

const MARK_CLASS = 'br34-mark';

/** Adds the watched toggle to a card's thumbnail, once. `watched` sets its first state. */
export function decorateCard(card: HTMLElement, id: string, watched: boolean): void {
  const wrap = card.querySelector<HTMLElement>('.wrap_image');
  if (!wrap || !id || wrap.querySelector(`.${MARK_CLASS}`)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = MARK_CLASS;
  button.dataset.id = id;
  button.addEventListener('click', (e) => {
    // The button sits inside the card link: keep the click from opening the video.
    e.preventDefault();
    e.stopPropagation();
    toggleWatched(id);
  });
  wrap.append(button);
  paintCard(card, watched);
}

/** Greys the card when watched and updates its toggle label. */
export function paintCard(card: HTMLElement, watched: boolean): void {
  card.classList.toggle('br34-watched', watched);
  const button = card.querySelector<HTMLButtonElement>(`.${MARK_CLASS}`);
  if (!button) return;
  button.textContent = watched ? '✓ WATCHED' : '+ MARK';
  button.title = watched ? 'Mark as unwatched' : 'Mark as watched';
  button.setAttribute('aria-pressed', String(watched));
}
