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
    }
    return instance;
}
