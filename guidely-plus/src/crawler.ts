import { extractCurrentQuestion, formatQuestion, QuestionData } from './parser';

export class Crawler {
  private isCancelled = false;
  private questionsData: Map<string, QuestionData> = new Map();

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

  private hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  public async start() {
    this.isCancelled = false;
    this.questionsData.clear();
    await this.linearCrawl();
  }

  private async linearCrawl() {
    let sameQuestionCount = 0;
    let consecutiveNulls = 0;
    let lastSignature = '';

    while (!this.isCancelled) {
      const displayIndex = this.questionsData.size + 1;
      this.onUpdate(`Extracting Q${displayIndex}...`);

      await this.sleep(10);
      if (this.isCancelled) break;

      const qData = extractCurrentQuestion(displayIndex);

      if (!qData) {
        consecutiveNulls++;
        if (consecutiveNulls > 3) {
          this.onUpdate('No questions found on page.');
          break;
        }
        if (!await this.clickNext()) break;
        continue;
      }

      consecutiveNulls = 0;

      const textContent = qData.questionHtml.replace(/<[^>]*>/g, '').trim();
      const signature = this.hashString(textContent);

      if (signature === lastSignature) {
        sameQuestionCount++;
        if (sameQuestionCount > 3) {
          this.onUpdate('Reached the end or stuck.');
          break;
        }
      } else {
        sameQuestionCount = 0;
        lastSignature = signature;

        if (!this.questionsData.has(signature)) {
          this.questionsData.set(signature, qData);
        } else {
          break;
        }
      }

      if (!await this.clickNext()) break;
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

  private async clickNext(): Promise<boolean> {
    const btns = Array.from(document.querySelectorAll<HTMLButtonElement>('.maindivfooter button'));
    const nextBtn = btns.find(btn => btn.textContent?.includes('Next'));

    if (nextBtn && !nextBtn.disabled && nextBtn.style.display !== 'none') {
      nextBtn.click();
      await this.sleep(50);
      return true;
    }
    return false;
  }

  private generateMarkdown(): string {
    const questions = Array.from(this.questionsData.values())
      .sort((a, b) => a.index - b.index);

    const title = questions[0]?.testName || 'Guidely Test';
    let md = `# ${title}\n\n`;

    for (const q of questions) {
      md += formatQuestion(q) + `---\n\n`;
    }

    return md;
  }
}
