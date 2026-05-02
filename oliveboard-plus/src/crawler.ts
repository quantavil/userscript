import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

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
  private turndownService: TurndownService;
  private isCancelled: boolean = false;
  private questionsData: Map<string, QuestionData> = new Map(); // Use Map to prevent duplicates
  private currentIndex: number = 1;

  constructor(
    private onUpdate: (msg: string) => void,
    private onComplete: (markdown: string) => void,
    private onError: (msg: string) => void
  ) {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced'
    });
    this.turndownService.use(gfm);
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public cancel() {
    this.isCancelled = true;
  }

  private extractCurrentQuestion(): QuestionData | null {
    // Find the currently visible question block
    // It's usually the one with 'display: flex' or similar, but we can also just find all that don't have 'display: none'
    let activeBlock: Element | null = null;
    const blocks = Array.from(document.querySelectorAll('.singleqid'));
    for (const block of blocks) {
      const style = window.getComputedStyle(block);
      if (style.display !== 'none') {
        activeBlock = block;
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
        index: this.currentIndex,
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
    let lastQuestionId = '';

    while (!this.isCancelled) {
      this.onUpdate(`Extracting Q${this.currentIndex}...`);
      await this.sleep(300); // Wait for potential UI updates

      const qData = this.extractCurrentQuestion();
      
      if (qData) {
        // Create a signature to detect if we're stuck or looped
        const signature = qData.questionHtml.substring(0, 50);
        
        if (signature === lastQuestionId) {
          sameQuestionCount++;
          if (sameQuestionCount > 3) {
            this.onUpdate(`Reached the end or stuck.`);
            break;
          }
        } else {
          sameQuestionCount = 0;
          lastQuestionId = signature;
          
          // Save the question
          if (!this.questionsData.has(signature)) {
            this.questionsData.set(signature, qData);
            this.currentIndex++;
          } else {
            // We've looped back to a question we already processed
            break;
          }
        }
      }

      // Try to click Next
      const nextBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button.btn-prenext')).find(btn => btn.textContent?.includes('Next'));
      
      if (nextBtn && !nextBtn.disabled && nextBtn.style.display !== 'none') {
        nextBtn.click();
        await this.sleep(500); // Wait for the next question to load/render
      } else {
        // No next button or it's disabled, we're done
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
    let markdown = `# Oliveboard Exam\n\n`;

    let displayIndex = 1;
    for (const q of this.questionsData.values()) {
      markdown += `### Q${displayIndex}\n\n`;
      markdown += `${this.turndownService.turndown(q.questionHtml)}\n\n`;

      q.options.forEach((opt) => {
        const optionMark = opt.isCorrect ? `**[Correct]** ` : ``;
        const optionMarkdown = this.turndownService.turndown(opt.html).replace(/\n/g, ' '); 
        markdown += `- **${opt.label}**: ${optionMark}${optionMarkdown}\n`;
      });

      markdown += `\n`;

      if (q.solutionHtml) {
        markdown += `**Solution:**\n\n`;
        markdown += `${this.turndownService.turndown(q.solutionHtml)}\n\n`;
      }

      markdown += `---\n\n`;
      displayIndex++;
    }

    return markdown;
  }
}
