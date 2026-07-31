import { getTurndownService } from './converter';

export interface QuestionData {
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

export function fixImageUrls(html: string): string {
  return html.replace(/src=["'](?:\/)?(oliveimg\/[^"']+)["']/gi, 'src="https://u1.oliveboard.in/exams/solution/$1"');
}

export function extractCurrentQuestion(fallbackIndex: number): QuestionData | null {
  let activeBlock: Element | null = null;
  const blocks = Array.from(document.querySelectorAll('.singleqid, .paneqid'));
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

  const sectionEl = document.querySelector('.ddn-select');
  const sectionName = sectionEl?.textContent?.trim() || 'Unknown Section';

  try {
    const paneTxt = activeBlock.querySelector('.panetxt .eqt') || activeBlock.querySelector('.panetxt');
    const directionsHtml = paneTxt ? fixImageUrls(paneTxt.innerHTML.trim()) + '<br><br>' : '';

    const qblock = activeBlock.querySelector('.qblock .eqt') || activeBlock.querySelector('.qblock');
    const questionHtml = directionsHtml + (qblock ? fixImageUrls(qblock.innerHTML.trim()) : '');

    const options: QuestionData['options'] = [];
    const optionBlocks = activeBlock.querySelectorAll('.opt');
    
    optionBlocks.forEach((optBlock) => {
      const labelEl = optBlock.querySelector('.left');
      const textEl = optBlock.querySelector('.rightopt .eqt') || optBlock.querySelector('.rightopt');
      
      const label = labelEl ? labelEl.textContent?.trim() || '' : '';
      const html = textEl ? fixImageUrls(textEl.innerHTML.trim()) : '';
      const isCorrect = optBlock.classList.contains('correct');

      if (label || html) {
        options.push({ label, html, isCorrect });
      }
    });

    const solblock = activeBlock.querySelector('.solutiontxt .eqt') || activeBlock.querySelector('.solutiontxt');
    const solutionHtml = solblock ? fixImageUrls(solblock.innerHTML.trim()) : '';

    return {
      index: domIndex || fallbackIndex,
      sectionName,
      questionHtml,
      options,
      solutionHtml
    };
  } catch (err) {
    console.error(`[OB+] Error parsing question block`, err);
    return null;
  }
}

export function formatQuestion(q: QuestionData, displayIndex: number): string {
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
