import { describe, expect, it } from 'bun:test';
import { isReelRoute } from '../../src/core/route';

describe('isReelRoute', () => {
  it('matches feed listings', () => {
    for (const path of [
      '/',
      '/best/',
      '/new',
      '/r/videos/',
      '/r/videos/top/',
      '/r/popular',
      '/r/all/',
      '/user/someone/submitted/',
      '/u/someone',
    ]) {
      expect(isReelRoute(path)).toBe(true);
    }
  });

  it('never matches post pages or tool pages', () => {
    for (const path of [
      '/r/videos/comments/abc123/some_title/',
      '/r/videos/s/AbC123',
      '/settings/',
      '/message/inbox',
      '/search/',
      '/submit',
      '/r/videos/wiki/index',
    ]) {
      expect(isReelRoute(path)).toBe(false);
    }
  });
});
