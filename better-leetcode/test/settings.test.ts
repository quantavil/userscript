import { describe, expect, test } from 'bun:test';
import { clampCommentCount, DEFAULT_SETTINGS, sanitizeSettings } from '../src/settings';

describe('sanitizeSettings', () => {
  test('defaults for empty / garbage input', () => {
    for (const raw of [null, undefined, '', 'not json', 42, [], '"x"']) {
      expect(sanitizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });
  test('accepts an object or a JSON string (legacy format)', () => {
    expect(sanitizeSettings({ tags: true }).tags).toBe(true);
    expect(sanitizeSettings(JSON.stringify({ comments: true, commentCount: 5 }))).toMatchObject({
      comments: true,
      commentCount: 5,
    });
  });
  test('rejects wrong types per key instead of trusting them', () => {
    const s = sanitizeSettings({ title: 'yes', prompt: 123, hints: false, commentCount: 'abc', extra: 1 });
    expect(s.title).toBe(true);
    expect(s.prompt).toBe('');
    expect(s.hints).toBe(false);
    expect(s.commentCount).toBe(10);
    expect('extra' in s).toBe(false);
  });
  test('clamps the comment count', () => {
    expect(clampCommentCount(0)).toBe(1);
    expect(clampCommentCount(999)).toBe(30);
    expect(clampCommentCount('7.6')).toBe(8);
    expect(clampCommentCount(NaN)).toBe(10);
  });
});
