import { Crawler } from './crawler';

export function ensureCopyButton() {
    const headerCols = document.querySelectorAll('.solheader-col');
    if (headerCols.length === 0) return;
    
    const headerCol = headerCols[0];
    
    if (headerCol.querySelector('.copy-md-btn')) return;

    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'copy-md-btn';
    btnWrapper.title = 'Copy Markdown';
    
    btnWrapper.innerHTML = `
        <button type="button" class="button btn-save-qn" style="display:flex;align-items:center;justify-content:center;margin-left:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        </button>
    `;

    btnWrapper.onclick = async () => {
        const crawler = new Crawler(() => {}, () => {}, () => {});
        const md = crawler.extractSingleQuestionMarkdown();
        if (md) {
            try {
                await navigator.clipboard.writeText(md);
                const svg = btnWrapper.querySelector('svg');
                if (svg) {
                    svg.innerHTML = '<path d="M20 6L9 17l-5-5"></path>';
                    setTimeout(() => {
                        svg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
                    }, 2000);
                }
            } catch (err) {
                console.error('[OB+] Clipboard write failed:', err);
            }
        }
    };

    const saveQs = headerCol.querySelector('.save-qs');
    if (saveQs) {
        saveQs.parentNode?.insertBefore(btnWrapper, saveQs);
    } else {
        headerCol.appendChild(btnWrapper);
    }
}
