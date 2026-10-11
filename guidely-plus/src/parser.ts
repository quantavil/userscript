import { getTurndownService } from './converter';

export interface QuestionData {
  index: number;
  questionHtml: string;
  options: {
    label: string;
    html: string;
    isCorrect: boolean;
  }[];
  solutionHtml: string;
  testName?: string;
}

/**
 * Walk backwards from a reference node, collecting outerHTML/textContent
 * of all preceding siblings into a single HTML string.
 */
function collectPrecedingSiblings(refNode: ChildNode): string {
  let node = refNode.previousSibling;
  let html = '';
  while (node) {
    html = ((node as Element).outerHTML || node.textContent || '') + html;
    node = node.previousSibling;
  }
  return html;
}

/**
 * Extract the question-text HTML from a Qbox container.
 * Looks for content preceding the first `.radio-item`, or falls back to the first `<span>`.
 */
function extractQuestionHtmlFromBox(container: Element): string {
  const firstRadio = container.querySelector('.radio-item');
  if (firstRadio) {
    return collectPrecedingSiblings(firstRadio);
  }
  const span = container.querySelector('span');
  return span ? span.innerHTML : '';
}

/**
 * Extract the current question's data from the live DOM.
 * @param fallbackIndex Used when the DOM header doesn't contain a parseable Q number.
 */
export function extractCurrentQuestion(fallbackIndex: number): QuestionData | null {
  try {
    // --- Parse question index from header ---
    const headerSpan = Array.from(document.querySelectorAll('span'))
      .find(s => s.textContent?.includes('Q: '));

    let index = fallbackIndex;
    if (headerSpan?.textContent) {
      const match = headerSpan.textContent.match(/Q:\s*(\d+)/);
      if (match) index = parseInt(match[1], 10);
    }

    // --- Find Qbox containers ---
    const qboxes = Array.from(document.querySelectorAll('.Qbox'));
    if (qboxes.length === 0) return null;

    let directionsHtml = '';
    let questionBaseHtml = '';
    let optionsContainer: Element;

    if (qboxes.length >= 2) {
      // First Qbox = directions/passage, second = question + options
      directionsHtml = qboxes[0].innerHTML.trim() + '<br><br>';
      optionsContainer = qboxes[1];
      questionBaseHtml = extractQuestionHtmlFromBox(qboxes[1]);
    } else {
      // Single Qbox = question + options combined
      optionsContainer = qboxes[0];
      questionBaseHtml = extractQuestionHtmlFromBox(qboxes[0]);
    }

    const questionHtml = directionsHtml + questionBaseHtml;

    // --- Extract options ---
    const options: QuestionData['options'] = [];
    const radioItems = optionsContainer.querySelectorAll('.radio-item');
    radioItems.forEach((item, idx) => {
      const isCorrect = item.classList.contains('correct-answer');
      const labelEl = item.querySelector('label');
      const html = labelEl ? labelEl.innerHTML.trim() : '';
      const label = String.fromCharCode(65 + idx); // A, B, C, D…
      if (html) {
        options.push({ label, html, isCorrect });
      }
    });

    // --- Extract solution ---
    const solblock = document.querySelector('.SltnsAnswrHld .answrCntnr');
    let solutionHtml = '';
    if (solblock) {
      const solClone = solblock.cloneNode(true) as Element;
      solClone.querySelectorAll('button').forEach(b => b.remove());
      solutionHtml = solClone.innerHTML.trim();
    }

    // --- Extract test name ---
    const testNameEl = document.querySelector(
      '.nav-item.nav-link[aria-selected="true"] span, .subject_name'
    );
    const testName = testNameEl?.textContent?.trim() || undefined;

    return { index, questionHtml, options, solutionHtml, testName };
  } catch (err) {
    console.error('[Guidely+] Error parsing question block', err);
    return null;
  }
}

/**
 * Format a single QuestionData object into a Markdown string.
 */
export function formatQuestion(q: QuestionData): string {
  const td = getTurndownService();
  let md = `### Q${q.index}\n\n`;
  md += `${td.turndown(q.questionHtml)}\n\n`;

  for (const opt of q.options) {
    const mark = opt.isCorrect ? `**[Correct]** ` : '';
    const text = td.turndown(opt.html).replace(/\n/g, ' ');
    md += `- **${opt.label}**: ${mark}${text}\n`;
  }

  md += '\n';

  if (q.solutionHtml) {
    md += `**Solution:**\n\n`;
    md += `${td.turndown(q.solutionHtml)}\n\n`;
  }

  return md;
}
