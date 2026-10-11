export function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function enableCopyAndRightClick() {
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    const events = ['contextmenu', 'copy', 'cut', 'paste', 'selectstart'];
    events.forEach(evt => {
        window.addEventListener(evt, (e) => {
            e.stopPropagation();
        }, true);
    });
}

export function onReady(fn: () => void) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

export function getExportFilename(urlStr: string = window.location.href): string {
    try {
        const url = new URL(urlStr);
        const c = url.searchParams.get('c')?.trim();
        const testid = url.searchParams.get('testid')?.trim();
        if (c && testid) {
            return `Oliveboard_${c}_${testid}.md`;
        } else if (c) {
            return `Oliveboard_${c}.md`;
        } else if (testid) {
            return `Oliveboard_test_${testid}.md`;
        }
    } catch {
        // Fallback if URL parsing fails
    }
    return 'Oliveboard_Questions.md';
}

