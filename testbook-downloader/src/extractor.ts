import { htmlToMarkdown } from './parser';
import { beautifyMarkdown } from './beautifier';

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // R1: single constant

/** Extract markdown from a visible question-answer box */
export function extractBox(qaBox: Element, fallbackQNum: number, lastCompHtml: string = ''): { md: string; compHtml: string; qNum: string } {
  const parts: string[] = [];

  // 1. Get Real Question Number from DOM
  let qNumEl = qaBox.querySelector('.tp-ques-number');
  if (!qNumEl) {
      // Fallback: search globally for visible question number
      const allQNums = Array.from(document.querySelectorAll('.tp-ques-number'));
      qNumEl = allQNums.find(el => {
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && !el.closest('.ng-hide');
      }) || null;
  }

  let qNumStr = fallbackQNum.toString();
  if (qNumEl) {
      const text = qNumEl.textContent || '';
      // Matches "Question No. 1", "Question No.1", "Q.1", etc. and extracts only digits
      const match = text.match(/\d+/);
      qNumStr = match ? match[0] : (text.replace(/Question No\./i, '').trim() || qNumStr);
  }
  
  parts.push(`## Q${qNumStr}.`);

  // 2. Comprehension
  let currentCompHtml = '';
  let comp = qaBox.querySelector('.aei-comprehension [ng-bind-html]');
  if (!comp) {
      const globalComp = document.querySelector('.aei-comprehension [ng-bind-html]');
      if (globalComp && !globalComp.closest('.ng-hide')) {
          const cs = getComputedStyle(globalComp);
          if (cs.display !== 'none' && cs.visibility !== 'hidden') {
              comp = globalComp;
          }
      }
  }
  
  if (comp) {
    currentCompHtml = comp.innerHTML.trim();
    if (currentCompHtml && currentCompHtml !== lastCompHtml) {
      parts.push('### Comprehension\n\n' + htmlToMarkdown(comp));
    }
  }

  // 3. Question Text
  const qEls = qaBox.querySelectorAll('.qns-view-box');
  let qEl = null;
  for (const el of Array.from(qEls)) {
    if (el.closest('li.option') || el.closest('[ng-bind-html*="getSolutionDesc"]')) continue;
    qEl = el;
    break;
  }
  if (qEl) {
    parts.push(htmlToMarkdown(qEl));
  }

  // 4. Options
  const list = Array.from(qaBox.querySelectorAll('ul')).find(u => u.querySelector('li.option'));
  let correctIdx = -1;
  let selectedIdx = -1;

  if (list) {
    const items = Array.from(list.querySelectorAll('li.option')).filter(li => li.querySelector('.qns-view-box'));
    if (items.length > 0) {
      parts.push('### Options');
      
      items.forEach((li, idx) => {
          const box = li.querySelector('.qns-view-box');
          const md = htmlToMarkdown(box);
          parts.push(`${OPTION_LETTERS[idx] || idx}. ${md}`);

          if (li.classList.contains('correct-option') || li.classList.contains('reattempt-correct-option') || li.querySelector('.text-success')) {
              correctIdx = idx;
          }
          if (li.classList.contains('wrong-option') || li.classList.contains('reattempt-wrong-option') || li.querySelector('.text-danger')) {
              selectedIdx = idx;
          }
          if (li.classList.contains('correct-option') && li.querySelector('.fa-check')) {
              selectedIdx = idx;
          }
      });
    }
  }

  // 5. Answer Status
  if (correctIdx >= 0) {
      parts.push(`**Correct Answer:** ${OPTION_LETTERS[correctIdx] || correctIdx}`);
  }
  if (selectedIdx >= 0) {
      parts.push(`**Your Answer:** ${OPTION_LETTERS[selectedIdx] || selectedIdx}`);
  }

  // 6. Solution
  const solEl = qaBox.querySelector('[ng-bind-html*="getSolutionDesc"]') || qaBox.querySelector('.solution-desc');
  if (solEl) {
    parts.push('### Solution\n\n' + htmlToMarkdown(solEl));
  }

  const rawMd = parts.filter(Boolean).join('\n\n');
  return { 
      md: beautifyMarkdown(rawMd) + '\n\n---\n\n', 
      compHtml: currentCompHtml, 
      qNum: qNumStr,
  };
}

/** Find and extract the currently visible question on page */
export function extractCurrentQuestion(fallbackQNum: number, lastCompHtml: string = ''): { md: string; compHtml: string; qNum: string } {
  const boxes = Array.from(document.querySelectorAll('.que-ans-box'));
  if (!boxes.length) return { md: '', compHtml: '', qNum: '' };
  
  const qaBox = boxes.find(b => {
      if (b.closest('.ng-hide')) return false;
      const cs = getComputedStyle(b);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
  });

  if (!qaBox) return { md: '', compHtml: '', qNum: '' };

  return extractBox(qaBox, fallbackQNum, lastCompHtml);
}