import { htmlToMarkdown } from './converter';
import { downloadFile } from './utils';

// Wait helper
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function startCrawler() {
  let finalMarkdown = '# Guidely Mock Test\n\n';
  let hasNext = true;
  let qNum = 1;

  while (hasNext) {
    // Wait for content to render
    await sleep(2000);

    const questionEl = document.querySelector('.question-text'); // Adjust selector as per Guidely
    const optionsEl = document.querySelector('.options-container'); // Adjust selector
    const solutionEl = document.querySelector('.solution-container'); // Adjust selector

    if (questionEl) {
      finalMarkdown += `## Question ${qNum}\n\n${htmlToMarkdown(questionEl.innerHTML)}\n\n`;
      if (optionsEl) {
        finalMarkdown += `### Options\n\n${htmlToMarkdown(optionsEl.innerHTML)}\n\n`;
      }
      if (solutionEl) {
        finalMarkdown += `### Solution\n\n${htmlToMarkdown(solutionEl.innerHTML)}\n\n`;
      }
      finalMarkdown += '---\n\n';
      qNum++;
    }

    // Find next button
    const nextBtn = document.querySelector('button.next-btn:not([disabled])') as HTMLButtonElement | null;
    if (nextBtn) {
      nextBtn.click();
    } else {
      hasNext = false;
    }
  }

  downloadFile('guidely_mock_test.md', finalMarkdown);
}
