export function onReady(callback: () => void) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(callback, 1);
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

export function enableCopy() {
  const style = document.createElement('style');
  style.innerHTML = `
    * {
      user-select: auto !important;
      -webkit-user-select: auto !important;
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('contextmenu', (e) => e.stopPropagation(), true);
  document.addEventListener('copy', (e) => e.stopPropagation(), true);
  document.addEventListener('selectstart', (e) => e.stopPropagation(), true);
}

export function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
