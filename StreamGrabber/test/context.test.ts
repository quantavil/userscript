import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFilename } from '../src/utils/filename-utils';

describe('Filename Generation Context', () => {

    beforeEach(() => {
        // Reset document title before each test
        Object.defineProperty(document, 'title', {
            value: 'Original Page Title',
            writable: true
        });
    });

    it('should use document.title by default if no title option is provided', () => {
        const name = generateFilename({ ext: 'mp4' });
        // Spaces are preserved in cleanFilename
        expect(name).toBe('Original Page Title.mp4');
    });

    it('should use provided title option over document.title', () => {
        const name = generateFilename({ title: 'Contextual Title', ext: 'mp4' });
        expect(name).toBe('Contextual Title.mp4');
    });

    it('should handle special characters in title', () => {
        const name = generateFilename({ title: 'Movie: The Return / (2024)', ext: 'mp4' });
        // Colon and Slash should be replaced by underscores. Spaces preserved.
        // cleanFilename replaces /[\\/:*?"<>|]/g with '_'
        // "Movie: The Return / (2024)" -> "Movie_ The Return _ (2024)"
        // .trim() -> "Movie_ The Return _ (2024)"
        expect(name).toContain('Movie_ The Return _');
        expect(name).toMatch(/\.mp4$/);
    });

    it('should include quality if provided', () => {
        const name = generateFilename({ title: 'MyVideo', ext: 'mp4', quality: '1080p' });
        expect(name).toBe('MyVideo_1080p.mp4');
    });

    it('should fallback to default name if title is empty', () => {
        document.title = '';
        const name = generateFilename({ ext: 'mp4' });
        // cleanFilename returns 'video' fallback
        expect(name).toBe('video.mp4');
    });
});
