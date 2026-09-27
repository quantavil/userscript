/**
 * Gallery media helper for locating active carousel slide media.
 * Ensures the single-media audio mutex targets only the currently visible slide.
 */

export function getActiveCarouselSlide(carouselContainer: HTMLElement): HTMLElement | null {
  const list = carouselContainer.querySelector<HTMLElement>(
    'ul[slot="items"], [slot="items"], .carousel-items, ul'
  );
  if (!list) return null;
  const items = Array.from(list.children).filter((el) =>
    typeof HTMLElement !== 'undefined' ? el instanceof HTMLElement : Boolean(el && (el as any).nodeType === 1)
  ) as HTMLElement[];
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];

  const scrollLeft = list.scrollLeft;
  let closestSlide = items[0];
  let minDiff = Infinity;
  for (const item of items) {
    const diff = Math.abs(item.offsetLeft - scrollLeft);
    if (diff < minDiff) {
      minDiff = diff;
      closestSlide = item;
    }
  }
  return closestSlide;
}

export function findActiveSlideVideo(carouselContainer: HTMLElement): HTMLVideoElement | null {
  const slide = getActiveCarouselSlide(carouselContainer);
  if (!slide) return null;
  return slide.querySelector<HTMLVideoElement>('video');
}
