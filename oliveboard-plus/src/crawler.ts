import { getTurndownService } from './converter';

interface QuestionData {
  index: number;
  questionHtml: string;
  options: {
    label: string;
    html: string;
    isCorrect: boolean;
  }[];
  solutionHtml: string;
}

export class Crawler {
  private isCancelled: boolean = false;
  private questionsData: Map<string, QuestionData> = new Map();
  private currentIndex: number = 1;

  constructor(
    private onUpdate: (msg: string) => void,
    private onComplete: (markdown: string) => void,
    private onError: (msg: string) => void
  ) {}

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public cancel() {
    this.isCancelled = true;
  }

  /** Simple djb2 hash for robust deduplication instead of 50-char substring */
  private hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  private extractCurrentQuestion(): QuestionData | null {
    let activeBlock: Element | null = null;
    const blocks = Array.from(document.querySelectorAll('.singleqid'));
    let domIndex = 0;

    for (let i = 0; i < blocks.length; i++) {
      const style = window.getComputedStyle(blocks[i]);
      if (style.display !== 'none') {
        activeBlock = blocks[i];
        domIndex = i + 1;
        break;
      }
    }

    if (!activeBlock) return null;

    try {
      // Question
      const qblock = activeBlock.querySelector('.qblock .eqt') || activeBlock.querySelector('.qblock');
      const questionHtml = qblock ? qblock.innerHTML.trim() : '';

      // Options
      const options: QuestionData['options'] = [];
      const optionBlocks = activeBlock.querySelectorAll('.opt');
      
      optionBlocks.forEach((optBlock) => {
        const labelEl = optBlock.querySelector('.left');
        const textEl = optBlock.querySelector('.rightopt .eqt') || optBlock.querySelector('.rightopt');
        
        const label = labelEl ? labelEl.textContent?.trim() || '' : '';
        const html = textEl ? textEl.innerHTML.trim() : '';
        const isCorrect = optBlock.classList.contains('correct');

        if (label || html) {
          options.push({ label, html, isCorrect });
        }
      });

      // Solution
      const solblock = activeBlock.querySelector('.solutiontxt .eqt') || activeBlock.querySelector('.solutiontxt');
      const solutionHtml = solblock ? solblock.innerHTML.trim() : '';

      return {
        index: domIndex || this.currentIndex,
        questionHtml,
        options,
        solutionHtml
      };
    } catch (err) {
      console.error(`Error parsing question block`, err);
      return null;
    }
  }

  public async start() {
    this.isCancelled = false;
    this.questionsData.clear();
    this.currentIndex = 1;
    
    let sameQuestionCount = 0;
    let consecutiveNulls = 0;
    let lastSignature = '';

    while (!this.isCancelled) {
      this.onUpdate(`Extracting Q${this.currentIndex}...`);
      await this.sleep(300);

      const qData = this.extractCurrentQuestion();
      
      if (!qData) {
        consecutiveNulls++;
        if (consecutiveNulls > 3) {
          this.onUpdate('No questions found on page.');
          break;
        }
        // Try clicking Next in case we're on a transitional state
        const nextBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button.btn-prenext')).find(btn => btn.textContent?.includes('Next'));
        if (nextBtn && !nextBtn.disabled && nextBtn.style.display !== 'none') {
          nextBtn.click();
          await this.sleep(500);
        } else {
          break;
        }
        continue;
      }

      consecutiveNulls = 0;

      // Hash full text content for robust deduplication
      const textContent = qData.questionHtml.replace(/<[^>]*>/g, '').trim();
      const signature = this.hashString(textContent);
        
      if (signature === lastSignature) {
        sameQuestionCount++;
        if (sameQuestionCount > 3) {
          this.onUpdate(`Reached the end or stuck.`);
          break;
        }
      } else {
        sameQuestionCount = 0;
        lastSignature = signature;
        
        if (!this.questionsData.has(signature)) {
          this.questionsData.set(signature, qData);
          this.currentIndex++;
        } else {
          // We've looped back to a question we already processed
          break;
        }
      }

      // Try to click Next
      const nextBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button.btn-prenext')).find(btn => btn.textContent?.includes('Next'));
      
      if (nextBtn && !nextBtn.disabled && nextBtn.style.display !== 'none') {
        nextBtn.click();
        await this.sleep(500);
      } else {
        break;
      }
    }

    if (this.isCancelled) {
      this.onUpdate('Cancelled.');
      return;
    }

    if (this.questionsData.size === 0) {
      this.onError('No questions found.');
      return;
    }

    this.onUpdate('Generating Markdown...');
    const md = this.generateMarkdown();
    this.onComplete(md);
  }

  private generateMarkdown(): string {
    const td = getTurndownService();
    let markdown = `# Oliveboard Exam\n\n`;

    let displayIndex = 1;
    for (const q of this.questionsData.values()) {
      markdown += `### Q${displayIndex}\n\n`;
      markdown += `${td.turndown(q.questionHtml)}\n\n`;

      q.options.forEach((opt) => {
        const optionMark = opt.isCorrect ? `**[Correct]** ` : ``;
        const optionMarkdown = td.turndown(opt.html).replace(/\n/g, ' '); 
        markdown += `- **${opt.label}**: ${optionMark}${optionMarkdown}\n`;
      });

      markdown += `\n`;

      if (q.solutionHtml) {
        markdown += `**Solution:**\n\n`;
        markdown += `${td.turndown(q.solutionHtml)}\n\n`;
      }

      markdown += `---\n\n`;
      displayIndex++;
    }

    return markdown;
  }

  public extractSingleQuestionMarkdown(): string | null {
    const q = this.extractCurrentQuestion();
    if (!q) return null;
    
    const td = getTurndownService();
    let markdown = `### Q${q.index}\n\n`;
    markdown += `${td.turndown(q.questionHtml)}\n\n`;
    
    q.options.forEach((opt) => {
      const optionMark = opt.isCorrect ? `**[Correct]** ` : ``;
      const optionMarkdown = td.turndown(opt.html).replace(/\n/g, ' '); 
      markdown += `- **${opt.label}**: ${optionMark}${optionMarkdown}\n`;
    });
    
    markdown += `\n`;
    
    if (q.solutionHtml) {
      markdown += `**Solution:**\n\n`;
      markdown += `${td.turndown(q.solutionHtml)}\n\n`;
    }
    
    return markdown;
  }
}
