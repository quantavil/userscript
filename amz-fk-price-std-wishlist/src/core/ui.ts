import type { ProductMeta } from './types';
import { isInWishlist, addItem, removeItem } from './wishlist';

export function injectRateUI(container: HTMLElement, text: string, isItemRate: boolean, meta?: ProductMeta) {
  const el = document.createElement('div');
  
  const bg = isItemRate ? '#f3f4f6' : '#eff6ff';
  const color = isItemRate ? '#374151' : '#1d4ed8';
  const border = isItemRate ? '#d1d5db' : '#bfdbfe';

  el.style.cssText = `
    display: flex;
    width: fit-content;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    margin-top: 6px;
    margin-bottom: 4px;
    padding: 3px 10px;
    border-radius: 6px;
    background-color: ${bg};
    color: ${color};
    border: 1px solid ${border};
    line-height: 1.5;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    clear: both;
  `;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  el.appendChild(textSpan);

  if (meta && meta.id) {
    const heartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    heartSvg.setAttribute('viewBox', '0 0 24 24');
    heartSvg.setAttribute('width', '18');
    heartSvg.setAttribute('height', '18');
    heartSvg.setAttribute('class', 'ppu-wishlist-heart');
    heartSvg.dataset.wishlistId = meta.id;
    heartSvg.style.cursor = 'pointer';
    heartSvg.style.flexShrink = '0';
    heartSvg.style.transition = 'transform 0.2s ease';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z');
    
    heartSvg.appendChild(path);
    updateHeartState(heartSvg, isInWishlist(meta.id));
    
    heartSvg.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (isInWishlist(meta.id)) {
        removeItem(meta.id);
      } else {
        addItem(meta);
      }
    });

    el.appendChild(heartSvg);
  }
  
  container.appendChild(el);
}

function updateHeartState(svg: SVGSVGElement, isActive: boolean) {
  const path = svg.querySelector('path');
  if (!path) return;
  if (isActive) {
    path.setAttribute('fill', '#ef4444');
    path.setAttribute('stroke', '#ef4444');
  } else {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#9ca3af');
  }
}

// Listen for cross-card updates
window.addEventListener('wishlist-updated', () => {
  document.querySelectorAll('.ppu-wishlist-heart').forEach(svg => {
    const id = (svg as SVGSVGElement).dataset.wishlistId;
    if (id) updateHeartState(svg as SVGSVGElement, isInWishlist(id));
  });
});
