import { extractCurrentQuestion, formatQuestion } from './parser';

const COPY_SVG = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
const CHECK_SVG = '<path d="M20 6L9 17l-5-5"></path>';

export function ensureCopyButton() {
    const headerCols = document.querySelectorAll('.maindivheader .row .text-right');
    if (headerCols.length === 0) return;

    const headerCol = headerCols[headerCols.length - 1];
    if (headerCol.querySelector('.copy-md-btn')) return;

    const btn = document.createElement('span');
    btn.className = 'copy-md-btn';
    btn.title = 'Copy Markdown';
    btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;margin-left:10px;cursor:pointer;';
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COPY_SVG}</svg>`;

    btn.onclick = async () => {
        const q = extractCurrentQuestion(1);
        if (!q) return;

        const md = formatQuestion(q);
        try {
            await navigator.clipboard.writeText(md);
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.innerHTML = CHECK_SVG;
                setTimeout(() => { svg.innerHTML = COPY_SVG; }, 2000);
            }
        } catch (err) {
            console.error('[Guidely+] Clipboard write failed:', err);
        }
    };

    headerCol.appendChild(btn);
}
