# Testbook Auto-Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Tampermonkey/Violentmonkey userscript in TypeScript that automatically crawls Testbook mock test solution pages and extracts the full paper to an Obsidian-compatible Markdown file.

**Architecture:** A state-machine driven crawler injected into the page. It adds a floating UI, iterates through section tabs and question numbers, parses the DOM into Markdown (preserving MathJax, Tables, and base64 images), and triggers a file download. Built with TypeScript and bundled via Vite/Rollup.

**Tech Stack:** TypeScript, Vite (for building the userscript), DOM API.

---

### Task 1: Project Setup & Build Configuration

**Files:**
- Create: `testbook-downloader/package.json`
- Create: `testbook-downloader/tsconfig.json`
- Create: `testbook-downloader/vite.config.ts`

- [ ] **Step 1: Initialize package and dependencies**

```bash
cd testbook-downloader
npm init -y
npm install --save-dev typescript vite vite-plugin-monkey
```

- [ ] **Step 2: Configure TypeScript**

Update `testbook-downloader/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM"],
    "moduleResolution": "Node",
    "strict": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Configure Vite for Userscript**

Update `testbook-downloader/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Testbook Markdown Downloader',
        namespace: 'tb-md-dl',
        version: '1.0.0',
        description: 'Auto-crawls and downloads Testbook question papers as Markdown.',
        author: 'quantavil',
        match: ['https://testbook.com/*'],
        grant: ['GM_download'],
      },
    }),
  ],
});
```

- [ ] **Step 4: Commit**

```bash
git add testbook-downloader/package.json testbook-downloader/package-lock.json testbook-downloader/tsconfig.json testbook-downloader/vite.config.ts
git commit -m "chore(testbook-downloader): setup typescript and vite userscript build"
```

---

### Task 2: Core UI and Entry Point

**Files:**
- Create: `testbook-downloader/src/ui.ts`
- Create: `testbook-downloader/src/main.ts`

- [ ] **Step 1: Create the UI module**

Create `testbook-downloader/src/ui.ts`:
```typescript
export class DownloaderUI {
  private container: HTMLDivElement;
  private statusText: HTMLSpanElement;
  private startBtn: HTMLButtonElement;

  constructor(private onStart: () => void) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e293b;
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      z-index: 999999;
      font-family: sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    const title = document.createElement('div');
    title.textContent = 'TB MD Downloader';
    title.style.fontWeight = 'bold';
    
    this.statusText = document.createElement('span');
    this.statusText.textContent = 'Ready';
    this.statusText.style.fontSize = '12px';

    this.startBtn = document.createElement('button');
    this.startBtn.textContent = 'Start Extraction';
    this.startBtn.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
    `;
    this.startBtn.addEventListener('click', () => {
      this.startBtn.disabled = true;
      this.onStart();
    });

    this.container.appendChild(title);
    this.container.appendChild(this.statusText);
    this.container.appendChild(this.startBtn);
  }

  public mount() {
    document.body.appendChild(this.container);
  }

  public updateStatus(msg: string) {
    this.statusText.textContent = msg;
  }

  public finish() {
    this.startBtn.disabled = false;
    this.updateStatus('Finished!');
  }
}
```

- [ ] **Step 2: Create the entry point**

Create `testbook-downloader/src/main.ts`:
```typescript
import { DownloaderUI } from './ui';

function init() {
  // Only inject if we are on a page that looks like a test solution
  if (!document.querySelector('.que-ans-box') && !window.location.href.includes('test')) {
    console.log('[TB-MD] Not a test page, skipping.');
    // We'll still mount for testing purposes right now
  }

  const ui = new DownloaderUI(() => {
    ui.updateStatus('Starting...');
    setTimeout(() => {
        ui.finish();
        console.log('[TB-MD] Mock extraction complete.');
    }, 1000);
  });
  ui.mount();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
```

- [ ] **Step 3: Commit**

```bash
git add testbook-downloader/src/ui.ts testbook-downloader/src/main.ts
git commit -m "feat(testbook-downloader): add floating ui for extraction control"
```

---

### Task 3: DOM to Markdown Parser

**Files:**
- Create: `testbook-downloader/src/parser.ts`

- [ ] **Step 1: Implement HTML to Markdown Logic**

Create `testbook-downloader/src/parser.ts`:
```typescript
export class DOMParser {
  public static htmlToMarkdown(root: Element | null): string {
    if (!root) return '';

    function textify(str: string | null): string {
      return (str || '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
    }

    function walk(node: Node): string {
      if (!node) return '';
      
      // Preserve MathJax blocks entirely if they exist as raw text/scripts
      if (node.nodeName.toLowerCase() === 'script' && (node as HTMLScriptElement).type.includes('math/tex')) {
          const isBlock = (node as HTMLScriptElement).type.includes('mode=display');
          const math = node.textContent || '';
          return isBlock ? `\n$$\n${math}\n$$\n` : `$${math}$`;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        return textify(node.nodeValue);
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();

        // Skip internal mathjax rendering spans to avoid duplicating math
        if (el.classList.contains('MathJax_Preview') || el.classList.contains('MathJax')) {
            return ''; 
        }

        const childMD = Array.from(el.childNodes).map(n => walk(n)).join('');

        if (tag === 'br') return '  \n';
        if (tag === 'strong' || tag === 'b') return childMD ? `**${childMD}**` : '';
        if (tag === 'em' || tag === 'i') return childMD ? `*${childMD}*` : '';
        if (tag === 'u') return childMD;
        
        if (tag === 'a') {
          const href = el.getAttribute('href') || '';
          const absHref = href.startsWith('//') ? 'https:' + href : (href.startsWith('/') ? 'https://testbook.com' + href : href);
          const txt = childMD || absHref || '';
          return absHref ? `[${txt}](${absHref})` : txt;
        }

        if (tag === 'img') {
          let src = el.getAttribute('src') || (el as HTMLImageElement).src || '';
          if (src && !src.startsWith('data:') && !src.startsWith('http')) {
              src = src.startsWith('//') ? 'https:' + src : 'https://testbook.com' + (src.startsWith('/') ? src : '/' + src);
          }
          const alt = el.getAttribute('alt') || '';
          return src ? `![${alt}](${src})` : '';
        }

        if (tag === 'ul' || tag === 'ol') {
          const ordered = tag === 'ol';
          const items = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'li');
          return items.map((li, idx) => {
            const prefix = ordered ? `${idx + 1}. ` : `- `;
            const liMD = Array.from(li.childNodes).map(n => walk(n)).join('');
            return `${prefix}${liMD}\n`;
          }).join('') + '\n';
        }

        // Basic Table Support
        if (tag === 'table') {
            const rows = Array.from(el.querySelectorAll('tr'));
            if (rows.length === 0) return '';
            
            let mdTable = '\n';
            rows.forEach((row, i) => {
                const cells = Array.from(row.querySelectorAll('th, td'));
                const rowStr = '| ' + cells.map(c => textify(walk(c)).replace(/\|/g, '\\|')).join(' | ') + ' |\n';
                mdTable += rowStr;
                
                if (i === 0) {
                    mdTable += '|' + cells.map(() => '---').join('|') + '|\n';
                }
            });
            return mdTable + '\n';
        }

        if (/^h[1-6]$/.test(tag)) {
          const level = Number(tag[1]);
          return `\n${'#'.repeat(level)} ${childMD}\n\n`;
        }

        if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
          const content = childMD.trim();
          return content ? `${content}\n\n` : '';
        }

        return childMD;
      }
      return '';
    }

    return walk(root).replace(/\n{3,}/g, '\n\n').trim();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add testbook-downloader/src/parser.ts
git commit -m "feat(testbook-downloader): implement robust html to markdown parser"
```

---

### Task 4: Question Extractor Logic

**Files:**
- Create: `testbook-downloader/src/extractor.ts`

- [ ] **Step 1: Build the specific DOM extractors for Testbook structure**

Create `testbook-downloader/src/extractor.ts`:
```typescript
import { DOMParser } from './parser';

export class Extractor {
  public static extractCurrentQuestion(qNum: number, sectionName: string): string {
    const boxes = Array.from(document.querySelectorAll('.que-ans-box'));
    if (!boxes.length) return '';
    
    // Find the visible box (Testbook hides others via ng-hide or display:none)
    const qaBox = boxes.find(b => {
        if (b.closest('.ng-hide')) return false;
        const cs = getComputedStyle(b);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
    }) || boxes[0];

    const parts: string[] = [];
    parts.push(`## Q${qNum}. (${sectionName})`);

    // 1. Comprehension
    const comp = document.querySelector('.aei-comprehension [ng-bind-html]');
    if (comp) {
      parts.push('### Comprehension', DOMParser.htmlToMarkdown(comp));
    }

    // 2. Question
    const qEls = qaBox.querySelectorAll('.qns-view-box');
    let qEl = null;
    for (const el of Array.from(qEls)) {
      if (el.closest('li.option') || el.closest('[ng-bind-html*="getSolutionDesc"]')) continue;
      qEl = el;
      break;
    }
    if (qEl) {
      parts.push(DOMParser.htmlToMarkdown(qEl));
    }

    // 3. Options
    const list = Array.from(qaBox.querySelectorAll('ul')).find(u => u.querySelector('li.option'));
    let correctIdx = -1;
    let selectedIdx = -1;

    if (list) {
      const items = Array.from(list.querySelectorAll('li.option')).filter(li => li.querySelector('.qns-view-box'));
      if (items.length > 0) {
        parts.push('### Options');
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        items.forEach((li, idx) => {
            const box = li.querySelector('.qns-view-box');
            const md = DOMParser.htmlToMarkdown(box);
            parts.push(`${letters[idx]}. ${md}`);

            if (li.classList.contains('correct-option') || li.classList.contains('reattempt-correct-option') || li.querySelector('.text-success')) {
                correctIdx = idx;
            }
            if (li.classList.contains('wrong-option') || li.classList.contains('reattempt-wrong-option') || li.querySelector('.text-danger')) {
                selectedIdx = idx;
            }
            // If they got it right, it's both correct and selected
            if (li.classList.contains('correct-option') && li.querySelector('.fa-check')) {
                selectedIdx = idx;
            }
        });
      }
    }

    // 4. Status
    if (correctIdx >= 0) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        parts.push(`**Correct Answer:** ${letters[correctIdx]}`);
    }
    if (selectedIdx >= 0) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        parts.push(`**Your Answer:** ${letters[selectedIdx]}`);
    }

    // 5. Solution
    const solEl = qaBox.querySelector('[ng-bind-html*="getSolutionDesc"]');
    if (solEl) {
      parts.push('### Solution', '> ' + DOMParser.htmlToMarkdown(solEl).replace(/\n/g, '\n> '));
    }

    return parts.filter(Boolean).join('\n\n') + '\n\n---\n\n';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add testbook-downloader/src/extractor.ts
git commit -m "feat(testbook-downloader): implement question data extraction"
```

---

### Task 5: The Crawler & Export Integration

**Files:**
- Create: `testbook-downloader/src/crawler.ts`
- Modify: `testbook-downloader/src/main.ts`

- [ ] **Step 1: Implement the state machine crawler**

Create `testbook-downloader/src/crawler.ts`:
```typescript
import { Extractor } from './extractor';

export class Crawler {
    private markdown = '# Testbook Paper\n\n';
    private isRunning = false;

    constructor(private onProgress: (msg: string) => void, private onFinish: (md: string) => void) {}

    private wait(ms: number) {
        return new Promise(res => setTimeout(res, ms));
    }

    private getSections(): HTMLElement[] {
        // Sections are usually in a tab list
        return Array.from(document.querySelectorAll('.section-list li, .sections-tabs li, ul.nav-tabs li')).filter(el => {
            const t = el.textContent?.trim().toLowerCase() || '';
            return t.length > 0 && !t.includes('instruction');
        }) as HTMLElement[];
    }

    private getQuestions(): HTMLElement[] {
        // Question numbers are usually in a palette
        return Array.from(document.querySelectorAll('.qns-list li a, .question-palette li, .palette-box li, .qns-status-list li')).filter(el => {
            const t = el.textContent?.trim() || '';
            return /^\d+$/.test(t);
        }) as HTMLElement[];
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.markdown = '# Testbook Paper\n\n';

        try {
            const sections = this.getSections();
            if (sections.length === 0) {
                // No sections, maybe just a flat list of questions
                await this.crawlQuestions('Paper');
            } else {
                for (let i = 0; i < sections.length; i++) {
                    const sec = sections[i];
                    const secName = sec.textContent?.trim() || `Section ${i+1}`;
                    this.markdown += `# ${secName}\n\n`;
                    
                    sec.click();
                    await this.wait(1000); // Wait for section switch
                    
                    await this.crawlQuestions(secName);
                }
            }

            this.onFinish(this.markdown);
        } catch (e) {
            console.error('[TB-MD] Crawl error:', e);
            this.onProgress('Error occurred!');
        } finally {
            this.isRunning = false;
        }
    }

    private async crawlQuestions(sectionName: string) {
        const questions = this.getQuestions();
        for (let i = 0; i < questions.length; i++) {
            this.onProgress(`Extracting ${sectionName}: Q${i+1}/${questions.length}`);
            
            const qBtn = questions[i];
            qBtn.click();
            
            // Wait for DOM update
            await this.wait(600); 
            
            const qMd = Extractor.extractCurrentQuestion(i + 1, sectionName);
            this.markdown += qMd;
        }
    }
}
```

- [ ] **Step 2: Connect Crawler to Main**

Modify `testbook-downloader/src/main.ts` completely:
```typescript
import { DownloaderUI } from './ui';
import { Crawler } from './crawler';

function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function init() {
  const ui = new DownloaderUI((() => {
    const crawler = new Crawler(
        (msg) => ui.updateStatus(msg),
        (md) => {
            ui.finish();
            downloadFile(md, 'Testbook_Paper.md');
        }
    );
    crawler.start();
  }) as any); // Type assertion if needed
  ui.mount();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
```

- [ ] **Step 3: Commit**

```bash
git add testbook-downloader/src/crawler.ts testbook-downloader/src/main.ts
git commit -m "feat(testbook-downloader): implement state machine crawler and file export"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-27-testbook-md-downloader-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**