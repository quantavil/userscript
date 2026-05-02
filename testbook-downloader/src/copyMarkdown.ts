import { injectCSS, copyToClipboard } from './utils';
import { extractCurrentQuestion } from './extractor';

const CSS = `
#tb-copy-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  margin-left: 8px;
  border: none;
  background: transparent;
  color: #86A1AE;
  cursor: pointer;
  font-size: 13px;
  outline: none;
  position: relative;
  vertical-align: middle;
}
#tb-copy-md-btn:hover {
  color: #0AD0F4;
}
#tb-copy-md-btn svg {
  width: 15px;
  height: 15px;
  fill: currentColor;
}
#tb-copy-md-toast {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #1a7f37;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
#tb-copy-md-toast.show {
  opacity: 1;
}
#tb-copy-md-toast::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #1a7f37;
}
`;

export function ensureCopyButton() {
    injectCSS('tb-copy-md-style', CSS);

    const toolbar = document.querySelector('.tp-pos-neg-marks');
    if (!toolbar) return;
    if (toolbar.querySelector('#tb-copy-md-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'tb-copy-md-btn';
    btn.type = 'button';
    btn.title = 'Copy question to Markdown';
    btn.innerHTML = `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
      </svg>
    `;

    const toast = document.createElement('span');
    toast.id = 'tb-copy-md-toast';
    toast.textContent = 'Copied!';
    btn.appendChild(toast);

    if (toolbar.firstChild) {
        toolbar.insertBefore(btn, toolbar.firstChild);
    } else {
        toolbar.appendChild(btn);
    }

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            // Using existing extraction logic
            const { md } = extractCurrentQuestion(1, '');
            const ok = await copyToClipboard(md || 'No content found.');
            toast.textContent = ok ? 'Copied!' : 'Failed';
        } catch {
            toast.textContent = 'Error';
        }
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
    });
}
