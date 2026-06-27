import { FileObj, DroppedFile } from './types';
import { TEXT_EXTS, BINARY_EXTS, TEXT_FILENAMES, SITE_SELECTORS, LIMIT_WARNING_THRESHOLD, CHUNK_OVERHEAD_CHARS, REVOCATION_DELAY_MS } from './constants';
import { settings, ignoreFoldersSet, ignoreExtsSet } from './settings';
import { state, $, showToast, formatSize } from './state';

export function isBinaryFile(name: string): boolean {
  const filename = (name || '').split('/').pop()!.toLowerCase();
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : '';
  return BINARY_EXTS.has(ext);
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

  if (segs.some(s => ignoreFoldersSet.has(s.toLowerCase()))) return true;

  const name = segs[segs.length - 1].toLowerCase();
  if (ignoreExtsSet.has(name)) return true;

  // Support multi-dot extensions correctly (e.g. .min.js)
  for (const ignoreExt of ignoreExtsSet) {
    if (ignoreExt.startsWith('.') && name.endsWith(ignoreExt)) return true;
  }

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
    try { 
      content = await file.text(); 
    } catch (e) { 
      console.warn(`[Codebase Uploader] Failed to read text file ${path}:`, e);
      content = `[binary or unreadable — skipped]`; 
    }
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    
    // Split large files exceeding maxChunkChars
    const maxContentSize = Math.max(1000, settings.maxChunkChars - 300);
    let offset = 0;
    let partNum = 1;
    const isLarge = content.length > maxContentSize;

    while (offset < content.length || (offset === 0 && content.length === 0)) {
      const chunkContent = content.slice(offset, offset + maxContentSize);
      const displayPath = isLarge ? `${path} (Part ${partNum})` : path;
      const block = `## File: \`${displayPath}\`\n\n\`\`\`${ext}\n${chunkContent}\n\`\`\`\n\n`;

      if (parts.length > 0 && currentChars + block.length > settings.maxChunkChars) {
        flush();
      }
      parts.push(block);
      currentChars += block.length;

      offset += chunkContent.length;
      partNum++;
      if (chunkContent.length === 0) break; // empty file
    }
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

function findInShadows(selectors: string[], root: Document | ShadowRoot = document): HTMLElement | null {
  for (const sel of selectors) {
    const elElement = root.querySelector(sel);
    if (elElement instanceof HTMLElement) return elElement;
  }
  const elements = root.querySelectorAll('*');
  for (const elNode of elements as any) {
    if (elNode.shadowRoot) {
      const found = findInShadows(selectors, elNode.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

function findFileInput(): HTMLInputElement | null {
  return findInShadows(SITE_SELECTORS) as HTMLInputElement | null;
}

function findChatInput(): HTMLElement | null {
  const chatSelectors = [
    '#prompt-textarea',
    'textarea',
    '[contenteditable="true"]',
    'input[type="text"]',
  ];
  return findInShadows(chatSelectors);
}

export function injectToChat(files: File[]): boolean {
  if (window.location.hostname.includes('qwen.ai')) {
    return false;
  }

  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));

  // 1. Try file input injection first (standard and direct)
  const fileInput = findFileInput();
  if (fileInput) {
    try {
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch (e) {
      console.error('[Codebase Uploader] File input injection failed:', e);
    }
  }

  // 2. Fallback: Try dispatching a drag/drop event on the chat input container
  const chatInput = findChatInput();
  if (chatInput) {
    try {
      // Dispatch dragenter and dragover to trigger dropzone states
      chatInput.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
      chatInput.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      
      // Dispatch the drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt
      });
      chatInput.dispatchEvent(dropEvent);
      return true;
    } catch (e) {
      console.error('[Codebase Uploader] Drop event injection failed:', e);
    }
  }

  // 3. Last fallback: Dispatch drop event globally on document.body
  try {
    document.body.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
    document.body.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    document.body.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    }));
    return true;
  } catch (e) {
    console.error('[Codebase Uploader] Body drop event failed:', e);
  }

  return false;
}

function downloadFiles(files: File[]): void {
  files.forEach(f => {
    const url = URL.createObjectURL(f);
    const a = Object.assign(document.createElement('a'), { href: url, download: f.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOCATION_DELAY_MS);
  });
}

export function updateStats(): void {
  const statsEl = $('cu-stats');
  const chunkEstimate = $('cu-chunk-estimate');
  if (!statsEl || !chunkEstimate) return;

  const visible = state.allFiles.filter(f => !shouldSkip(f.path, f.file.size));
  const active = visible.filter(f => f.selected);
  const textActive = active.filter(f => !f.isBinary);
  const binActive = active.filter(f => f.isBinary);
  const totalBytes = active.reduce((a, f) => a + f.file.size, 0);

  statsEl.textContent = `${active.length}/${visible.length} files · ${textActive.length} text, ${binActive.length} bin · ${formatSize(totalBytes)}`;

  if (!active.length) {
    chunkEstimate.textContent = '—';
    chunkEstimate.className = '';
    return;
  }

  const estChunks = Math.max(1, Math.ceil((textActive.reduce((a, f) => a + f.file.size, 0) + textActive.length * CHUNK_OVERHEAD_CHARS) / settings.maxChunkChars));
  const estTotal = estChunks + binActive.length;
  chunkEstimate.textContent = `~${estTotal} upload${estTotal !== 1 ? 's' : ''}`;
  chunkEstimate.className = estTotal > settings.maxChunks ? 'danger' : estTotal > settings.maxChunks * LIMIT_WARNING_THRESHOLD ? 'warn' : '';
}

export async function run(mode: 'upload' | 'download' | 'copy' = 'upload'): Promise<void> {
  const statsEl = $('cu-stats');
  const overlay = $('cu-overlay');

  const visible = state.allFiles.filter(f => !shouldSkip(f.path, f.file.size));
  const files = visible.filter(f => f.selected);
  if (!files.length) {
    showToast('Select at least one file first.', 'error');
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

  const doCopy = async () => {
    const mdFiles = allUploads.filter(f => f.name.endsWith('.md'));
    if (mdFiles.length) {
      try {
        const contents = await Promise.all(mdFiles.map(f => f.text()));
        const combinedText = contents.join('\n\n---\n\n');
        await navigator.clipboard.writeText(combinedText);
        showToast('Copied codebase context to clipboard! Press Ctrl+V in prompt.', 'success');
        if (statsEl) statsEl.textContent = 'Copied to clipboard. Paste (Ctrl+V) in prompt.';
        if (overlay) overlay.classList.remove('open');
      } catch (err) {
        console.error('[Codebase Uploader] Failed to copy to clipboard:', err);
        showToast('Clipboard block — downloading files instead.', 'error');
        doDownload();
      }
    } else {
      showToast('No text files to copy.', 'error');
    }
  };

  if (allUploads.length > settings.maxChunks) {
    if (confirm(`${allUploads.length} uploads exceeds limit of ${settings.maxChunks}.\n\nDownload combined files instead?`)) {
      doDownload();
    } else if (statsEl) {
      statsEl.textContent = `Too many uploads (${allUploads.length}). Deselect some or raise the limit.`;
    }
    return;
  }

  if (mode === 'download') { doDownload(); return; }
  if (mode === 'copy') { await doCopy(); return; }

  const injected = injectToChat(allUploads);
  if (injected) {
    if (overlay) overlay.classList.remove('open');
    showToast(`Uploaded ${allUploads.length} item(s)!`);
    if (statsEl) statsEl.textContent = `Uploaded ${allUploads.length} item(s).`;
  } else {
    await doCopy();
  }
}
