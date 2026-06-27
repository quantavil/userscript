import { TreeNode, FolderNode, FileNode, FileObj } from './types';
import { state, $, formatSize } from './state';
import { updateStats, shouldSkip } from './uploader';
import { icon } from './icons';

let searchMatches = new Map<string, boolean>();

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

function precomputeMatches(node: TreeNode, query: string): boolean {
  if (!node.isFolder) {
    const match = node.path.toLowerCase().includes(query);
    searchMatches.set(node.path, match);
    return match;
  }
  let anyMatch = node.path.toLowerCase().includes(query);
  for (const child of node.children.values()) {
    if (precomputeMatches(child, query)) {
      anyMatch = true;
    }
  }
  searchMatches.set(node.path, anyMatch);
  return anyMatch;
}

export function renderTree(): void {
  const treePane = $('cu-tree-pane');
  const treeList = $('cu-tree-list');
  if (!treePane || !treeList) return;

  const scrollTop = treePane.scrollTop;

  // Filter state.allFiles dynamically based on skip settings
  const visibleFiles = state.allFiles.filter(f => !shouldSkip(f.path, f.file.size));

  if (!visibleFiles.length) {
    treePane.classList.add('cu-empty');
    treeList.textContent = '';
    updateStats();
    return;
  }

  treePane.classList.remove('cu-empty');
  const tree = buildTree(visibleFiles);

  searchMatches.clear();
  if (state.searchQ) {
    precomputeMatches(tree, state.searchQ);
  }

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
    if (state.searchQ && searchMatches.get(child.path) === false) continue;
    container.appendChild(child.isFolder ? renderFolder(child) : renderFile(child));
  }
}

function updateDescendantCheckboxes(cb: HTMLInputElement, checked: boolean): void {
  const row = cb.closest('.tr');
  if (!row) return;
  const wrap = row.parentElement;
  if (!wrap) return;
  const childrenWrap = wrap.querySelector('.tr-children');
  if (childrenWrap) {
    const childCbs = childrenWrap.querySelectorAll('input[type="checkbox"]');
    for (const childCb of childCbs as any) {
      childCb.checked = checked;
      childCb.indeterminate = false;
    }
  }
}

function updateAncestorCheckboxes(cb: HTMLInputElement): void {
  let cur = cb.closest('.tr-children');
  while (cur) {
    const parentWrap = cur.parentElement;
    if (!parentWrap) break;
    const parentCb = parentWrap.querySelector('.tr > input[type="checkbox"]') as HTMLInputElement | null;
    if (!parentCb) break;

    const siblingCbs = Array.from(cur.children)
      .map(child => child.classList.contains('tr') ? child.querySelector('input') : child.querySelector('.tr > input'))
      .filter(Boolean) as HTMLInputElement[];
    let checkedCount = 0;
    let indeterminateCount = 0;
    for (const scb of siblingCbs) {
      if (scb.checked) checkedCount++;
      if (scb.indeterminate) indeterminateCount++;
    }

    if (checkedCount === siblingCbs.length) {
      parentCb.checked = true;
      parentCb.indeterminate = false;
    } else if (checkedCount === 0 && indeterminateCount === 0) {
      parentCb.checked = false;
      parentCb.indeterminate = false;
    } else {
      parentCb.checked = false;
      parentCb.indeterminate = true;
    }

    cur = parentWrap.closest('.tr-children');
  }
}

function renderFolder(node: FolderNode): HTMLDivElement {
  const wrap = document.createElement('div');
  const hasMatch = state.searchQ && searchMatches.get(node.path) === true;
  const isOpen = state.openFolders.has(node.path) || !!hasMatch;

  const row = document.createElement('div');
  row.className = 'tr';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  const stateVal = nodeCheckState(node);
  cb.checked = stateVal === 1;
  cb.indeterminate = stateVal === 0.5;
  cb.addEventListener('change', e => {
    const checked = (e.target as HTMLInputElement).checked;
    setNodeChecked(node, checked);
    updateDescendantCheckboxes(cb, checked);
    updateAncestorCheckboxes(cb);
    updateStats();
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
    const checked = (e.target as HTMLInputElement).checked;
    node.item.selected = checked;
    updateAncestorCheckboxes(cb);
    updateStats();
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
