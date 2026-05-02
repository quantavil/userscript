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
        const selectors = [
            '.tp-test-sections .nav-tabs > li', 
            '.sections-tabs > li', 
            '.section-list > li',
            '#sectionNavTabs > li',
            '.sections-list > li'
        ];
        return Array.from(
            document.querySelectorAll(selectors.join(', '))
        ).filter(el => {
            if (el.classList.contains('dropdown-menu') || el.closest('.dropdown-menu')) return false;
            const t = el.textContent?.trim().toLowerCase() || '';
            return t.length > 0 && !t.includes('instruction');
        }) as HTMLElement[];
    }

    private getSectionName(sec: HTMLElement, index: number): string {
        // Try to find hidden-xs span to avoid duplicated text from mobile labels
        const hiddenXs = sec.querySelector('.hidden-xs');
        if (hiddenXs && hiddenXs.textContent?.trim()) {
            return hiddenXs.textContent.trim();
        }
        
        // Fallback to text content but try to be smart about visible-xs
        const visibleXs = sec.querySelector('.visible-xs');
        if (visibleXs) {
            // Clone to avoid modifying original DOM
            const clone = sec.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.visible-xs').forEach(el => el.remove());
            return clone.textContent?.trim() || `Section ${index + 1}`;
        }

        return sec.textContent?.trim() || `Section ${index + 1}`;
    }

    private getActiveSectionName(): string | null {
        const sections = this.getSections();
        const activeSec = sections.find(sec => 
            sec.classList.contains('active') || 
            sec.classList.contains('selected') || 
            sec.getAttribute('aria-selected') === 'true' ||
            sec.querySelector('.active') !== null
        );
        
        if (activeSec) {
            return this.getSectionName(activeSec, sections.indexOf(activeSec));
        }
        return null;
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
                this.onProgress(`Starting crawler (${sections.length} Sections)...`);
                for (let i = 0; i < sections.length; i++) {
                    if (!this.isRunning) break;

                    const sec = sections[i];
                    const secName = this.getSectionName(sec, i);
                    
                    this.onProgress(`Switching to ${secName}...`);
                    
                    // Prefer clicking the anchor inside if it exists
                    const link = sec.querySelector('a');
                    if (link) {
                        link.click();
                    } else {
                        sec.click();
                    }
                    
                    // Wait for section to become active dynamically (up to 5s)
                    for (let w = 0; w < 20; w++) {
                        await this.wait(250);
                        if (this.getActiveSectionName() === secName) break;
                    }
                    // Additional small wait for question content to render
                    await this.wait(500);
                    
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

            if (this.isRunning) {
                this.onFinish(this.markdown);
            }
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
            const popup = Array.from(document.querySelectorAll('.modal, .modal-dialog, .popup, .alert, .bootbox')).find(el => {
                const txt = (el.textContent || '').toLowerCase();
                const isVisible = (el as HTMLElement).style.display !== 'none' && !el.classList.contains('ng-hide');
                return isVisible && (txt.includes('last question') || txt.includes('first question') || txt.includes('end of'));
            });
            
            if (popup) {
                const closeBtn = popup.querySelector('button[data-bb-handler="cancel"], button[data-dismiss="modal"], .close') as HTMLElement;
                if (closeBtn) closeBtn.click();
                return currentComp;
            }

            const nextBtn = this.findNextButton();
            if (!nextBtn || (nextBtn as HTMLButtonElement).disabled || nextBtn.classList.contains('disabled')) {
                return currentComp;
            }

            nextBtn.click();

            // Wait dynamically for the question or section to change
            let nextCheck = current;
            let changed = false;
            for (let i = 0; i < 20; i++) { // Max 5 seconds
                await this.wait(250);
                if (!this.isRunning) return currentComp;
                
                const activeSecName = this.getActiveSectionName();
                if (activeSecName && activeSecName !== sectionName) {
                    return currentComp; // The UI automatically transitioned to the next section
                }
                
                nextCheck = extractCurrentQuestion(qIdxInSec + 1, currentComp);
                if (nextCheck.md !== md) {
                    changed = true;
                    break;
                }
            }

            if (!changed) {
                return currentComp; // Stuck or reached end
            }
            
            qIdxInSec++;
            current = nextCheck; // Reuse — no double parse
        }

        return currentComp;
    }

    private findNextButton(): HTMLElement | null {
        // R5: scope search to test interface to avoid clicking palette/pagination/chat "Next"
        const base = document.querySelector('.tp-test-area, .test-interface, .que-ans-box');
        const container = base?.closest('.tp-left-box, #questions, #mainBox, .test-interface') as HTMLElement || document;
        const els = Array.from(container.querySelectorAll('button, a, div[role="button"]'));
        for (const el of els) {
            const txt = (el.textContent || '').trim().toLowerCase();
            if (txt === 'next' || txt === 'save & next' || txt.includes('next question') || txt === 'nextquestion') {
                return el as HTMLElement;
            }
            if (el.querySelector('.fa-chevron-right') || el.querySelector('.fa-angle-right')) {
                const parent = el.parentElement;
                if (parent && (parent.className.includes('pagination') || parent.className.includes('palette'))) continue;
                return el as HTMLElement;
            }
        }
        // B5: tightened fallback — only match nextQuestion, not generic "next"
        return container.querySelector('.next-btn, .btn-next, [ng-click*="nextQuestion"]') as HTMLElement;
    }
}