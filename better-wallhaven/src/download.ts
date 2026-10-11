import { GM_download, GM_xmlhttpRequest } from '$';

/** Filename from a URL with fallback — single source for all download call sites. */
export function fileNameOf(url: string, fallback: string): string {
  const clean = url.split('?')[0]?.split('#')[0] ?? '';
  return clean.split('/').pop() || fallback;
}

export function dlFile(url: string, name: string) {
  const fallback = () => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'blob',
      onload(r) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(r.response);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 1000);
      }
    });
  };

  if (typeof GM_download === 'function') {
    try {
      GM_download({
        url,
        name,
        onerror: () => fallback(),
        ontimeout: () => fallback(),
      });
    } catch {
      fallback();
    }
  } else {
    fallback();
  }
}
