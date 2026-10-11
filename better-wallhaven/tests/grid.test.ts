import { describe, expect, it } from 'bun:test';
import { navigateGrid } from '../src/grid';

// Mock DOM structure for non-browser CLI test runs
if (typeof document === 'undefined') {
  const mockElements: any[] = [];
  
  const documentMock = {
    querySelectorAll: (selector: string) => {
      if (selector === 'figure.thumb[data-wallpaper-id]') {
        return mockElements;
      }
      return [];
    }
  };
  
  global.document = documentMock as any;
  (global as any).mockThumbs = mockElements;
}

describe('Grid Navigation', () => {
  it('should select first thumbnail if none is selected', () => {
    const thumb1 = { getAttribute: () => '1' } as any;
    const thumb2 = { getAttribute: () => '2' } as any;
    
    (global as any).mockThumbs.push(thumb1, thumb2);
    
    let selected: any = null;
    const selectFn = (t: any) => { selected = t; };
    
    navigateGrid('right', null, selectFn);
    expect(selected).toBe(thumb1);
    
    // Cleanup mockThumbs
    (global as any).mockThumbs.length = 0;
  });
});
