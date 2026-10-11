// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { icon } from '../src/icons';

describe('icons module', () => {
  it('creates an SVGSVGElement with default size 16', () => {
    const el = icon('search');
    expect(el).toBeInstanceOf(SVGSVGElement);
    expect(el.getAttribute('width')).toBe('16');
    expect(el.getAttribute('height')).toBe('16');
    expect(el.children.length).toBeGreaterThan(0);
  });

  it('creates an SVGSVGElement with custom specified size', () => {
    const el = icon('zap', 24);
    expect(el.getAttribute('width')).toBe('24');
    expect(el.getAttribute('height')).toBe('24');
  });

  it('handles all registered icon names without throwing errors', () => {
    const iconNames = [
      'folder', 'folderOpen', 'file', 'paperclip', 'x',
      'chevronRight', 'chevronDown', 'arrowLeft', 'plus',
      'download', 'zap', 'search', 'settings', 'upload',
      'copy', 'save', 'terminal', 'code', 'binary', 'dot',
    ];

    iconNames.forEach(name => {
      const el = icon(name);
      expect(el).toBeInstanceOf(SVGSVGElement);
      expect(el.children.length).toBeGreaterThan(0);
    });
  });

  it('returns empty SVG element for unknown icon names', () => {
    const el = icon('non_existent_icon_xyz');
    expect(el).toBeInstanceOf(SVGSVGElement);
    expect(el.children.length).toBe(0);
  });
});
