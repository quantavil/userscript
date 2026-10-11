import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

let instance: TurndownService | null = null;

export function getTurndownService(): TurndownService {
    if (!instance) {
        instance = new TurndownService({
            headingStyle: 'atx',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
        });
        instance.use(gfm);

        // Custom rule for Oliveboard fractions
        instance.addRule('fractions', {
            filter: function (node) {
                if (node.nodeName === 'DIV') {
                    const el = node as HTMLElement;
                    const style = el.getAttribute('style') || '';
                    if (style.includes('inline-block') && style.includes('vertical-align: middle')) {
                        const spans = Array.from(el.children).filter(n => n.nodeName === 'SPAN');
                        if (spans.length >= 2) {
                            return true;
                        }
                    }
                }
                return false;
            },
            replacement: function (_content, node) {
                const el = node as HTMLElement;
                const spans = Array.from(el.children).filter(n => n.nodeName === 'SPAN');
                let num = spans[0].textContent?.trim() || '';
                let den = spans[spans.length - 1].textContent?.trim() || '';
                return ` (${num}/${den}) `;
            }
        });
    }
    return instance;
}
