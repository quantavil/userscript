import { extractCurrentQuestion } from './extractor';

const MAX_QUESTIONS_PER_SECTION = 300; // B6: iteration cap

export class Crawler {
    private markdown = '';  // R3: no dead initializer
    private isRunning = false;

    constructor(
        private onProgress: (msg: string) => void,
        private onFinish: (md: string) => void,
        private onError: (msg: string) => void, // B1: dedicated error callback
    ) {}

    public cancel() {
        this.isRunning = false;
        this.onProgress('Cancelling...');
    }

    private wait(ms: number) {
        return new Promise(res => setTimeout(res, ms));
    }

    // B4: scoped to Testbook-specific containers
    private getSections(): HTMLElement[] {
        return Array.from(
            document.querySelectorAll('.tp-test-sections .nav-tabs li, .sections-tabs li, .section-list li')
        ).filter(el => {
            const t = el.textContent?.trim().toLowerCase() || '';
            return t.length > 0 && !t.includes('instruction');
        }) as HTMLElement[];
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.markdown = '# Testbook Paper\n\n';

        try {
            const sections = this.getSections();
            let lastCompHtml = '';
            let currentSectionName = '';

            if (sections.length > 0) {
                this.onProgress('Starting crawler (Section mode)...');
                for (let i = 0; i < sections.length; i++) {
                    const sec = sections[i];
                    sec.click();
                    await this.wait(1000);
                    
                    const secName = sec.textContent?.trim() || `Section ${i + 1}`;
                    if (secName !== currentSectionName) {
                        this.markdown += `# ${secName}\n\n`;
                        currentSectionName = secName;
                    }

                    lastCompHtml = await this.crawlCurrentSectionQuestions(secName, lastCompHtml);
                }
            } else {
                this.onProgress('Starting crawler (Single section mode)...');
                await this.crawlCurrentSectionQuestions('Paper', lastCompHtml);
            }

            this.onFinish(this.markdown);
        } catch (e) {
            console.error('[TB-MD] Crawl error:', e);
            // B1: call onError so UI transitions to error state
            this.onError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            this.isRunning = false;
        }
    }

    private async crawlCurrentSectionQuestions(sectionName: string, startComp: string): Promise<string> {
        let qIdxInSec = 1;
        let lastMd = '';
        let currentComp = startComp;

        // B3: hold current extraction to avoid double-parse
        let current = extractCurrentQuestion(qIdxInSec, currentComp);

        while (qIdxInSec <= MAX_QUESTIONS_PER_SECTION) { // B6: iteration cap
            const { md, compHtml, qNum } = current;
            if (compHtml) currentComp = compHtml;

            if (md && md !== lastMd) {
                this.markdown += md;
                lastMd = md;
            }

            this.onProgress(`Extracting ${sectionName}: Q${qNum}`);

            // Check for end of test popup
            const popup = Array.from(document.querySelectorAll('.modal, .popup, .alert, .bootbox')).find(el => {
                const txt = (el.textContent || '').toLowerCase();
                const isVisible = (el as HTMLElement).style.display !== 'none' && !el.classList.contains('ng-hide');
                return isVisible && (txt.includes('last question') || txt.includes('first question') || txt.includes('end of'));
            });
            
            if (popup) {
                const closeBtn = popup.querySelector('button[data-dismiss="modal"], .close, .btn-primary, button') as HTMLElement;
                if (closeBtn) closeBtn.click();
                return currentComp;
            }

            const nextBtn = this.findNextButton();
            if (!nextBtn || (nextBtn as HTMLButtonElement).disabled || nextBtn.classList.contains('disabled')) {
                return currentComp;
            }

            nextBtn.click();
            await this.wait(800);

            // B3: extract once, reuse at loop top
            const nextCheck = extractCurrentQuestion(qIdxInSec + 1, currentComp);
            if (nextCheck.md === md || !this.isRunning) {
                return currentComp; // Stuck, reached end, or cancelled
            }
            
            qIdxInSec++;
            current = nextCheck; // Reuse — no double parse
        }

        return currentComp;
    }

    private findNextButton(): HTMLElement | null {
        const els = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        for (const el of els) {
            const txt = (el.textContent || '').trim().toLowerCase();
            if (txt === 'next' || txt === 'save & next') {
                return el as HTMLElement;
            }
            if (el.querySelector('.fa-chevron-right') || el.querySelector('.fa-angle-right')) {
                const parent = el.parentElement;
                if (parent && (parent.className.includes('pagination') || parent.className.includes('palette'))) continue;
                return el as HTMLElement;
            }
        }
        // B5: tightened fallback — only match nextQuestion, not generic "next"
        return document.querySelector('.next-btn, .btn-next, [ng-click*="nextQuestion"]') as HTMLElement;
    }
}