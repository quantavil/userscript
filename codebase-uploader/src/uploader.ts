import { FileObj, DroppedFile } from './types';
import { TEXT_EXTS, BINARY_EXTS, TEXT_FILENAMES, SITE_SELECTORS } from './constants';
import { settings, getIgnoreFolders, getIgnoreExts } from './settings';
import { state, $, showToast } from './state';
import { formatSize } from './tree';

export function isBinaryFile(name: string): boolean {
  const filename = (name || '').split('/').pop()!.toLowerCase();
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : '';
  if (TEXT_EXTS.has(ext)) return false;
  if (BINARY_EXTS.has(ext)) return true;
  if (TEXT_FILENAMES.has(filename)) return false;
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
      if (!TEXT_FILENAMES.has(filename) && !TEXT_EXTS.has(ext) && !BINARY_EXTS.has(ext)) return true;
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
    const isBin = isBinaryFile(path);
    if (isBin && !settings.includeBinary) { skipped++; continue; }

    newFiles.push({ file, path, selected: true, isBinary: isBin });
    added++;
  }

  if (added > 0 || newFiles.length !== state.allFiles.length) {
    state.allFiles = newFiles;
  }
  const statsEl = $('cu-stats');
  if (statsEl) {
    if (added > 0 && skipped > 0) statsEl.textContent = `Added ${added} file(s), skipped ${skipped}.`;
    else if (added > 0) statsEl.textContent = `Added ${added} file(s).`;
    else if (skipped > 0) statsEl.textContent = `Skipped ${skipped} file(s).`;
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
    try { content = await file.text(); } catch (_) { content = `[binary or unreadable — skipped]`; }
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    const block = `## File: \`${path}\`\n\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`;

    if (parts.length > 0 && currentChars + block.length > settings.maxChunkChars) flush();
    parts.push(block);
    currentChars += block.length;
  }
  flush();

  const fileLines = [
    ...textFiles.map(f => `- \`${f.path}\``),
    ...binaryFiles.map(f => `- \`${f.path}\` (binary)`)
  ];

  // Include custom prompt if defined in settings
  const customPromptSection = settings.customPrompt ? `${settings.customPrompt.trim()}\n\n` : '';
  const manifest = `# Codebase Manifest\n${customPromptSection}- **Total files:** ${textFiles.length + binaryFiles.length}\n- **Chunks:** ${chunks.length}\n\n## File list\n${fileLines.join('\n')}`;
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

function downloadFiles(files: File[]): void {
  files.forEach(f => {
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

  statsEl.textContent = `${active.length}/${state.allFiles.length} files · ${textActive.length} text, ${binActive.length} bin · ${formatSize(totalBytes)}`;

  if (!active.length) {
    chunkEstimate.textContent = '—';
    chunkEstimate.className = '';
    return;
  }

  const estChunks = Math.max(1, Math.ceil((textActive.reduce((a, f) => a + f.file.size, 0) + textActive.length * 100) / settings.maxChunkChars));
  const estTotal = estChunks + binActive.length;
  chunkEstimate.textContent = `~${estTotal} upload${estTotal !== 1 ? 's' : ''}`;
  chunkEstimate.className = estTotal > settings.maxChunks ? 'danger' : estTotal > settings.maxChunks * 0.7 ? 'warn' : '';
}

export async function run(downloadMode: boolean = false): Promise<void> {
  const statsEl = $('cu-stats');
  const overlay = $('cu-overlay');

  const files = state.allFiles.filter(f => f.selected);
  if (!files.length) {
    showToast('Select at least one file first.');
    return;
  }

  const textFiles = files.filter(f => !f.isBinary);
  const binaryFiles = files.filter(f => f.isBinary);

  if (statsEl) statsEl.textContent = `Building ${textFiles.length} chunks…`;
  const chunks = (textFiles.length || binaryFiles.length) ? await buildChunks(textFiles, binaryFiles) : [];
  const rawFiles = binaryFiles.map(f => f.file);
  const allUploads = [...chunks, ...rawFiles];

  if (!allUploads.length) {
    if (statsEl) statsEl.textContent = 'Nothing to upload.';
    return;
  }

  const doDownload = () => {
    const mdFiles = allUploads.filter(f => f.name.endsWith('.md'));
    const others = allUploads.filter(f => !f.name.endsWith('.md'));
    const downloads = mdFiles.length
      ? [new File(mdFiles.flatMap((f, i) => i ? ['\n\n---\n\n', f] : [f]), 'codebase_combined.md', { type: 'text/markdown' }), ...others]
      : others;
    downloadFiles(downloads);
    showToast(`Downloaded ${downloads.length} file(s).`);
    if (statsEl) statsEl.textContent = `Downloaded ${downloads.length} file(s).`;
  };

  if (allUploads.length > settings.maxChunks) {
    if (confirm(`${allUploads.length} uploads exceeds limit of ${settings.maxChunks}.\n\nDownload combined files instead?`)) {
      doDownload();
    } else if (statsEl) {
      statsEl.textContent = `Too many uploads (${allUploads.length}). Deselect some or raise the limit.`;
    }
    return;
  }

  if (downloadMode) { doDownload(); return; }

  const injected = injectToChat(allUploads);
  if (injected) {
    if (overlay) overlay.classList.remove('open');
    showToast(`Uploaded ${allUploads.length} item(s)!`);
    if (statsEl) statsEl.textContent = `Uploaded ${allUploads.length} item(s).`;
  } else {
    showToast('No chat input found — downloading instead.');
    if (statsEl) statsEl.textContent = 'No chat input — downloading.';
    doDownload();
  }
}
