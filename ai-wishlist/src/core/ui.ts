import type { WishlistItem } from './types';
import { isInWishlist, addItem, removeItem, updateItemDetails } from './wishlist';
import { HEART_PATH_D, ICON } from './icons';
import { getSettings } from './settings';

export function injectHeartUI(container: HTMLElement, meta?: WishlistItem) {
  if (!meta || !meta.id) return;
  // Guard: prevent duplicate hearts when multiple card selectors resolve to the same container
  if (container.querySelector('[data-wishlist-id]')) return;

  // Enforce relative positioning context on container if it is currently static
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(container);
    if (style.position === 'static') {
      container.style.setProperty('position', 'relative', 'important');
    }
  } else if (!container.style.position || container.style.position === 'static') {
    container.style.position = 'relative';
  }

  // container wrapping the heart icon/spinner
  const heartContainer = document.createElement('div');
  heartContainer.className = 'aiw-heart-container';
  heartContainer.dataset.wishlistId = meta.id;

  const active = isInWishlist(meta.id);
  updateHeartContainerState(heartContainer, active);
  
  (heartContainer as any).__wishlistMeta = meta;

  heartContainer.addEventListener('animationend', (ev) => {
    if (ev.animationName === 'aiwHeartPop') {
      heartContainer.classList.remove('pop-anim');
    }
  });

  container.appendChild(heartContainer);
}


function createHeartSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.style.flexShrink = '0';
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', HEART_PATH_D);
  svg.appendChild(path);
  return svg;
}

// ponytail: simplified class toggles and element append checks to minimize lines
function updateHeartContainerState(container: HTMLDivElement, isActive: boolean) {
  container.classList.toggle('active', isActive);
  if (!container.querySelector('svg')) {
    container.innerHTML = '';
    container.appendChild(createHeartSvg());
  }
}

// ponytail: background fetcher that triggers cross-site request to details page & parses details
function fetchAndSaveProductDetails(id: string, url: string, platform: string, onDone: () => void) {
  if (typeof GM_xmlhttpRequest === 'undefined') {
    console.warn('AI Wishlist: GM_xmlhttpRequest not available.');
    onDone();
    return;
  }

  GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    onload: (response) => {
      try {
        const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
        let details = '';
        if (platform === 'Flipkart') {
          details = parseFlipkartDetails(doc);
        } else if (platform === 'Amazon') {
          details = parseAmazonDetails(doc);
        }
        if (details) {
          updateItemDetails(id, details);
        }
      } catch (e) {
        console.error('AI Wishlist: Error parsing details page', e);
      } finally {
        onDone();
      }
    },
    onerror: (err) => {
      console.error('AI Wishlist: Error fetching details page', err);
      onDone();
    }
  });
}

export function parseFlipkartDetails(doc: Document): string {
  const specs: Record<string, string> = {};
  
  // 1. Try to extract specs from JSON state object (Flipkart renders details purely client-side)
  let stateObj: any = null;
  doc.querySelectorAll('script').forEach(script => {
    const content = script.textContent || '';
    if (/window\.__INITIAL_STATE__\s*=/.test(content)) {
      try {
        const startIdx = content.indexOf('{');
        const lastBraceIdx = content.lastIndexOf('}');
        if (startIdx !== -1 && lastBraceIdx > startIdx) {
          const jsonStr = content.slice(startIdx, lastBraceIdx + 1);
          stateObj = JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error('AI Wishlist: Error parsing INITIAL_STATE', e);
      }
    }
  });

  if (stateObj) {
    extractSpecsFromInitialState(stateObj, specs);
  }

  // 2. Fallback description parsing from DOM
  const descEl = doc.querySelector('div._2u3tZ_, div.R1Z4XM, div._1mXFDR, div._271593, .yN18w9, [data-aid="product-description"]');
  if (descEl) {
    specs['Description'] = cleanDomText(descEl);
  }

  // 3. Fallback DOM selectors (if state parsing failed or has very few details)
  if (Object.keys(specs).length <= 1) {
    const rowSelectors = [
      'tr._1s574Q',
      'tr',
      'div._3_60cu',
      'div.row',
      'div._14_5Iy',
      'div._2RngN-'
    ];
    
    doc.querySelectorAll(rowSelectors.join(', ')).forEach(row => {
      const keyEl = row.querySelector('td._1hKmfg, ._2RngN-, .col-3-12');
      const valEl = row.querySelector('td._25HCb6, ._3ENrCw, .col-9-12');
      if (keyEl && valEl && keyEl !== valEl) {
        const key = cleanDomText(keyEl).replace(/:\s*$/, '').trim();
        const val = cleanDomText(valEl);
        if (key && val && key !== val) {
          specs[key] = val;
        }
      }
    });

    if (Object.keys(specs).length <= 1) {
      doc.querySelectorAll('._3ENrCw, td._25HCb6, .col-9-12').forEach(valEl => {
        const keyEl = valEl.previousElementSibling;
        if (keyEl) {
          const key = cleanDomText(keyEl).replace(/:\s*$/, '').trim();
          const val = cleanDomText(valEl);
          if (key && val && key !== val) {
            specs[key] = val;
          }
        }
      });
    }
  }
  
  return JSON.stringify(specs);
}

// ponytail: recursive specifications crawler that pulls all client-side layout key-value details from state
export function extractSpecsFromInitialState(state: any, specs: Record<string, string> = {}): Record<string, string> {
  const visited = new Set();

  function recurse(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    if (visited.has(obj)) return;
    visited.add(obj);

    if (obj.label_0?.value?.text && obj.label_1?.value?.text) {
      const key = String(obj.label_0.value.text).trim().replace(/:$/, '');
      const rawVal = obj.label_1.value.text;
      const val = (Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal)).trim();
      
      if (key && val && key !== val) {
        specs[key] = val;
      }
    }

    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        recurse(obj[k]);
      }
    }
  }

  recurse(state);
  return specs;
}

function cleanDomText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('script, style').forEach(child => child.remove());
  return clone.textContent?.trim().replace(/\s+/g, ' ') || '';
}

export function parseAmazonDetails(doc: Document): string {
  const specs: Record<string, string> = {};
  
  const bullets: string[] = [];
  doc.querySelectorAll('#feature-bullets ul li span.a-list-item').forEach(li => {
    const text = cleanDomText(li);
    if (text && !text.includes('Make sure this fits')) {
      bullets.push(text);
    }
  });
  if (bullets.length > 0) {
    specs['About'] = bullets.join('; ');
  }
  
  const rowSelectors = [
    '#prodDetails table tr',
    '#detailBullets_feature_div ul li',
    '#technicalSpecifications_section_1 table tr',
    '.a-keyvalue tr'
  ];
  
  doc.querySelectorAll(rowSelectors.join(', ')).forEach(row => {
    const keyEl = row.querySelector('th, td.a-color-secondary, .a-list-item .a-text-bold, td:first-child');
    const valEl = row.querySelector('td, td.a-size-base, .a-list-item :not(.a-text-bold), td:last-child');
    if (keyEl && valEl && keyEl !== valEl) {
      const key = cleanDomText(keyEl).replace(/:\s*$/, '').trim();
      const val = cleanDomText(valEl);
      if (key && val && key !== val) {
        specs[key] = val;
      }
    }
  });
  
  return JSON.stringify(specs);
}

if (typeof window !== 'undefined') {
  // Capture click events on the heart at window level, run the logic, and block propagation completely
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const heartContainer = target.closest('.aiw-heart-container') as HTMLDivElement | null;
    if (heartContainer) {
      e.stopPropagation();
      e.preventDefault();

      const meta = (heartContainer as any).__wishlistMeta as WishlistItem | undefined;
      if (!meta) return;

      const currentActive = isInWishlist(meta.id);
      if (currentActive) {
        removeItem(meta.id);
        updateHeartContainerState(heartContainer, false);
      } else {
        addItem(meta);
        updateHeartContainerState(heartContainer, true);

        if (getSettings().autocrawl) {
          // Dispatch crawling start event to trigger crab animation on FAB
          window.dispatchEvent(new CustomEvent('crawling-start'));

          // asynchronously fetch details page in background & restore heart once finished
          fetchAndSaveProductDetails(meta.id, meta.url, meta.platform, () => {
            // Dispatch crawling end event
            window.dispatchEvent(new CustomEvent('crawling-end'));
          });
        }
      }

      // Spring pop animation on toggle
      heartContainer.classList.remove('pop-anim');
      void heartContainer.offsetWidth; // Trigger reflow to restart animation
      heartContainer.classList.add('pop-anim');
    }
  }, true); // <-- CAPTURE PHASE!

  // ponytail: simplified reactive update query loop with inline guards
  window.addEventListener('wishlist-updated', () => {
    document.querySelectorAll<HTMLDivElement>('.aiw-heart-container').forEach(container => {
      const id = container.dataset.wishlistId;
      if (id) updateHeartContainerState(container, isInWishlist(id));
    });
  });
}
