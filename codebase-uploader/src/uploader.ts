import { FileObj, DroppedFile } from './types';
import { TEXT_EXTS, BINARY_EXTS, TEXT_FILENAMES, SITE_SELECTORS } from './constants';
import { settings, getIgnoreFolders, getIgnoreExts } from './settings';
import { allFiles, setAllFiles, $ } from './state';

export function isBinaryFile(name: string, mimeType?: string): boolean {
  const lower = (name || '').toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  const ext = dotIdx > 0 ? lower.slice(dotIdx) : '';
  if (TEXT_EXTS.has(ext)) return false;
  if (BINARY_EXTS.has(ext)) return true;
  if (TEXT_FILENAMES.has(lower)) return false;
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
  if (settings.skipHidden && segs.some(s => s.startsWith('.'))) return true;
  if (segs.some(s => getIgnoreFolders().has(s.toLowerCase()))) return true;

  const name = segs[segs.length - 1].toLowerCase();
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx >= 0 ? name.slice(dotIdx) : '';
  if (getIgnoreExts().has(ext) || getIgnoreExts().has(name)) return true;

  if (size > settings.maxFileBytes) return true;
  return false;
}

export function ingestFiles(fileObjs: DroppedFile[]): void {
  const existingPaths = new Set(allFiles.map(f => f.path));
  let added = 0, skipped = 0;
  const newFiles = [...allFiles];

  for (const { file, path } of fileObjs) {
    if (shouldSkip(path, file.size)) { skipped++; continue; }
    if (existingPaths.has(path)) continue;

    existingPaths.add(path);
    const isBin = isBinaryFile(path, file.type);
    if (isBin && !settings.includeBinary) { skipped++; continue; }

    newFiles.push({ file, path, selected: true, isBinary: isBin });
    added++;
  }

  if (added > 0 || newFiles.length !== allFiles.length) {
    setAllFiles(newFiles);
  }
  const statsEl = $('cu-stats');
  if (skipped > 0 && added === 0 && statsEl) {
    statsEl.textContent = `Skipped ${skipped} file(s) based on current settings. Adjust in ⚙ Settings.`;
  }
}

export function guessFenceLang(path: string): string {
  if (!settings.fenceLangFromExt) return '';
  const name = path.split('/').pop()?.toLowerCase() || '';
  if (!name) return '';
  const dotIdx = name.lastIndexOf('.');
  return dotIdx > 0 ? name.slice(dotIdx + 1) : name;
}

export async function buildChunks(files: FileObj[]): Promise<File[]> {
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

  for (const { file, path } of files) {
    let content: string;
    try {
      content = await file.text();
    } catch (_) {
      content = `[binary or unreadable content — skipped]`;
    }
    const lang = guessFenceLang(path);
    const block = `## File: \`${path}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;

    if (parts.length > 0 && currentChars + block.length > settings.maxChunkChars) flush();

    parts.push(block);
    currentChars += block.length;
  }
  flush();

  const manifest = `# Codebase Manifest\n- **Total files:** ${files.length}\n- **Chunks:** ${chunks.length}\n\n## File list\n${files.map(f => `- \`${f.path}\``).join('\n')}`;
  chunks.unshift(new File([manifest], 'codebase_manifest.md', { type: 'text/markdown' }));

  return chunks;
}

export function injectToChat(files: File[]): boolean {
  const overlay = $('cu-overlay');
  for (const sel of SITE_SELECTORS) {
    const el = document.querySelector(sel) as HTMLInputElement | null;
    if (el && (!overlay || !overlay.contains(el))) {
      try {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        el.files = dt.files;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } catch (_) {}
    }
  }
  return false;
}

export function downloadFiles(files: File[]): void {
  files.forEach((f, i) => {
    setTimeout(() => {
      const url = URL.createObjectURL(f);
      const a = Object.assign(document.createElement('a'), { href: url, download: f.name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, i * 120);
  });
}

export function updateStats(): void {
  const statsEl = $('cu-stats');
  const chunkEstimate = $('cu-chunk-estimate');
  if (!statsEl || !chunkEstimate) return;

  const active = allFiles.filter(f => f.selected);
  const textActive = active.filter(f => !f.isBinary);
  const binActive = active.filter(f => f.isBinary);
  const totalBytes = active.reduce((a, f) => a + f.file.size, 0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  statsEl.textContent = `${active.length} / ${allFiles.length} files selected  ·  ${textActive.length} text, ${binActive.length} binary  ·  ${formatSize(totalBytes)} raw`;

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

export async function run(downloadMode: boolean = false): Promise<void> {
  const statsEl = $('cu-stats');
  const fab = $('cu-fab');
  const overlay = $('cu-overlay');

  const files = allFiles.filter(f => f.selected);
  if (!files.length) return alert('Select at least one file first.');

  const textFiles = files.filter(f => !f.isBinary);
  const binaryFiles = files.filter(f => f.isBinary);

  if (statsEl) statsEl.textContent = `Building chunks from ${textFiles.length} text file(s)…`;
  const chunks = textFiles.length ? await buildChunks(textFiles) : [];
  const rawFiles = binaryFiles.map(f => f.file);
  const allUploads = [...chunks, ...rawFiles];

  if (!allUploads.length) {
    if (statsEl) statsEl.textContent = 'Nothing to upload.';
    return;
  }

  if (allUploads.length > settings.maxChunks) {
    if (confirm(`${allUploads.length} uploads exceeds your limit of ${settings.maxChunks}.\n\nDownload all as files instead?`)) {
      downloadFiles(allUploads);
      if (statsEl) statsEl.textContent = `Downloaded ${allUploads.length} file(s).`;
    } else {
      if (statsEl) statsEl.textContent = `Too many uploads (${allUploads.length}). Deselect some or raise the limit in ⚙ Settings.`;
    }
    return;
  }

  if (downloadMode) {
    downloadFiles(allUploads);
    if (statsEl) statsEl.textContent = `Downloaded ${allUploads.length} file(s).`;
    return;
  }

  const injected = injectToChat(allUploads);
  if (injected) {
    if (overlay) overlay.classList.remove('open');
    if (fab) {
      fab.classList.add('success');
      setTimeout(() => fab.classList.remove('success'), 2000);
    }
    if (statsEl) statsEl.textContent = `Uploaded ${allUploads.length} item(s) (${chunks.length} chunk(s) + ${rawFiles.length} raw).`;
  } else {
    if (statsEl) statsEl.textContent = 'No chat file input found — downloading instead.';
    downloadFiles(allUploads);
  }
}
