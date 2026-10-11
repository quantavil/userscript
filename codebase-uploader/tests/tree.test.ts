import { describe, it, expect } from 'vitest';
import { buildTree, nodeCheckState } from '../src/tree';
import { FileObj, FolderNode, FileNode } from '../src/types';

describe('tree utils', () => {
  const createFileObj = (path: string, selected = true): FileObj => ({
    file: new File(['content'], path.split('/').pop() || 'file'),
    path,
    selected,
    isBinary: false,
  });

  describe('buildTree', () => {
    it('builds a folder node tree hierarchy from flat file paths', () => {
      const files: FileObj[] = [
        createFileObj('src/components/Button.tsx'),
        createFileObj('src/index.ts'),
        createFileObj('README.md'),
      ];

      const tree = buildTree(files);

      expect(tree.isFolder).toBe(true);
      expect(tree.children.size).toBe(2); // 'src' and 'README.md'
      expect(tree.children.has('src')).toBe(true);
      expect(tree.children.has('README.md')).toBe(true);

      const srcFolder = tree.children.get('src') as FolderNode;
      expect(srcFolder.isFolder).toBe(true);
      expect(srcFolder.children.size).toBe(2); // 'components' and 'index.ts'

      const buttonFile = (srcFolder.children.get('components') as FolderNode).children.get('Button.tsx') as FileNode;
      expect(buttonFile.isFolder).toBe(false);
      expect(buttonFile.item.path).toBe('src/components/Button.tsx');
    });

    it('returns empty root node for empty file list', () => {
      const tree = buildTree([]);
      expect(tree.isFolder).toBe(true);
      expect(tree.children.size).toBe(0);
    });
  });

  describe('nodeCheckState', () => {
    it('returns 1 for selected file node and 0 for unselected file node', () => {
      const selectedFileNode: FileNode = {
        isFolder: false,
        name: 'a.ts',
        path: 'a.ts',
        item: createFileObj('a.ts', true),
      };

      const unselectedFileNode: FileNode = {
        isFolder: false,
        name: 'b.ts',
        path: 'b.ts',
        item: createFileObj('b.ts', false),
      };

      expect(nodeCheckState(selectedFileNode)).toBe(1);
      expect(nodeCheckState(unselectedFileNode)).toBe(0);
    });

    it('returns 1 when all child nodes of a folder are selected', () => {
      const files = [createFileObj('src/a.ts', true), createFileObj('src/b.ts', true)];
      const tree = buildTree(files);
      const srcNode = tree.children.get('src')!;

      expect(nodeCheckState(srcNode)).toBe(1);
      expect(nodeCheckState(tree)).toBe(1);
    });

    it('returns 0 when no child nodes of a folder are selected', () => {
      const files = [createFileObj('src/a.ts', false), createFileObj('src/b.ts', false)];
      const tree = buildTree(files);
      const srcNode = tree.children.get('src')!;

      expect(nodeCheckState(srcNode)).toBe(0);
      expect(nodeCheckState(tree)).toBe(0);
    });

    it('returns 0.5 when children have mixed selection state (indeterminate)', () => {
      const files = [createFileObj('src/a.ts', true), createFileObj('src/b.ts', false)];
      const tree = buildTree(files);
      const srcNode = tree.children.get('src')!;

      expect(nodeCheckState(srcNode)).toBe(0.5);
      expect(nodeCheckState(tree)).toBe(0.5);
    });

    it('returns 0 for empty folder node', () => {
      const emptyFolder: FolderNode = {
        isFolder: true,
        name: 'empty',
        path: 'empty',
        children: new Map(),
      };

      expect(nodeCheckState(emptyFolder)).toBe(0);
    });
  });
});
