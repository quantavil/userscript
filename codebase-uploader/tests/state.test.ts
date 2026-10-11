// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { formatSize, el } from '../src/state';

describe('state module helpers', () => {
  describe('formatSize', () => {
    it('formats bytes under 1024 as B', () => {
      expect(formatSize(0)).toBe('0 B');
      expect(formatSize(512)).toBe('512 B');
      expect(formatSize(1023)).toBe('1023 B');
    });

    it('formats bytes under 1 MB as KB', () => {
      expect(formatSize(1024)).toBe('1.0 KB');
      expect(formatSize(50 * 1024)).toBe('50.0 KB');
      expect(formatSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    });

    it('formats bytes over 1 MB as MB', () => {
      expect(formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatSize(5.5 * 1024 * 1024)).toBe('5.50 MB');
    });
  });

  describe('el helper', () => {
    it('creates an HTML element with class, text, attributes, and children', () => {
      const child = el('span', { txt: 'child' });
      const parent = el('div', { id: 'test-id', cls: 'test-class', title: 'Test Title' }, [child]);

      expect(parent.tagName).toBe('DIV');
      expect(parent.id).toBe('test-id');
      expect(parent.className).toBe('test-class');
      expect(parent.title).toBe('Test Title');
      expect(parent.children.length).toBe(1);
      expect(parent.firstElementChild?.textContent).toBe('child');
    });
  });
});
