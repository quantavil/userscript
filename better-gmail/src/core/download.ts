import { GM_download } from '$';

export type Attachment = { url: string; filename: string };

const gapMs = 400;

// Chrome blocks repeated programmatic anchor downloads from one page (it asks to "allow multiple
// downloads" and silently drops the rest until you do), so this is only the fallback.
async function anchorDownload(file: Attachment): Promise<void> {
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  await new Promise((resolve) => window.setTimeout(resolve, gapMs));
}

/** Downloads through the userscript manager, which is not subject to that block; falls back to an anchor. */
export function saveFile(file: Attachment): Promise<void> {
  if (typeof GM_download !== 'function') return anchorDownload(file);
  return new Promise((resolve) => {
    const fallback = () => void anchorDownload(file).then(resolve);
    try {
      GM_download({
        url: file.url,
        name: file.filename,
        saveAs: false,
        onload: () => resolve(),
        onerror: fallback,
        ontimeout: fallback,
      });
    } catch {
      fallback();
    }
  });
}
