export function allThumbs(): HTMLElement[] {
  return [...document.querySelectorAll('figure.thumb[data-wallpaper-id]')] as HTMLElement[];
}

export function navigateGrid(
  direction: 'left' | 'right' | 'up' | 'down',
  selected: HTMLElement | null,
  selectThumb: (thumb: HTMLElement) => void
): void {
  const list = allThumbs();
  if (!list.length) return;

  if (!selected) {
    // If nothing is selected, select the first thumbnail
    selectThumb(list[0]);
    return;
  }

  const currRect = selected.getBoundingClientRect();
  const currCenterX = currRect.left + currRect.width / 2;
  const currCenterY = currRect.top + currRect.height / 2;

  let bestMatch: HTMLElement | null = null;
  let minDistance = Infinity;

  for (const thumb of list) {
    if (thumb === selected) continue;
    const rect = thumb.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = centerX - currCenterX;
    const dy = centerY - currCenterY;

    let isValid = false;
    if (direction === 'left') {
      // Must be to the left, and roughly on the same row or slightly offset
      isValid = dx < -10 && Math.abs(dy) < rect.height;
    } else if (direction === 'right') {
      isValid = dx > 10 && Math.abs(dy) < rect.height;
    } else if (direction === 'up') {
      // Must be above
      isValid = dy < -10;
    } else if (direction === 'down') {
      // Must be below
      isValid = dy > 10;
    }

    if (isValid) {
      // Prioritize orthogonal alignment: weight offset heavier
      let distance: number;
      if (direction === 'up' || direction === 'down') {
        distance = Math.abs(dy) + Math.abs(dx) * 2;
      } else {
        distance = Math.abs(dx) + Math.abs(dy) * 2;
      }

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = thumb;
      }
    }
  }

  // Fallbacks if grid geometry navigation didn't find anything (e.g. at row edges)
  if (!bestMatch) {
    const idx = list.indexOf(selected);
    if (direction === 'left' && idx > 0) {
      bestMatch = list[idx - 1];
    } else if (direction === 'right' && idx < list.length - 1) {
      bestMatch = list[idx + 1];
    }
  }

  if (bestMatch) {
    selectThumb(bestMatch);
  }
}
