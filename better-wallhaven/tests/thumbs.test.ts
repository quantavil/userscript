import { describe, expect, it } from 'bun:test';
import { enhanceThumb } from '../src/thumbs';

function createMockFigure(category: string, purity: string) {
  const dataset: Record<string, string> = { wallpaperId: 'test123' };
  let insertedAfter: any = null;

  const mockEl = {
    dataset,
    getAttribute: (k: string) => (k === 'data-wallpaper-id' ? 'test123' : null),
    classList: {
      contains: (cls: string) => cls === `thumb-${category}` || cls === `thumb-${purity}`,
    },
    className: `thumb thumb-${category} thumb-${purity}`,
    querySelector: () => null,
    after: (node: any) => { insertedAfter = node; },
    parentElement: null,
  } as any;

  return { mockEl, getInserted: () => insertedAfter };
}

describe('enhanceThumb', () => {
  it('renders category and purity dots with tooltips and no legend element', () => {
    // Setup document mock if not in browser
    if (typeof document === 'undefined' || !document.createElement) {
      (global as any).document = {
        createElement: (tag: string) => ({
          tagName: tag.toUpperCase(),
          className: '',
          innerHTML: '',
          querySelector: () => null,
        }),
      };
    }

    const { mockEl, getInserted } = createMockFigure('anime', 'sfw');
    enhanceThumb(mockEl);

    const inserted = getInserted();
    expect(inserted).not.toBeNull();
    expect(inserted.innerHTML).toContain('wh-cat-anime');
    expect(inserted.innerHTML).toContain('wh-pur-sfw');
    expect(inserted.innerHTML).toContain('title="Category: Anime"');
    expect(inserted.innerHTML).toContain('title="Purity: SFW"');
    expect(inserted.innerHTML).toContain('data-kind="category"');
    expect(inserted.innerHTML).toContain('data-kind="purity"');
    // Ensure no legend element anywhere
    expect(inserted.innerHTML).not.toContain('legend');
    expect(inserted.innerHTML).not.toContain('wh-legend');
  });

  it('handles People category and Sketchy purity correctly without swapping', () => {
    const { mockEl, getInserted } = createMockFigure('people', 'sketchy');
    enhanceThumb(mockEl);

    const inserted = getInserted();
    expect(inserted.innerHTML).toContain('wh-cat-people');
    expect(inserted.innerHTML).toContain('wh-pur-sketchy');
    expect(inserted.innerHTML).toContain('title="Category: People"');
    expect(inserted.innerHTML).toContain('title="Purity: Sketchy"');
  });
});
