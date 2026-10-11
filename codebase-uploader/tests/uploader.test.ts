import { describe, it, expect, beforeEach } from 'vitest';
import { shouldSkip, safeSlice, isBinaryFile, buildChunks } from '../src/uploader';
import { settings, saveSettings } from '../src/settings';
import { FileObj } from '../src/types';

describe('uploader utils', () => {
  beforeEach(() => {
    // Reset settings to default before each test
    settings.skipHidden = true;
    settings.maxFileBytes = 10 * 1024 * 1024;
    settings.maxChunkChars = 100000;
    settings.ignoreFolders = 'node_modules, .git, .idea, dist, build, .vscode';
    settings.ignoreExts = '.png, .jpg, .jpeg, .gif, .mp4, .zip, .tar, .gz, .pdf';
    settings.customPrompt = '';
    saveSettings();
  });

  describe('shouldSkip', () => {
    it('returns false for normal source files and recognized text dotfiles', () => {
      expect(shouldSkip('src/index.ts', 1024)).toBe(false);
      expect(shouldSkip('components/Button.tsx', 2048)).toBe(false);
      expect(shouldSkip('.env', 100)).toBe(false); // recognized text file extension
    });

    it('returns true for files in ignored folders', () => {
      expect(shouldSkip('node_modules/express/index.js', 500)).toBe(true);
      expect(shouldSkip('.git/HEAD', 50)).toBe(true);
      expect(shouldSkip('dist/bundle.js', 10000)).toBe(true);
    });

    it('returns true for hidden files when skipHidden is active', () => {
      expect(shouldSkip('.unknown_secret', 100)).toBe(true);
      expect(shouldSkip('.hidden_dir/config.json', 100)).toBe(true);
    });

    it('returns true for ignored extensions', () => {
      expect(shouldSkip('assets/logo.png', 5000)).toBe(true);
      expect(shouldSkip('docs/manual.pdf', 50000)).toBe(true);
      expect(shouldSkip('archive.zip', 100000)).toBe(true);
    });

    it('returns true for files exceeding maxFileBytes', () => {
      expect(shouldSkip('src/large.ts', 15 * 1024 * 1024)).toBe(true);
    });
  });

  describe('safeSlice', () => {
    it('slices standard strings correctly given start and length', () => {
      expect(safeSlice('hello world', 0, 5)).toBe('hello');
      expect(safeSlice('hello world', 6, 5)).toBe('world');
    });

    it('handles out-of-bound start or invalid length gracefully', () => {
      expect(safeSlice('hello', 10, 5)).toBe('');
      expect(safeSlice('hello', 0, 0)).toBe('');
      expect(safeSlice('hello', 2, -1)).toBe('');
    });

    it('handles surrogate pairs (emojis) without splitting them', () => {
      const emojiStr = 'a🚀b';
      // '🚀' consists of high surrogate \uD83D (index 1) and low surrogate \uDE80 (index 2)
      // Slicing with length 2 ends between surrogates; safeSlice backs off to avoid invalid character
      const sliced = safeSlice(emojiStr, 0, 2);
      expect(sliced).toBe('a');
    });
  });

  describe('isBinaryFile', () => {
    it('identifies binary files by extension', () => {
      expect(isBinaryFile('image.png')).toBe(true);
      expect(isBinaryFile('photo.JPG')).toBe(true);
      expect(isBinaryFile('archive.zip')).toBe(true);
      expect(isBinaryFile('document.pdf')).toBe(true);
    });

    it('returns false for text files', () => {
      expect(isBinaryFile('script.ts')).toBe(false);
      expect(isBinaryFile('styles.css')).toBe(false);
      expect(isBinaryFile('index.html')).toBe(false);
      expect(isBinaryFile('README')).toBe(false);
    });
  });

  describe('buildChunks', () => {
    it('generates manifest and content chunk files', async () => {
      const textFiles: FileObj[] = [
        {
          file: new File(['console.log("hello world");'], 'main.ts', { type: 'text/typescript' }),
          path: 'src/main.ts',
          selected: true,
          isBinary: false,
        },
      ];

      const binaryFiles: FileObj[] = [
        {
          file: new File(['fake binary content'], 'icon.png', { type: 'image/png' }),
          path: 'public/icon.png',
          selected: true,
          isBinary: true,
        },
      ];

      const result = await buildChunks(textFiles, binaryFiles);
      expect(result.length).toBe(2);

      const manifestFile = result[0];
      expect(manifestFile.name).toBe('codebase_manifest.md');
      const manifestText = await manifestFile.text();
      expect(manifestText).toContain('# Codebase Manifest');
      expect(manifestText).toContain('- `src/main.ts`');
      expect(manifestText).toContain('- `public/icon.png` (binary)');

      const part1File = result[1];
      expect(part1File.name).toBe('codebase_part_1.md');
      const part1Text = await part1File.text();
      expect(part1Text).toContain('# Codebase Context — Part 1');
      expect(part1Text).toContain('## File: `src/main.ts`');
      expect(part1Text).toContain('console.log("hello world");');
    });

    it('splits large files into multiple chunk parts when exceeding maxChunkChars', async () => {
      settings.maxChunkChars = 1000;
      const largeContent = 'a'.repeat(2000);
      const textFiles: FileObj[] = [
        {
          file: new File([largeContent], 'big.txt', { type: 'text/plain' }),
          path: 'big.txt',
          selected: true,
          isBinary: false,
        },
      ];

      const result = await buildChunks(textFiles, []);
      expect(result.length).toBeGreaterThan(2); // manifest + at least 2 part files
    });
  });
});
