import { GM_download } from '$';
import type { Attachment } from '../features/attachments';

async function browserDownload(file: Attachment): Promise<void> {
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
}

export function saveFile(file: Attachment): Promise<void> {
  if (typeof GM_download !== 'function') return browserDownload(file);
  return new Promise((resolve, reject) => {
    let settled = false;
    const fallback = (): void => {
      if (settled) return;
      settled = true;
      void browserDownload(file).then(resolve, reject);
    };
    try {
      GM_download({
        url: file.url,
        name: file.filename,
        saveAs: false,
        onload: () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        },
        onerror: fallback,
        ontimeout: fallback,
      });
    } catch {
      fallback();
    }
  });
}
