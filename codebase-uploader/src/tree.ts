import { TreeNode, FolderNode, FileNode, FileObj } from './types';
import { allFiles, openFolders, searchQ, setAllFiles, addOpenFolder, removeOpenFolder, $, shadowRoot } from './state';
import { updateStats } from './uploader';

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

export function nodeCheckState(node: TreeNode): number {
  if (!node.isFolder) return node.item.selected ? 1 : 0;
  const vals = [...node.children.values()].map(nodeCheckState);
  if (!vals.length) return 0;
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum === vals.length ? 1 : sum === 0 ? 0 : 0.5;
}

export function setNodeChecked(node: TreeNode, val: boolean): void {
  if (!node.isFolder) {
    node.item.selected = val;
    return;
  }
  for (const c of node.children.values()) setNodeChecked(c, val);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function highlightLabel(text: string): Node {
  if (!searchQ) return document.createTextNode(text);
  const idx = text.toLowerCase().indexOf(searchQ);
  if (idx < 0) return document.createTextNode(text);
  const span = document.createElement('span');
  span.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement('mark');
  mark.textContent = text.slice(idx, idx + searchQ.length);
  span.appendChild(mark);
  span.appendChild(document.createTextNode(text.slice(idx + searchQ.length)));
  return span;
}

export function renderTree(): void {
  const treePane = $('cu-tree-pane');
  const treeList = $('cu-tree-list');
  if (!treePane || !treeList) return;

  const scrollTop = treePane.scrollTop;
  const activeEl = shadowRoot?.activeElement as HTMLElement | null;
  const activePath = activeEl?.getAttribute('data-path');
  const activeType = activeEl?.getAttribute('data-type');

  if (!allFiles.length) {
    treePane.classList.add('cu-empty');
    treeList.innerHTML = '';
    updateStats();
    return;
  }

  treePane.classList.remove('cu-empty');
  const tree = buildTree(allFiles);
  const frag = document.createDocumentFragment();
  renderChildren(tree, frag);
  treeList.innerHTML = '';
  treeList.appendChild(frag);
  updateStats();

  // Restore scroll
  treePane.scrollTop = scrollTop;

  // Restore focus
  if (activePath && activeType && shadowRoot) {
    const selector = `[data-path="${CSS.escape(activePath)}"][data-type="${activeType}"]`;
    const newActive = shadowRoot.querySelector(selector) as HTMLElement | null;
    newActive?.focus();
  }
}

export function renderChildren(node: FolderNode, container: HTMLElement | DocumentFragment): void {
  const sorted = [...node.children.values()].sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of sorted) {
    if (searchQ && !child.path.toLowerCase().includes(searchQ)) continue;
    container.appendChild(child.isFolder ? renderFolder(child) : renderFile(child));
  }
}

export function renderFolder(node: FolderNode): HTMLDivElement {
  const wrap = document.createElement('div');
  const isOpen = openFolders.has(node.path);

  const row = document.createElement('div');
  row.className = 'tr';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.setAttribute('data-path', node.path);
  cb.setAttribute('data-type', 'cb');
  const state = nodeCheckState(node);
  cb.checked = state === 1;
  cb.indeterminate = state === 0.5;
  cb.addEventListener('change', e => {
    setNodeChecked(node, (e.target as HTMLInputElement).checked);
    renderTree();
  });

  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.textContent = isOpen ? '▾' : '▸';

  const icon = document.createElement('span');
  icon.className = 't-icon';
  icon.textContent = isOpen ? '📂' : '📁';

  const label = document.createElement('span');
  label.className = 't-label';
  label.appendChild(highlightLabel(node.name));

  const toggle = () => {
    if (openFolders.has(node.path)) {
      removeOpenFolder(node.path);
    } else {
      addOpenFolder(node.path);
    }
    renderTree();
  };
  caret.addEventListener('click', toggle);
  label.addEventListener('click', toggle);

  row.append(cb, caret, icon, label);
  wrap.appendChild(row);

  if (isOpen) {
    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tr-children';
    renderChildren(node, childrenWrap);
    wrap.appendChild(childrenWrap);
  }
  return wrap;
}

export function renderFile(node: FileNode): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tr';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.setAttribute('data-path', node.item.path);
  cb.setAttribute('data-type', 'cb');
  cb.checked = node.item.selected;
  cb.addEventListener('change', e => {
    node.item.selected = (e.target as HTMLInputElement).checked;
    updateStats();
  });

  const caret = document.createElement('span');
  caret.className = 'caret';

  const icon = document.createElement('span');
  icon.className = 't-icon';
  icon.textContent = node.item.isBinary ? '📎' : '📄';

  const label = document.createElement('span');
  label.className = 't-label';
  label.appendChild(highlightLabel(node.name));
  label.title = node.path;

  const size = document.createElement('span');
  size.className = 't-size';
  size.textContent = formatSize(node.item.file.size);

  if (node.item.isBinary) {
    const badge = document.createElement('span');
    badge.className = 't-badge bin';
    badge.textContent = 'raw';
    row.append(cb, caret, icon, label, size, badge);
  } else {
    row.append(cb, caret, icon, label, size);
  }

  const removeBtn = document.createElement('span');
  removeBtn.className = 't-remove';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', e => {
    e.stopPropagation();
    setAllFiles(allFiles.filter(f => f.path !== node.item.path));
    renderTree();
  });
  row.appendChild(removeBtn);

  return row;
}
