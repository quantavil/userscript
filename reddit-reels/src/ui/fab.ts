/**
 * Floating "Reels" button. Own shadow root so Reddit's CSS can't touch it.
 */

import { ICONS } from '../reel/icons';

const CSS = `
:host { all: initial; }
button {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  top: auto;
  left: auto;
  z-index: 2147483000;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: 0;
  background: #ff4500;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease;
}
button:active { transform: scale(0.92); }
button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
button svg { width: 28px; height: 28px; }
@media (pointer: fine) and (min-width: 900px) {
  button { bottom: 28px; right: 28px; }
}
`;

export function createFab(onClick: () => void): HTMLElement {
  const host = document.createElement('div');
  host.id = 'rr-fab-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open reels');
  btn.title = 'Reels';
  btn.innerHTML = ICONS.reel;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  shadow.append(style, btn);
  return host;
}
