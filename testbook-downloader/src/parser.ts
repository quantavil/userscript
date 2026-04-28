import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

turndownService.use(gfm);

/** Convert a DOM element's HTML to clean Markdown (R5: plain function, B8: no global shadow) */
export function htmlToMarkdown(root: Element | null): string {
  if (!root) return '';

  // Clone the node so we don't modify the actual DOM
  const clone = root.cloneNode(true) as HTMLElement;

  // Clean up useless Testbook images (icons, avatars, UI elements)
  const uselessImages = clone.querySelectorAll('img[src*="lms_creative_elements"], img[src*="tb-avatar"], img.avatar, img.icon');
  uselessImages.forEach(img => img.remove());

  // Clean up useless Testbook UI elements that clutter the markdown
  const uselessUI = clone.querySelectorAll('button, bookmarks, report-cta, .tp-pos-neg-marks, .tb-report-component, .dropdown-menu, .help-note, .action-text, .tb-text-grey, .tb-more-dot');
  uselessUI.forEach(el => el.remove());

  // Fix MathJax
  const mathScripts = clone.querySelectorAll('script[type^="math/tex"]');
  mathScripts.forEach(script => {
    const isBlock = script.getAttribute('type')?.includes('mode=display');
    const math = script.textContent || '';
    const mathStr = isBlock ? `\n$$\n${math}\n$$\n` : `$${math}$`;
    const textNode = document.createTextNode(mathStr);
    script.parentNode?.replaceChild(textNode, script);
  });

  // Remove MathJax rendered spans to avoid duplication
  const mathSpans = clone.querySelectorAll('.MathJax_Preview, .MathJax, [id^="MathJax"]');
  mathSpans.forEach(span => span.remove());

  // Fix relative image URLs
  const images = clone.querySelectorAll('img');
  images.forEach(img => {
    let src = img.getAttribute('src') || '';
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      src = src.startsWith('//') ? 'https:' + src : 'https://testbook.com' + (src.startsWith('/') ? src : '/' + src);
      img.setAttribute('src', src);
    }
  });

  // Fix Tables for turndown-plugin-gfm
  // gfm plugin ignores tables without <th>. If a table has no <th>, convert the first row's <td>s to <th>s.
  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    // 1. Remove any block-level elements inside table cells that break turndown table parsing
    table.querySelectorAll('th, td').forEach(cell => {
       const paragraphs = cell.querySelectorAll('p, div');
       paragraphs.forEach(p => {
           const span = document.createElement('span');
           span.innerHTML = p.innerHTML + ' ';
           p.parentNode?.replaceChild(span, p);
       });
    });

    // 2. Expand colspan attributes into actual cells to prevent ragged tables
    table.querySelectorAll('th, td').forEach(cell => {
        const colspan = parseInt(cell.getAttribute('colspan') || '1');
        if (colspan > 1) {
            cell.removeAttribute('colspan');
            for (let i = 1; i < colspan; i++) {
                const empty = document.createElement(cell.tagName);
                empty.innerHTML = ' ';
                cell.parentNode?.insertBefore(empty, cell.nextSibling);
            }
        }
    });

    // 3. Pad rows so all rows have the exact same number of columns
    let maxCols = 0;
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach(row => {
        maxCols = Math.max(maxCols, row.querySelectorAll('th, td').length);
    });
    
    rows.forEach(row => {
       const cells = Array.from(row.querySelectorAll('th, td'));
       if (cells.length < maxCols) {
           const diff = maxCols - cells.length;
           const type = cells[0]?.tagName || 'td';
           for(let i = 0; i < diff; i++) {
               const empty = document.createElement(type);
               empty.innerHTML = ' ';
               row.appendChild(empty);
           }
       }
    });

    // 4. Ensure there is a header row (<th> tags)
    if (!table.querySelector('th')) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const tds = Array.from(firstRow.querySelectorAll('td'));
        tds.forEach(td => {
          const th = document.createElement('th');
          th.innerHTML = td.innerHTML;
          td.parentNode?.replaceChild(th, td);
        });
      }
    }
  });

  return turndownService.turndown(clone.innerHTML).trim();
}