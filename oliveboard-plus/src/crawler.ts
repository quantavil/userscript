import { extractCurrentQuestion, formatQuestion, QuestionData } from './parser';

interface SectionInfo {
  name: string;
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

  private hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  private parseSectionMap(): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const sectionBoxes = document.querySelectorAll('.question-map .box');

    sectionBoxes.forEach((box) => {
      const nameEl = box.querySelector('p b') || box.querySelector('p');
      const name = nameEl?.textContent?.trim() || 'Unknown Section';

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

    const sections = this.parseSectionMap();

    if (sections.length === 0) {
      await this.linearCrawl();
      return;
    }

    const totalQuestions = sections.reduce((sum, s) => sum + s.questionIndices.length, 0);
    let processedCount = 0;

    for (const section of sections) {
      if (this.isCancelled) break;

      this.onUpdate(`Section: ${section.name}`);
      await this.sleep(50);
      if (this.isCancelled) break;

      for (const globalIdx of section.questionIndices) {
        if (this.isCancelled) break;

        processedCount++;
        this.onUpdate(`${section.name} — Q${processedCount}/${totalQuestions}`);

        this.navigateToQuestion(globalIdx);
        await this.sleep(10);
        if (this.isCancelled) break;

        const qData = extractCurrentQuestion(this.currentIndex);
        if (!qData) {
          await this.sleep(50);
          if (this.isCancelled) break;
          const retry = extractCurrentQuestion(this.currentIndex);
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

  private async linearCrawl() {
    let sameQuestionCount = 0;
    let consecutiveNulls = 0;
    let lastSignature = '';

    while (!this.isCancelled) {
      this.onUpdate(`Extracting Q${this.currentIndex}...`);
      await this.sleep(10);
      if (this.isCancelled) break;

      const qData = extractCurrentQuestion(this.currentIndex);
      
      if (!qData) {
        consecutiveNulls++;
        if (consecutiveNulls > 3) {
          this.onUpdate('No questions found on page.');
          break;
        }
        const nextBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button.btn-prenext')).find(btn => btn.textContent?.includes('Next'));
        if (nextBtn && !nextBtn.disabled && nextBtn.style.display !== 'none') {
          nextBtn.click();
          await this.sleep(50);
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
        await this.sleep(50);
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

  private generateMarkdown(sections: SectionInfo[]): string {
    let markdown = `# Oliveboard Exam\n\n`;

    if (sections.length > 0) {
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
          markdown += formatQuestion(q, sectionQNo) + `---\n\n`;
          sectionQNo++;
        }
      }
    } else {
      let displayIndex = 1;
      for (const q of this.questionsData.values()) {
        markdown += formatQuestion(q, displayIndex) + `---\n\n`;
        displayIndex++;
      }
    }

    return markdown;
  }
}
