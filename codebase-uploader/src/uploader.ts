import { FileObj, DroppedFile } from './types';
import { TEXT_EXTS, BINARY_EXTS, TEXT_FILENAMES, SITE_SELECTORS } from './constants';
import { settings, getIgnoreFolders, getIgnoreExts } from './settings';
import { state, $, showToast, showConfirm } from './state';
import { formatSize, invalidateTreeCache } from './tree';

export function isBinaryFile(name: string, mimeType?: string): boolean {
  const segments = (name || '').split('/');
  const filename = segments[segments.length - 1].toLowerCase();
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : '';
  if (TEXT_EXTS.has(ext)) return false;
  if (BINARY_EXTS.has(ext)) return true;
  if (TEXT_FILENAMES.has(filename)) return false;
  if (mimeType) {
    if (mimeType.startsWith('text/')) return false;
    if (['application/json', 'application/xml', 'application/javascript',
      'application/typescript', 'application/x-yaml', 'application/yaml',
      'application/toml', 'application/x-sh'].includes(mimeType)) return false;
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') || mimeType === 'application/octet-stream' ||
      mimeType.startsWith('application/zip') || mimeType === 'application/pdf' ||
      mimeType.startsWith('application/vnd.')) return true;
  }
  return false;
}

export function shouldSkip(path: string, size: number): boolean {
  const segs = path.split('/');
  
  if (settings.skipHidden) {
    if (segs.slice(0, -1).some(s => s.startsWith('.'))) return true;
    
    const filename = segs[segs.length - 1].toLowerCase();
    if (filename.startsWith('.')) {
      const dotIdx = filename.lastIndexOf('.');
      const ext = dotIdx >= 0 ? filename.slice(dotIdx) : '';
      const isWanted = TEXT_FILENAMES.has(filename) || TEXT_EXTS.has(ext) || BINARY_EXTS.has(ext);
      if (!isWanted) return true;
    }
  }

  if (segs.some(s => getIgnoreFolders().has(s.toLowerCase()))) return true;

  const name = segs[segs.length - 1].toLowerCase();
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx >= 0 ? name.slice(dotIdx) : '';
  if (getIgnoreExts().has(ext) || getIgnoreExts().has(name)) return true;

  if (size > settings.maxFileBytes) return true;
  return false;
}

export function ingestFiles(fileObjs: DroppedFile[]): void {
  const existingPaths = new Set(state.allFiles.map(f => f.path));
  let added = 0, skipped = 0;
  const newFiles = [...state.allFiles];

  for (const { file, path } of fileObjs) {
    if (shouldSkip(path, file.size)) { skipped++; continue; }
    if (existingPaths.has(path)) continue;

    existingPaths.add(path);
    const isBin = isBinaryFile(path, file.type);
    if (isBin && !settings.includeBinary) { skipped++; continue; }

    newFiles.push({ file, path, selected: true, isBinary: isBin });
    added++;
  }

  if (added > 0 || newFiles.length !== state.allFiles.length) {
    state.allFiles = newFiles;
    invalidateTreeCache();
  }
  const statsEl = $('cu-stats');
  if (statsEl) {
    if (added > 0 && skipped > 0) {
      statsEl.textContent = `Added ${added} file(s), skipped ${skipped} based on settings.`;
    } else if (added > 0) {
      statsEl.textContent = `Added ${added} file(s).`;
    } else if (skipped > 0) {
      statsEl.textContent = `Skipped ${skipped} file(s) based on settings.`;
    }
  }
}


export async function buildChunks(textFiles: FileObj[], binaryFiles: FileObj[] = []): Promise<File[]> {
  const chunks: File[] = [];
  let chunkNum = 1;
  let parts: string[] = [];
  let currentChars = 0;

  const flush = () => {
    if (!parts.length) return;
    chunks.push(new File([`# Codebase Context — Part ${chunkNum}\n\n` + parts.join('')], `codebase_part_${chunkNum}.md`, { type: 'text/markdown' }));
    chunkNum++;
    parts = [];
    currentChars = 0;
  };

  for (const { file, path } of textFiles) {
    let content: string;
    try {
      content = await file.text();
    } catch (_) {
      content = `[binary or unreadable content — skipped]`;
    }
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    const block = `## File: \`${path}\`\n\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`;

    if (parts.length > 0 && currentChars + block.length > settings.maxChunkChars) flush();

    parts.push(block);
    currentChars += block.length;
  }
  flush();

  const totalFiles = textFiles.length + binaryFiles.length;
  const fileLines = [
    ...textFiles.map(f => `- \`${f.path}\``),
    ...binaryFiles.map(f => `- \`${f.path}\` (binary)`)
  ];

  const manifest = `# Codebase Manifest\n- **Total files:** ${totalFiles}\n- **Chunks:** ${chunks.length}\n\n## File list\n${fileLines.join('\n')}`;
  chunks.unshift(new File([manifest], 'codebase_manifest.md', { type: 'text/markdown' }));

  return chunks;
}

export function injectToChat(files: File[]): boolean {
  for (const sel of SITE_SELECTORS) {
    const elElement = document.querySelector(sel) as HTMLInputElement | null;
    if (elElement) {
      try {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        elElement.files = dt.files;
        elElement.dispatchEvent(new Event('change', { bubbles: true }));
        elElement.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } catch (_) {}
    }
  }
  return false;
}

export function downloadFiles(files: File[]): void {
  files.forEach((f) => {
    const url = URL.createObjectURL(f);
    const a = Object.assign(document.createElement('a'), { href: url, download: f.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
}

export function updateStats(): void {
  const statsEl = $('cu-stats');
  const chunkEstimate = $('cu-chunk-estimate');
  if (!statsEl || !chunkEstimate) return;

  const active = state.allFiles.filter(f => f.selected);
  const textActive = active.filter(f => !f.isBinary);
  const binActive = active.filter(f => f.isBinary);
  const totalBytes = active.reduce((a, f) => a + f.file.size, 0);

  statsEl.textContent = `${active.length} / ${state.allFiles.length} files selected  ·  ${textActive.length} text, ${binActive.length} binary  ·  ${formatSize(totalBytes)} raw`;

  if (!active.length) {
    chunkEstimate.textContent = '—';
    chunkEstimate.className = '';
    return;
  }

  const estTextChars = textActive.reduce((a, f) => a + f.file.size, 0) + textActive.length * 100;
  const estChunks = Math.max(1, Math.ceil(estTextChars / settings.maxChunkChars));
  const estTotal = estChunks + binActive.length;
  chunkEstimate.textContent = `~${estTotal} upload${estTotal !== 1 ? 's' : ''} (${estChunks} chunk${estChunks !== 1 ? 's' : ''} + ${binActive.length} raw)`;
  chunkEstimate.className = estTotal > settings.maxChunks ? 'danger' : estTotal > settings.maxChunks * 0.7 ? 'warn' : '';
}

export function combineMarkdownFiles(files: File[]): File {
  const parts: any[] = [];
  files.forEach((f, idx) => {
    if (idx > 0) parts.push('\n\n---\n\n');
    parts.push(f);
  });
  return new File(parts, 'codebase_combined.md', { type: 'text/markdown' });
}

export async function run(downloadMode: boolean = false): Promise<void> {
  const statsEl = $('cu-stats');
  const fab = $('cu-fab');
  const overlay = $('cu-overlay');

  const files = state.allFiles.filter(f => f.selected);
  if (!files.length) {
    showToast('Select at least one file first.');
    return;
  }

  const textFiles = files.filter(f => !f.isBinary);
  const binaryFiles = files.filter(f => f.isBinary);

  if (statsEl) statsEl.textContent = `Building chunks from ${textFiles.length} text file(s)…`;
  const chunks = (textFiles.length || binaryFiles.length) ? await buildChunks(textFiles, binaryFiles) : [];
  const rawFiles = binaryFiles.map(f => f.file);
  const allUploads = [...chunks, ...rawFiles];

  if (!allUploads.length) {
    if (statsEl) statsEl.textContent = 'Nothing to upload.';
    return;
  }

  const proceedWithDownload = () => {
    const markdownFiles = allUploads.filter(f => f.name.endsWith('.md'));
    const nonMarkdownFiles = allUploads.filter(f => !f.name.endsWith('.md'));
    const downloads = markdownFiles.length ? [combineMarkdownFiles(markdownFiles), ...nonMarkdownFiles] : nonMarkdownFiles;
    downloadFiles(downloads);
    showToast(`Downloaded ${downloads.length} file(s).`);
    if (statsEl) statsEl.textContent = `Downloaded ${downloads.length} file(s).`;
  };

  if (allUploads.length > settings.maxChunks) {
    showConfirm(
      `${allUploads.length} uploads exceeds your limit of ${settings.maxChunks}.\n\nDownload combined files instead?`,
      proceedWithDownload,
      () => {
        if (statsEl) statsEl.textContent = `Too many uploads (${allUploads.length}). Deselect some or raise the limit in ⚙ Settings.`;
      }
    );
    return;
  }

  if (downloadMode) {
    proceedWithDownload();
    return;
  }

  const injected = injectToChat(allUploads);
  if (injected) {
    if (overlay) overlay.classList.remove('open');
    if (fab && settings.showFab) {
      fab.classList.add('success');
      setTimeout(() => fab.classList.remove('success'), 2000);
    }
    showToast(`Uploaded ${allUploads.length} item(s) successfully!`);
    if (statsEl) statsEl.textContent = `Uploaded ${allUploads.length} item(s) (${chunks.length} chunk(s) + ${rawFiles.length} raw).`;
  } else {
    showToast('No chat input found — downloading instead.');
    if (statsEl) statsEl.textContent = 'No chat file input found — downloading instead.';
    proceedWithDownload();
  }
}
