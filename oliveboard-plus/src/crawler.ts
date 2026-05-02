import { getTurndownService } from './converter';

interface QuestionData {
  index: number;
  sectionName: string;
  questionHtml: string;
  options: {
    label: string;
    html: string;
    isCorrect: boolean;
  }[];
  solutionHtml: string;
}

interface SectionInfo {
  name: string;
  /** Global 0-based indices of questions in this section */
  questionIndices: number[];
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

  /**
   * Parse the question-map sidebar to discover section names
   * and which global question indices belong to each section.
   */
  private parseSectionMap(): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const sectionBoxes = document.querySelectorAll('.question-map .box');

    sectionBoxes.forEach((box) => {
      // Section name from <p><b>Name</b></p>
      const nameEl = box.querySelector('p b') || box.querySelector('p');
      const name = nameEl?.textContent?.trim() || 'Unknown Section';

      // Each question span has class `q-{globalIndex}` and onclick="goToQuestion(globalIndex)"
      const qSpans = box.querySelectorAll('.map-qno');
      const questionIndices: number[] = [];

      qSpans.forEach((span) => {
        const onclick = span.getAttribute('onclick') || '';
        const match = onclick.match(/goToQuestion\((\d+)\)/);
        if (match) {
          questionIndices.push(parseInt(match[1], 10));
        }
      });

      if (questionIndices.length > 0) {
        sections.push({ name, questionIndices });
      }
    });

    return sections;
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

    // Get the current section name from the dropdown
    const sectionEl = document.querySelector('.ddn-select');
    const sectionName = sectionEl?.textContent?.trim() || 'Unknown Section';

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
        sectionName,
        questionHtml,
        options,
        solutionHtml
      };
    } catch (err) {
      console.error(`Error parsing question block`, err);
      return null;
    }
  }

  /**
   * Navigate to a specific question by its global 0-based index.
   * Uses the goToQuestion() function exposed on the page.
   */
  private navigateToQuestion(globalIndex: number) {
    const span = document.querySelector(`.map-qno.q-${globalIndex}`) as HTMLElement | null;
    if (span) {
      span.click();
    }
  }

  public async start() {
    this.isCancelled = false;
    this.questionsData.clear();
    this.currentIndex = 1;

    // Parse section map to know all sections and their question indices
    const sections = this.parseSectionMap();

    if (sections.length === 0) {
      // Fallback: no section map found, use linear crawl
      await this.linearCrawl();
      return;
    }

    // Section-aware crawl: iterate through each section and its questions
    const totalQuestions = sections.reduce((sum, s) => sum + s.questionIndices.length, 0);
    let processedCount = 0;

    for (const section of sections) {
      if (this.isCancelled) break;

      this.onUpdate(`Section: ${section.name}`);
      await this.sleep(200);

      for (const globalIdx of section.questionIndices) {
        if (this.isCancelled) break;

        processedCount++;
        this.onUpdate(`${section.name} — Q${processedCount}/${totalQuestions}`);

        // Navigate to this specific question
        this.navigateToQuestion(globalIdx);
        await this.sleep(400);

        const qData = this.extractCurrentQuestion();
        if (!qData) {
          // Try once more with a longer wait
          await this.sleep(600);
          const retry = this.extractCurrentQuestion();
          if (!retry) continue;
          this.addQuestion(retry, section.name);
        } else {
          this.addQuestion(qData, section.name);
        }
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
    const md = this.generateMarkdown(sections);
    this.onComplete(md);
  }

  private addQuestion(qData: QuestionData, sectionName: string) {
    const textContent = qData.questionHtml.replace(/<[^>]*>/g, '').trim();
    const signature = this.hashString(textContent);
    if (!this.questionsData.has(signature)) {
      qData.sectionName = sectionName;
      this.questionsData.set(signature, qData);
      this.currentIndex++;
    }
  }

  /** Fallback: linear crawl when no section map is available */
  private async linearCrawl() {
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
          break;
        }
      }

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
    const md = this.generateMarkdown([]);
    this.onComplete(md);
  }

  private formatQuestion(q: QuestionData, displayIndex: number): string {
    const td = getTurndownService();
    let markdown = `### Q${displayIndex}\n\n`;
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

  private generateMarkdown(sections: SectionInfo[]): string {
    let markdown = `# Oliveboard Exam\n\n`;

    if (sections.length > 0) {
      // Group questions by section name (preserve insertion order)
      const grouped = new Map<string, QuestionData[]>();
      for (const section of sections) {
        if (!grouped.has(section.name)) {
          grouped.set(section.name, []);
        }
      }

      for (const q of this.questionsData.values()) {
        const sectionName = q.sectionName || 'Unknown Section';
        if (!grouped.has(sectionName)) {
          grouped.set(sectionName, []);
        }
        grouped.get(sectionName)!.push(q);
      }

      for (const [sectionName, questions] of grouped) {
        if (questions.length === 0) continue;

        markdown += `## ${sectionName}\n\n`;

        let sectionQNo = 1;
        for (const q of questions) {
          markdown += this.formatQuestion(q, sectionQNo) + `---\n\n`;
          sectionQNo++;
        }
      }
    } else {
      // Flat output (linear crawl fallback)
      let displayIndex = 1;
      for (const q of this.questionsData.values()) {
        markdown += this.formatQuestion(q, displayIndex) + `---\n\n`;
        displayIndex++;
      }
    }

    return markdown;
  }

  public extractSingleQuestionMarkdown(): string | null {
    const q = this.extractCurrentQuestion();
    if (!q) return null;
    
    return this.formatQuestion(q, q.index);
  }
}
