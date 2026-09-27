/**
 * Revamped Reddit Reel Floating Action Button (FAB)
 * Pure vanilla DOM SVG icon (Instagram/Shorts-style Clapperboard + Play Glyph), no text.
 */
export function createFabButton(onClick: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'rr-fab';
  btn.className = 'rr-fab';
  btn.setAttribute('aria-label', 'Open Reddit Reel Mode');
  btn.title = 'Open Reddit Reel Mode';
  btn.innerHTML = `
    <svg
      class="rr-fab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="4.5"></rect>
      <path d="M2.5 8.5h19"></path>
      <path d="m6.5 2.5 3 6"></path>
      <path d="m11.5 2.5 3 6"></path>
      <path d="m16.5 2.5 3 6"></path>
      <polygon points="10 11.5 15.5 14.75 10 18 10 11.5" fill="currentColor" stroke="none"></polygon>
    </svg>
  `;
  btn.onclick = (e) => {
    e.stopPropagation();
    onClick();
  };
  return btn;
}

export const FabButton = createFabButton;
