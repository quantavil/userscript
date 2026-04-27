import TurndownService from 'turndown';
import { tables } from 'turndown-plugin-gfm';
const turndownService = new TurndownService();
turndownService.use(tables);

function fixColspan(html) {
    // jsdom for quick parsing
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    document.querySelectorAll('th, td').forEach(cell => {
        const colspan = parseInt(cell.getAttribute('colspan') || '1');
        if (colspan > 1) {
            cell.removeAttribute('colspan');
            // add empty cells after it
            for (let i = 1; i < colspan; i++) {
                const empty = document.createElement(cell.tagName);
                empty.innerHTML = ' ';
                cell.parentNode.insertBefore(empty, cell.nextSibling);
            }
        }
    });
    
    // Also, if the header row has fewer cells than the max row cells, we need to balance it
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
       let maxCols = 0;
       const rows = Array.from(table.querySelectorAll('tr'));
       rows.forEach(row => {
           maxCols = Math.max(maxCols, row.querySelectorAll('th, td').length);
       });
       
       rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          if (cells.length < maxCols) {
              const diff = maxCols - cells.length;
              const type = cells[0]?.tagName || 'TD';
              for(let i = 0; i < diff; i++) {
                  const empty = document.createElement(type);
                  empty.innerHTML = ' ';
                  row.appendChild(empty);
              }
          }
       });
    });
    
    return turndownService.turndown(document.body.innerHTML);
}

const html = `<table><tr><th colspan="2">Case 1(a)</th></tr><tr><td>Position</td><td>Boxes</td></tr><tr><td>8</td><td>P</td></tr></table>`;
console.log(fixColspan(html));
