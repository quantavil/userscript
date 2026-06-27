import { TreeNode, FolderNode, FileNode, FileObj } from './types';
import { state, $ } from './state';
import { updateStats } from './uploader';
import { icon } from './icons';

export function buildTree(files: FileObj[]): FolderNode {
  const root: FolderNode = { isFolder: true, children: new Map(), path: '', name: '' };
  for (const item of files) {
    const parts = item.path.split('/').filter(Boolean);
    let node = root;
    let curPath = '';
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      curPath = curPath ? `${curPath}/${seg}` : seg;
      if (i === parts.length - 1) {
        node.children.set(seg, { isFolder: false, name: seg, path: curPath, item });
      } else {
        if (!node.children.has(seg)) {
          node.children.set(seg, { isFolder: true, name: seg, path: curPath, children: new Map() });
        }
        node = node.children.get(seg) as FolderNode;
      }
    }
  }
  return root;
}

function nodeCheckState(node: TreeNode): number {
  if (!node.isFolder) return node.item.selected ? 1 : 0;
  const vals = [...node.children.values()].map(nodeCheckState);
  if (!vals.length) return 0;
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum === vals.length ? 1 : sum === 0 ? 0 : 0.5;
}

function setNodeChecked(node: TreeNode, val: boolean): void {
  if (!node.isFolder) { node.item.selected = val; return; }
  for (const c of node.children.values()) setNodeChecked(c, val);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function highlightLabel(text: string): Node {
  if (!state.searchQ) return document.createTextNode(text);
  const idx = text.toLowerCase().indexOf(state.searchQ);
  if (idx < 0) return document.createTextNode(text);
  const span = document.createElement('span');
  span.append(text.slice(0, idx));
  const mark = document.createElement('mark');
  mark.textContent = text.slice(idx, idx + state.searchQ.length);
  span.append(mark, text.slice(idx + state.searchQ.length));
  return span;
}

function hasMatchingDescendant(node: TreeNode, query: string): boolean {
  if (!node.isFolder) return node.path.toLowerCase().includes(query);
  if (node.path.toLowerCase().includes(query)) return true;
  for (const child of node.children.values()) {
    if (hasMatchingDescendant(child, query)) return true;
  }
  return false;
}

export function renderTree(): void {
  const treePane = $('cu-tree-pane');
  const treeList = $('cu-tree-list');
  if (!treePane || !treeList) return;

  const scrollTop = treePane.scrollTop;

  if (!state.allFiles.length) {
    treePane.classList.add('cu-empty');
    treeList.textContent = '';
    updateStats();
    return;
  }

  treePane.classList.remove('cu-empty');
  const tree = buildTree(state.allFiles);
  const frag = document.createDocumentFragment();
  renderChildren(tree, frag);
  treeList.textContent = '';
  treeList.appendChild(frag);
  updateStats();
  treePane.scrollTop = scrollTop;
}

function renderChildren(node: FolderNode, container: HTMLElement | DocumentFragment): void {
  const sorted = [...node.children.values()].sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of sorted) {
    if (state.searchQ && !hasMatchingDescendant(child, state.searchQ)) continue;
    container.appendChild(child.isFolder ? renderFolder(child) : renderFile(child));
  }
}

function renderFolder(node: FolderNode): HTMLDivElement {
  const wrap = document.createElement('div');
  const hasMatch = state.searchQ && hasMatchingDescendant(node, state.searchQ);
  const isOpen = state.openFolders.has(node.path) || !!hasMatch;

  const row = document.createElement('div');
  row.className = 'tr';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  const stateVal = nodeCheckState(node);
  cb.checked = stateVal === 1;
  cb.indeterminate = stateVal === 0.5;
  cb.addEventListener('change', e => {
    setNodeChecked(node, (e.target as HTMLInputElement).checked);
    renderTree();
  });

  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.appendChild(icon(isOpen ? 'chevronDown' : 'chevronRight', 14));

  const iconEl = document.createElement('span');
  iconEl.className = `t-icon ${isOpen ? 'folderOpen' : 'folder'}`;
  iconEl.appendChild(icon(isOpen ? 'folderOpen' : 'folder', 17));

  const label = document.createElement('span');
  label.className = 't-label';
  label.appendChild(highlightLabel(node.name));

  const toggle = () => {
    if (state.openFolders.has(node.path)) {
      state.openFolders.delete(node.path);
    } else {
      state.openFolders.add(node.path);
    }
    renderTree();
  };
  caret.addEventListener('click', toggle);
  label.addEventListener('click', toggle);

  row.append(cb, caret, iconEl, label);
  wrap.appendChild(row);

  if (isOpen) {
    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tr-children';
    renderChildren(node, childrenWrap);
    wrap.appendChild(childrenWrap);
  }
  return wrap;
}

function renderFile(node: FileNode): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tr';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = node.item.selected;
  cb.addEventListener('change', e => {
    node.item.selected = (e.target as HTMLInputElement).checked;
    renderTree();
  });

  const spacer = document.createElement('span');
  spacer.className = 'caret spacer';

  const iconEl = document.createElement('span');
  iconEl.className = `t-icon ${node.item.isBinary ? 'bin' : 'file'}`;
  iconEl.appendChild(icon(node.item.isBinary ? 'paperclip' : 'file', 16));

  const label = document.createElement('span');
  label.className = 't-label';
  label.appendChild(highlightLabel(node.name));
  label.title = node.path;

  const size = document.createElement('span');
  size.className = 't-size';
  size.textContent = formatSize(node.item.file.size);

  row.append(cb, spacer, iconEl, label, size);

  if (node.item.isBinary) {
    const badge = document.createElement('span');
    badge.className = 't-badge bin';
    badge.textContent = 'raw';
    row.appendChild(badge);
  }

  const removeBtn = document.createElement('span');
  removeBtn.className = 't-remove';
  removeBtn.appendChild(icon('x', 13));
  removeBtn.addEventListener('click', e => {
    e.stopPropagation();
    state.allFiles = state.allFiles.filter(f => f.path !== node.item.path);
    renderTree();
  });
  row.appendChild(removeBtn);

  return row;
}
